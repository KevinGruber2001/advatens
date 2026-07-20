-- name: InsertMeasurements :batchexec
INSERT INTO measurement (time, station_id, metric_type, value)
VALUES ($1, $2, $3, $4);

-- name: GetMeasurementsHourly :many
SELECT bucket::timestamptz AS time, station_id, metric_type, avg_value AS value
FROM measurement_hourly
WHERE station_id = sqlc.arg('station_id')
  AND metric_type = sqlc.arg('metric_type')
  AND bucket >= sqlc.arg('start_time')::timestamptz
  AND bucket <= sqlc.arg('end_time')::timestamptz
ORDER BY bucket ASC;
