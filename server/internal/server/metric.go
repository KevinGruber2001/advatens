package server

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	db "server/internal/db/sqlc"
)

func (s Server) GetMetrics(ctx context.Context, request GetMetricsRequestObject) (GetMetricsResponseObject, error) {
	stationId := request.Params.StationId
	metricType := request.Params.MetricType

	endTime := time.Now()
	startTime := endTime.Add(-30 * 24 * time.Hour)

	if request.Params.StartTime != nil {
		if t, err := time.Parse(time.RFC3339, *request.Params.StartTime); err == nil {
			startTime = t
		}
	}

	if request.Params.EndTime != nil {
		if t, err := time.Parse(time.RFC3339, *request.Params.EndTime); err == nil {
			endTime = t
		}
	}

	rows, err := s.queries.GetMeasurementsHourly(ctx, db.GetMeasurementsHourlyParams{
		StationID:  stationId,
		MetricType: db.MetricType(metricType),
		StartTime:  pgtype.Timestamptz{Time: startTime, Valid: true},
		EndTime:    pgtype.Timestamptz{Time: endTime, Valid: true},
	})
	if err != nil {
		log.Printf("Error getting metrics: %s", err)
		return nil, err
	}

	metrics := make([]Metric, 0, len(rows))
	for _, row := range rows {
		metrics = append(metrics, Metric{
			MetricType: MetricMetricType(row.MetricType),
			StationId:  row.StationID,
			Timestamp:  row.Time.Time.Format(time.RFC3339),
			Value:      float32(row.Value),
		})
	}

	return GetMetrics200JSONResponse(metrics), nil
}
