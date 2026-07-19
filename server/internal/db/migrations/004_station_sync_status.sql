-- +migrate Up

CREATE TYPE station_sync_status AS ENUM (
    'pending',
    'synced',
    'delete_pending'
);

-- Existing rows default to 'pending' so the reconciler adopts them on its first pass.
ALTER TABLE station ADD COLUMN sync_status station_sync_status NOT NULL DEFAULT 'pending';

-- The MQTT ingest and the reconciler both resolve stations by device EUI.
ALTER TABLE station ADD CONSTRAINT station_device_id_key UNIQUE (device_id);

-- +migrate Down

ALTER TABLE station DROP CONSTRAINT IF EXISTS station_device_id_key;
ALTER TABLE station DROP COLUMN IF EXISTS sync_status;
DROP TYPE IF EXISTS station_sync_status;
