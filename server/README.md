# server

Go API for Advatens. See the [root README](../README.md) for the full picture.

- `make watch` — live-reload dev server (reads `app.env`, copy `app.env.example`)
- `make docker-run` — start the shared infra (postgres, redis, mosquitto, chirpstack)
- `sqlc generate` — regenerate query code from `internal/db/queries` + migrations
- `oapi-codegen -config oapi-codegen.yaml ../openapi.yml` — regenerate handlers
