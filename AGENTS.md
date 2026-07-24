# AgriNode — agent instructions

LoRaWAN orchard-monitoring platform: Go API (`server/`), React frontend (`frontend/`),
RAK4631 firmware (`station/`), self-hosted via docker-compose with ChirpStack/TimescaleDB.

## Source of truth, not hand-edited output
- `openapi.yml` (repo root) defines the API. After changing it, regenerate:
  - `cd server && oapi-codegen -config oapi-codegen.yaml ../openapi.yml`
  - `cd frontend && npm run prebuild` (regenerates `generated.api.ts`)
- DB schema lives in `server/internal/db/migrations/*.sql`, queries in
  `server/internal/db/queries/*.sql`. After touching either: `cd server && sqlc generate`.
- Never hand-edit `server/internal/server/api.gen.go`, `server/internal/db/sqlc/*.go`,
  or `frontend/generated.api.ts` — they're generated, edits will be silently overwritten.

## Build & verify before opening a PR
- Go: `cd server && go build ./... && go vet ./... && go test ./...`
- Frontend: `cd frontend && npx tsc -b && npm run lint`
- Frontend UI changes can be verified without a real backend: `npm run dev:mock` (MSW-mocked API).

## Architecture conventions
- `station` DB table is the source of truth for ChirpStack device state — the
  `reconciler` package syncs ChirpStack asynchronously. Don't call ChirpStack directly
  from HTTP handlers in `server/internal/server/`; write the DB row and call `s.sync.Nudge()`.
- LoRaWAN DevEUI/AppKey are generated server-side on station creation (`server/internal/server/lorawan.go`),
  never client-supplied.

## Firmware (`station/`)
- Arduino sketch, built with `arduino-cli` (RUI3 has no PlatformIO support): `make firmware`.
- You cannot flash or test on physical hardware — verify compilation only
  (`make firmware`), and say so explicitly in the PR description.

## Don't touch without being asked
- `.github/workflows/deploy.yml` auto-deploys to production on push to `main`.
- Don't modify DNS, Traefik/docker-compose infra config, or ChirpStack device profiles
  unless the issue specifically asks for it.
