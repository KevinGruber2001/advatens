// Package mqtt ingests ChirpStack uplink events into the measurement table.
package mqtt

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	db "server/internal/db/sqlc"
)

// metricSource locates a value in ChirpStack's decoded Cayenne LPP object,
// which nests by sensor type then channel number, e.g.
// {"analogInput": {"4": 3.93}} — confirmed against a real device payload,
// not the flat "analogInput_4" shape the v4 docs' examples suggest.
type metricSource struct {
	sensorType string
	channel    string
	metricType db.MetricType
}

var metricMapping = []metricSource{
	{"temperatureSensor", "1", db.MetricTypeTemperature},
	{"relativeHumidity", "2", db.MetricTypeHumidity},
	{"analogInput", "3", db.MetricTypeSoilMoisture},
	{"analogInput", "4", db.MetricTypeBatteryLevel},
}

// extractMeasurements pulls known metrics out of a decoded Cayenne LPP
// object, per metricMapping. Pure function so the real nested payload shape
// (confirmed against an actual device, see metricMapping's comment) can be
// covered by a table-driven test without a live DB.
func extractMeasurements(object map[string]any, stationID uuid.UUID, eventTime time.Time) []db.InsertMeasurementsParams {
	var params []db.InsertMeasurementsParams
	for _, mapping := range metricMapping {
		sensorGroup, ok := object[mapping.sensorType].(map[string]any)
		if !ok {
			continue
		}
		raw, ok := sensorGroup[mapping.channel]
		if !ok {
			continue
		}
		// encoding/json decodes every JSON number as float64; anything else
		// (nested objects, strings) is not a measurement.
		value, ok := raw.(float64)
		if !ok {
			slog.Warn("mqtt uplink value not numeric",
				"sensor_type", mapping.sensorType, "channel", mapping.channel, "value", raw)
			continue
		}
		params = append(params, db.InsertMeasurementsParams{
			Time:       pgtype.Timestamptz{Time: eventTime, Valid: true},
			StationID:  stationID,
			MetricType: mapping.metricType,
			Value:      value,
		})
	}
	return params
}

// uplinkEvent is the subset of a ChirpStack v4 uplink event (JSON marshaler)
// this package cares about.
type uplinkEvent struct {
	DeviceInfo struct {
		DevEui string `json:"devEui"`
	} `json:"deviceInfo"`
	Object map[string]any `json:"object"`
	Time   string         `json:"time"`
}

type Config struct {
	BrokerURL     string
	ClientID      string
	ApplicationID string
}

type Subscriber struct {
	client  mqtt.Client
	queries *db.Queries
	appID   string
}

func NewSubscriber(cfg Config, dbPool *pgxpool.Pool) *Subscriber {
	sub := &Subscriber{
		queries: db.New(dbPool),
		appID:   cfg.ApplicationID,
	}

	clientID := cfg.ClientID
	if clientID == "" {
		clientID = "advatens-server"
	}

	opts := mqtt.NewClientOptions()
	opts.AddBroker(cfg.BrokerURL)
	opts.SetClientID(clientID)
	// Persistent session: the broker queues QoS 1 uplinks that arrive while
	// the server is down and delivers them on reconnect.
	opts.SetCleanSession(false)
	opts.SetAutoReconnect(true)
	opts.SetConnectRetry(true)
	opts.SetConnectRetryInterval(5 * time.Second)
	opts.SetMaxReconnectInterval(1 * time.Minute)

	opts.SetOnConnectHandler(func(c mqtt.Client) {
		topic := fmt.Sprintf("application/%s/device/+/event/up", sub.appID)
		token := c.Subscribe(topic, 1, sub.handleMessage)
		token.Wait()
		if err := token.Error(); err != nil {
			slog.Error("mqtt subscribe failed", "topic", topic, "error", err)
			return
		}
		slog.Info("mqtt subscribed", "topic", topic)
	})

	opts.SetConnectionLostHandler(func(c mqtt.Client, err error) {
		slog.Warn("mqtt connection lost", "error", err)
	})

	sub.client = mqtt.NewClient(opts)
	return sub
}

func (s *Subscriber) Start() error {
	token := s.client.Connect()
	token.Wait()
	if err := token.Error(); err != nil {
		return fmt.Errorf("mqtt connect: %w", err)
	}
	return nil
}

func (s *Subscriber) Stop() {
	s.client.Disconnect(1000)
	slog.Info("mqtt subscriber stopped")
}

func (s *Subscriber) handleMessage(_ mqtt.Client, msg mqtt.Message) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var event uplinkEvent
	if err := json.Unmarshal(msg.Payload(), &event); err != nil {
		slog.Warn("mqtt uplink unmarshal failed", "topic", msg.Topic(), "error", err)
		return
	}
	if len(event.Object) == 0 {
		return
	}

	devEUI := event.DeviceInfo.DevEui
	station, err := s.queries.GetStationByDeviceId(ctx, devEUI)
	if err != nil {
		slog.Warn("mqtt uplink from unknown device", "dev_eui", devEUI, "error", err)
		return
	}

	eventTime := time.Now()
	if t, err := time.Parse(time.RFC3339Nano, event.Time); err == nil {
		eventTime = t
	}

	params := extractMeasurements(event.Object, station.ID, eventTime)

	if len(params) == 0 {
		// Likely a decoder/mapping mismatch — surface the actual keys.
		slog.Warn("mqtt uplink had no known metrics", "dev_eui", devEUI, "object", event.Object)
		return
	}

	s.queries.InsertMeasurements(ctx, params).Exec(func(i int, err error) {
		if err != nil {
			slog.Error("mqtt measurement insert failed", "dev_eui", devEUI, "metric", params[i].MetricType, "error", err)
		}
	})
	slog.Debug("mqtt uplink ingested", "dev_eui", devEUI, "metrics", len(params))
}
