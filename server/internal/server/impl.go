package server

import (
	influxApi "github.com/influxdata/influxdb-client-go/v2/api"
	"github.com/jackc/pgx/v5/pgxpool"
	"server/internal/chirpstack"
	db "server/internal/db/sqlc"
)

type Server struct {
	queries    *db.Queries
	db         *pgxpool.Pool
	influx     influxApi.QueryAPI
	chirpstack *chirpstack.Client
}

func NewServer(dbPool *pgxpool.Pool, influxQueryApi influxApi.QueryAPI, chirpstackClient *chirpstack.Client) Server {
	return Server{
		queries:    db.New(dbPool),
		db:         dbPool,
		influx:     influxQueryApi,
		chirpstack: chirpstackClient,
	}
}
