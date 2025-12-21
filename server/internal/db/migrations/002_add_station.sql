-- +migrate Up
-- SQL in section 'Up' is executed when this migration is applied

-- Remove location column from orchard
ALTER TABLE orchard DROP COLUMN IF EXISTS location;

-- Add owner_id column to orchard
ALTER TABLE orchard ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL;

-- Create station table
CREATE TABLE IF NOT EXISTS station (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID NOT NULL REFERENCES orchard(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    device_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- +migrate Down
-- SQL section 'Down' is executed when this migration is rolled back

DROP TABLE IF EXISTS station;

ALTER TABLE orchard DROP COLUMN IF EXISTS owner_id;

ALTER TABLE orchard ADD COLUMN location POINT NOT NULL;