package server

import (
	"context"
	"fmt"
	"time"
)

func (s Server) GetMetrics(ctx context.Context, request GetMetricsRequestObject) (GetMetricsResponseObject, error) {
	stationId := request.Params.StationId
	metricType := request.Params.MetricType

	// Validate station exists
	st, err := s.queries.GetStationById(ctx, stationId)
	if err != nil {
		return nil, err
	}

	// Determine time range
	startTime := "-30d"
	if request.Params.StartTime != nil {
		startTime = *request.Params.StartTime
	}

	endTime := "now()"
	if request.Params.EndTime != nil {
		endTime = *request.Params.EndTime
	}

	// Map metric type to InfluxDB measurement
	measurement := getInfluxMeasurement(metricType)

	// Build InfluxDB query
	query := fmt.Sprintf(`
		from(bucket: "chirpstack")
		|> range(start: %s, stop: %s)
		|> filter(fn: (r) => r["_measurement"] == "%s")
		|> filter(fn: (r) => r["_field"] == "value")
		|> filter(fn: (r) => r["dev_eui"] == "%s")
		|> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
		|> yield(name: "mean")
	`, startTime, endTime, measurement, st.DeviceID)

	// Execute query
	results, err := s.influx.Query(ctx, query)
	if err != nil {
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

// Helper function to convert request metric type to response Metric type
func convertMetricType(mt GetMetricsParamsMetricType) MetricMetricType {
	switch mt {
	case GetMetricsParamsMetricTypeTemperature:
		return MetricMetricTypeTemperature
	case GetMetricsParamsMetricTypeSoilMoisture:
		return MetricMetricTypeSoilMoisture
	default:
		return MetricMetricType("")
	}
}
