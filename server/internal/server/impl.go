package server

import (
	influxApi "github.com/influxdata/influxdb-client-go/v2/api"
	"github.com/jackc/pgx/v5/pgxpool"
	"server/config"
	"server/internal/chirpstack"
	db "server/internal/db/sqlc"
)

type Server struct {
	queries    *db.Queries
	db         *pgxpool.Pool
	influx     influxApi.QueryAPI
	chirpstack *chirpstack.Client
	config     *config.EnvVars
}

func NewServer(dbPool *pgxpool.Pool, influxQueryApi influxApi.QueryAPI, chirpstackClient *chirpstack.Client, cfg *config.EnvVars) Server {
	return Server{
		queries:    db.New(dbPool),
		db:         dbPool,
		influx:     influxQueryApi,
		chirpstack: chirpstackClient,
		config:     cfg,
	}
}
