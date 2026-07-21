package mqtt

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"

	db "server/internal/db/sqlc"
)

func TestExtractMeasurements(t *testing.T) {
	stationID := uuid.New()
	now := time.Now()

	tests := []struct {
		name string
		json string
		want []db.InsertMeasurementsParams
	}{
		{
			// Captured verbatim from a real device's uplink on 2026-07-21 —
			// ChirpStack's Cayenne LPP decoder nests by sensor type then
			// channel, not the flat "analogInput_4" shape assumed earlier.
			name: "real device payload, battery only",
			json: `{"analogInput":{"4":3.93}}`,
			want: []db.InsertMeasurementsParams{
				{StationID: stationID, MetricType: db.MetricTypeBatteryLevel, Value: 3.93},
			},
		},
		{
			name: "temperature, moisture and battery together",
			json: `{"temperatureSensor":{"1":21.5},"analogInput":{"3":42,"4":3.7}}`,
			want: []db.InsertMeasurementsParams{
				{StationID: stationID, MetricType: db.MetricTypeTemperature, Value: 21.5},
				{StationID: stationID, MetricType: db.MetricTypeSoilMoisture, Value: 42},
				{StationID: stationID, MetricType: db.MetricTypeBatteryLevel, Value: 3.7},
			},
		},
		{
			name: "unrelated or malformed fields are ignored, not fatal",
			json: `{"gpsLocation":{"5":{"lat":1.0}},"analogInput":{"4":3.9}}`,
			want: []db.InsertMeasurementsParams{
				{StationID: stationID, MetricType: db.MetricTypeBatteryLevel, Value: 3.9},
			},
		},
		{
			name: "no known metrics",
			json: `{"somethingElse":{"9":1}}`,
			want: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var object map[string]any
			if err := json.Unmarshal([]byte(tt.json), &object); err != nil {
				t.Fatalf("invalid test JSON: %v", err)
			}

			got := extractMeasurements(object, stationID, now)

			if len(got) != len(tt.want) {
				t.Fatalf("got %d measurements, want %d: %+v", len(got), len(tt.want), got)
			}

			// Order matches metricMapping's declaration order, so a direct
			// index comparison is fine here.
			for i, w := range tt.want {
				g := got[i]
				if g.MetricType != w.MetricType || g.Value != w.Value || g.StationID != w.StationID {
					t.Errorf("measurement %d = %+v, want %+v", i, g, w)
				}
				if !g.Time.Valid || !g.Time.Time.Equal(now) {
					t.Errorf("measurement %d time = %v, want %v", i, g.Time, now)
				}
			}
		})
	}
}
