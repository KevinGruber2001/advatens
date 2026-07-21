-- +migrate Up

-- Continuous aggregates default to materialized_only, meaning queries only
-- see data that has already been through a refresh cycle (every 30 minutes
-- per the policy in 003_add_measurements.sql). For a live dashboard this
-- makes brand-new readings invisible for up to 30 minutes after ingest.
-- Disabling this makes TimescaleDB compute a real-time tail for anything
-- not yet materialized, blended with the materialized historical data.
ALTER MATERIALIZED VIEW measurement_hourly SET (timescaledb.materialized_only = false);

-- +migrate Down

ALTER MATERIALIZED VIEW measurement_hourly SET (timescaledb.materialized_only = true);
