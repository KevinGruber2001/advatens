package server

import (
	"context"
	"log"
	"time"
)

const metricsQuery = `
from(bucket: "chirpstack")
	|> range(start: duration(v: params.startTime), stop: duration(v: params.endTime))
	|> filter(fn: (r) => r["_measurement"] == params.measurement)
	|> filter(fn: (r) => r["_field"] == "value")
	|> filter(fn: (r) => r["dev_eui"] == params.devEUI)
	|> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
	|> yield(name: "mean")
`

func (s Server) GetMetrics(ctx context.Context, request GetMetricsRequestObject) (GetMetricsResponseObject, error) {
	stationId := request.Params.StationId
	metricType := request.Params.MetricType

	st, err := s.queries.GetStationById(ctx, stationId)
	if err != nil {
		log.Printf("Error getting station by id %s: %s", stationId, err)
		return nil, err
	}

	startTime := "-30d"
	if request.Params.StartTime != nil {
		startTime = *request.Params.StartTime
	}

	endTime := "now()"
	if request.Params.EndTime != nil {
		endTime = *request.Params.EndTime
	}

	params := map[string]string{
		"startTime":   startTime,
		"endTime":     endTime,
		"measurement": getInfluxMeasurement(metricType),
		"devEUI":      st.DeviceID,
	}

	results, err := s.influx.QueryWithParams(ctx, metricsQuery, params)
	if err != nil {
		log.Printf("Error getting metrics: %s", err)
		return nil, err
	}

	metrics := make([]Metric, 0)

	// Parse results
	for results.Next() {
		record := results.Record()
		metrics = append(metrics, Metric{
			MetricType: convertMetricType(metricType),
			StationId:  st.ID,
			Timestamp:  record.Time().Format(time.RFC3339),
			Value:      float32(record.Value().(float64)),
		})
	}

	if results.Err() != nil {
		log.Printf("Error getting metrics: %s", results.Err())
		return nil, results.Err()
	}

	return GetMetrics200JSONResponse(metrics), nil
}

// Helper function to map metric types to InfluxDB measurements
func getInfluxMeasurement(metricType GetMetricsParamsMetricType) string {
	switch metricType {
	case GetMetricsParamsMetricTypeTemperature:
		return "device_frmpayload_data_temperatureSensor_1"
	case GetMetricsParamsMetricTypeSoilMoisture:
		return "device_frmpayload_data_soilMoisture"
	case GetMetricsParamsMetricTypePh:
		return "device_frmpayload_data_ph"
	case GetMetricsParamsMetricTypeBatteryLevel:
		return "device_frmpayload_data_batteryLevel"
	default:
		return ""
	}
}

func convertMetricType(mt GetMetricsParamsMetricType) MetricMetricType {
	switch mt {
	case GetMetricsParamsMetricTypeTemperature:
		return MetricMetricTypeTemperature
	case GetMetricsParamsMetricTypeSoilMoisture:
		return MetricMetricTypeSoilMoisture
	case GetMetricsParamsMetricTypePh:
		return MetricMetricTypePh
	case GetMetricsParamsMetricTypeBatteryLevel:
		return MetricMetricTypeBatteryLevel
	default:
		return MetricMetricType("")
	}
}
