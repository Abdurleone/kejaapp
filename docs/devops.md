# DevOps

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:

- **backend** job: spins up a `mongo:7` service container, runs `npm test` against it (this also exercises `backend/tests/integration/mongodb.integration.test.js`, which otherwise self-skips without `TEST_MONGODB_URI`).
- **frontend** job: runs `npm test`, then `npm run build` to catch build-breaking errors.
- **docker** job: builds the backend and frontend images (`docker build`, no push) to catch Dockerfile regressions, gated on the two test jobs passing first.

Nothing is pushed to a registry yet — see "Deployment" below.

## Containers

- `backend/Dockerfile` — Node 22 Alpine, production dependencies only, non-root working dir, `HEALTHCHECK` against `GET /api/health/live`.
- `frontend/Dockerfile` — multi-stage: Node 22 Alpine builds the Vite bundle, then Nginx Alpine serves the static output. `frontend/nginx.conf` handles SPA routing (`try_files ... /index.html`) and long-cache headers for hashed `/assets/`.
- `docker-compose.yml` (repo root) — wires `mongo`, `redis`, `backend`, and `frontend` together for a full local stack: `backend` talks to `mongo`/`redis` by service name, `frontend` is built with `VITE_API_BASE_URL` pointing at the host-exposed backend port.

Run the full stack:

```bash
cp .env.example .env   # set JWT_SECRET
docker compose up --build
```

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:5000`

This is meant for local/staging use as-is (single backend replica, no TLS termination). It is a reasonable starting point for a real deployment but isn't hardened for one (see below).

## Health checks

Already implemented in `backend/routes/healthRoutes.js` / `backend/controllers/healthController.js`, reused by the Docker `HEALTHCHECK` and useful behind any load balancer or orchestrator:

- `GET /api/health` — overall status + current DB connection state.
- `GET /api/health/live` — liveness only (process is up), no DB check. Used by the container `HEALTHCHECK`.
- `GET /api/health/ready` — readiness: actively pings MongoDB, returns `503` if it's unreachable. Point a load balancer's health check here to pull an instance out of rotation during a DB outage.
- `GET /api/health/database` — DB connectivity only.

## Deployment

Not deployed anywhere yet. The Docker images built above are the deployable artifact — once a host is chosen (Render, Fly.io, a VPS, etc.), what's needed is:

1. A registry push step added to the `docker` CI job (or a platform-specific build step).
2. A deploy step (e.g. `flyctl deploy`, a Render deploy hook, or `ssh` + `docker compose pull && up -d` for a VPS) gated on `main`.
3. Real secrets (`JWT_SECRET`, `MONGODB_URI`, `REDIS_URL`, `CORS_ORIGIN`) set in the target platform, not in the repo.

This is intentionally left undone until a target is picked, rather than guessing at a specific host's config.
