package server

import (
	"context"
	"fmt"
	"log"
	"time"
)

func (s Server) GetMetrics(ctx context.Context, request GetMetricsRequestObject) (GetMetricsResponseObject, error) {

	stationId := request.Params.StationId
	st, err := s.queries.GetStationById(ctx, stationId)

	if err != nil {
		return nil, err
	}

	print("test1")

	query := fmt.Sprintf(`
	from(bucket: "chirpstack")
	|> range(start: %s, stop: %s)
	|> filter(fn: (r) => r["_measurement"] == "device_frmpayload_data_temperatureSensor_1")
	|> filter(fn: (r) => r["_field"] == "value")
	|> filter(fn: (r) => r["application_name"] == "TestApp")
	|> filter(fn: (r) => r["dev_eui"] == "%s")
	|> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
	|> yield(name: "mean")
	`,
		// Use provided times or defaults
		func() string {

			return "-30d"
		}(),
		func() string {

			return "now()"
		}(),

		st.DeviceID,
	)

	results, err := s.influx.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query error: %w", err)
	}

	var metrics []Metric

	for results.Next() {
		log.Println("goes here???")
		record := results.Record()

		metrics = append(metrics, Metric{
			MetricType: MetricMetricTypeTemperature,
			StationId:  st.ID,
			Timestamp:  record.Time().Format(time.RFC3339),
			Value:      float32(record.Value().(float64)),
		})
	}

	if results.Err() != nil {
		return nil, fmt.Errorf("query iteration error: %w", results.Err())
	}

	log.Println(metrics)

	return GetMetrics200JSONResponse(metrics), nil
}
