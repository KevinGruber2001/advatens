package server

import (
	influxApi "github.com/influxdata/influxdb-client-go/v2/api"
	"github.com/jackc/pgx/v5/pgxpool"
	db "server/internal/db/sqlc"
)

type Server struct {
	queries *db.Queries
	db      *pgxpool.Pool
	influx  influxApi.QueryAPI
}

func NewServer(dbPool *pgxpool.Pool, influxQueryApi influxApi.QueryAPI) Server {
	return Server{
		queries: db.New(dbPool),
		db:      dbPool,
		influx:  influxQueryApi,
	}
}
