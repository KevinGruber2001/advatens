-- +migrate Up

-- LoRaWAN AppKey for OTAA, generated server-side on station creation and
-- persisted so the (async) reconciler can set it on the ChirpStack device.
-- Nullable: existing/manually-provisioned stations have no generated key.
ALTER TABLE station ADD COLUMN app_key TEXT;

-- +migrate Down

ALTER TABLE station DROP COLUMN IF EXISTS app_key;
