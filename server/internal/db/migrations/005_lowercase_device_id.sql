-- +migrate Up

-- ChirpStack canonicalizes DevEUIs to lowercase; any station created before
-- the server started normalizing on write may still hold mixed-case values,
-- which breaks the reconciler's and the MQTT subscriber's string matches
-- against ChirpStack.
UPDATE station SET device_id = lower(device_id) WHERE device_id != lower(device_id);

-- +migrate Down

-- Original casing is not recoverable; nothing to do.
