-- +migrate Up notransaction

CREATE TYPE metric_type AS ENUM (
    'temperature',
    'soil_moisture',
    'humidity',
    'ph',
    'battery_level'
);

CREATE TABLE IF NOT EXISTS measurement (
    time        TIMESTAMPTZ      NOT NULL,
    station_id  UUID             NOT NULL REFERENCES station(id) ON DELETE CASCADE,
    metric_type metric_type      NOT NULL,
    value       DOUBLE PRECISION NOT NULL
);

SELECT create_hypertable('measurement', 'time', chunk_time_interval => INTERVAL '7 days');

CREATE INDEX idx_measurement_station_metric_time
    ON measurement (station_id, metric_type, time DESC);

CREATE MATERIALIZED VIEW measurement_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    station_id,
    metric_type,
    avg(value) AS avg_value,
    min(value) AS min_value,
    max(value) AS max_value,
    count(*) AS sample_count
FROM measurement
GROUP BY bucket, station_id, metric_type
WITH NO DATA;

SELECT add_continuous_aggregate_policy('measurement_hourly',
    start_offset  => INTERVAL '3 hours',
    end_offset    => INTERVAL '0 minutes',
    schedule_interval => INTERVAL '30 minutes'
);

ALTER TABLE measurement SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'station_id, metric_type',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('measurement', INTERVAL '30 days');

-- +migrate Down

DROP MATERIALIZED VIEW IF EXISTS measurement_hourly;
DROP TABLE IF EXISTS measurement;
DROP TYPE IF EXISTS metric_type;
