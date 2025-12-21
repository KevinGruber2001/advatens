-- name: CreateStation :one
INSERT INTO station (name, device_id, orchard_id)
VALUES ($1, $2, $3)
    RETURNING *;

-- name: GetStationById :one
SELECT * FROM station
WHERE id = $1;

-- name: ListStationsByOrchard :many
SELECT * FROM station
WHERE orchard_id = $1
ORDER BY created_at DESC;

-- name: UpdateStation :one
UPDATE station
SET name = coalesce(sqlc.narg('name'), name)
WHERE id = $1
    RETURNING *;

-- name: DeleteStation :exec
DELETE FROM station
WHERE id = $1;
