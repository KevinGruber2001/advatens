# Advatens

Orchard monitoring on LoRaWAN. Sensor stations in orchards send measurements
(temperature, humidity, soil moisture, battery) through ChirpStack; a Go API
server ingests them into TimescaleDB and serves them to a React dashboard.

## Architecture

```
station (firmware) ──LoRa──> gateway ──UDP/BasicStation──> gateway bridge
                                                               │ MQTT
                                                          ChirpStack
                                                               │ MQTT (uplink events)
frontend (React) ──HTTP──> server (Go) ──ingest──> TimescaleDB (measurement hypertable)
                              │
                              └──gRPC──> ChirpStack (device provisioning)
```

- `server/` — Go API. OpenAPI-first (oapi-codegen strict handlers from
  `openapi.yml`), sqlc for queries, embedded SQL migrations. A background
  reconciler keeps ChirpStack devices in sync with the `station` table
  (the database is the source of truth).
- `frontend/` — React + Vite + Tailwind, Clerk auth, API client generated
  from `openapi.yml`. Has an MSW mock mode (`npm run dev:mock`).
- `chirpstack/` — configuration for ChirpStack, the gateway bridges and
  Mosquitto (EU868 only). Mounted into the stock images by docker compose.
- `station/` — PlatformIO firmware for the RAK sensor station.

## Quickstart

```sh
cp .env.example .env      # fill in the Clerk keys
docker compose up -d
```

- Frontend: http://localhost:3000
- API: http://localhost:8888
- ChirpStack UI: http://localhost:8080 (admin/admin)
- Postgres: 127.0.0.1:5433 (5433 to avoid colliding with a native Postgres)

For server development against the compose infrastructure:

```sh
cd server
make docker-run           # starts postgres, redis, mosquitto, chirpstack
make watch                # air live-reload, reads app.env (copy app.env.example)
```

## Code generation

The OpenAPI spec (`openapi.yml`) and SQL queries are the sources of truth:

```sh
# Server: HTTP handlers (after editing openapi.yml)
cd server && oapi-codegen -config oapi-codegen.yaml ../openapi.yml

# Server: query code (after editing internal/db/queries or migrations)
cd server && sqlc generate

# Frontend: API client (runs automatically before npm run build)
cd frontend && npm run prebuild
```

## Deployment

Pushing to `main` deploys via `.github/workflows/deploy.yml` (Hostinger VPS,
docker compose). Only the frontend (:3000), API (:8888) and gateway ports
(:1700/udp, :3002) are exposed; everything else is loopback-bound.
Required GitHub secrets: `DB_*`, `CLERK_SECRET_KEY`,
`VITE_CLERK_PUBLISHABLE_KEY`, `CHIRPSTACK_API_SECRET`,
`CHIRPSTACK_ADMIN_EMAIL`, `CHIRPSTACK_ADMIN_PASSWORD`; variables:
`VITE_API_BASE_URL`, `CORS_ALLOWED_ORIGINS`, `HOSTINGER_VM_ID`.
