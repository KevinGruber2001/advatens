-- name: CreateStation :one
INSERT INTO station (name, device_id, orchard_id)
VALUES ($1, $2, $3)
    RETURNING *;

-- name: GetStationById :one
SELECT * FROM station
WHERE id = $1
  AND sync_status != 'delete_pending';

-- name: ListStationsByOrchard :many
SELECT * FROM station
WHERE orchard_id = $1
  AND sync_status != 'delete_pending'
ORDER BY created_at DESC;

-- name: ListStationsByOrchards :many
SELECT * FROM station
WHERE orchard_id = ANY(sqlc.arg('orchard_ids')::uuid[])
  AND sync_status != 'delete_pending'
ORDER BY created_at DESC;

-- name: UpdateStation :one
UPDATE station
SET name = coalesce(sqlc.narg('name'), name),
    sync_status = 'pending'
WHERE id = $1
  AND sync_status != 'delete_pending'
    RETURNING *;

-- name: MarkStationDeletePending :exec
UPDATE station
SET sync_status = 'delete_pending'
WHERE id = $1;

-- name: GetStationByDeviceId :one
SELECT * FROM station
WHERE device_id = $1
  AND sync_status != 'delete_pending';

-- name: ListStationsForSync :many
SELECT * FROM station;

-- name: SetStationSyncStatus :exec
UPDATE station
SET sync_status = $2
WHERE id = $1;

-- name: HardDeleteStation :exec
DELETE FROM station
WHERE id = $1;
