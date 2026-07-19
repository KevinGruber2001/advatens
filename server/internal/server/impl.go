package server

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	db "server/internal/db/sqlc"
)

// UserIDKey is the gin context key under which the auth middleware stores the
// authenticated user's ID.
const UserIDKey = "userID"

func userIDFromContext(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(UserIDKey).(string)
	return id, ok && id != ""
}

// Nudger triggers an immediate reconcile pass after a station write.
type Nudger interface {
	Nudge()
}

type Server struct {
	queries *db.Queries
	sync    Nudger
}

func NewServer(dbPool *pgxpool.Pool, sync Nudger) Server {
	return Server{
		queries: db.New(dbPool),
		sync:    sync,
	}
}
