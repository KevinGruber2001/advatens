-- name: CreateOrchard :one
INSERT INTO orchard (name, owner_id)
VALUES ($1, $2)
    RETURNING *;

-- name: GetOrchardById :one
SELECT * FROM orchard
WHERE id = $1;

-- name: ListOrchards :many
SELECT * FROM orchard
         WHERE owner_id = $1
ORDER BY created_at DESC;

-- name: UpdateOrchard :one
UPDATE orchard
SET name = coalesce(sqlc.narg('name'), name)
WHERE id = $1
    RETURNING *;

-- name: DeleteOrchard :exec
DELETE FROM orchard
WHERE id = $1;