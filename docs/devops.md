# DevOps

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request. It had been disabled at the GitHub Actions level (`state: disabled_manually`) since 2026-07-06 as a billing-notification precaution — re-enabled via `gh workflow enable` once that turned out to be a stale concern (standard GitHub-hosted runners are free/unlimited for public repos). See the [ISO 27001 SoA](iso27001-statement-of-applicability.md) for the history of the gap this left.

It runs the following jobs:

- **backend** job: spins up a `mongo:7` service container, runs `npm test` against it (this also exercises `backend/tests/integration/mongodb.integration.test.js`, which otherwise self-skips without `TEST_MONGODB_URI`).
- **frontend** job: runs `npm test`, then `npm run build` to catch build-breaking errors.
- **mobile** job: `npm run lint` then `npm test`. Runs independently in parallel with the two above — it isn't in `docker`'s `needs:` list, so a mobile-only failure doesn't block the backend/frontend images from building or publishing.
- **docker** job: builds the backend and frontend images (`docker build`, no push) to catch Dockerfile regressions, gated on the **backend** and **frontend** jobs passing (not **mobile** — see above).
- **k8s-smoke-test** job: gated on **docker** passing. Spins up a real `kind` cluster, installs `ingress-nginx`, builds and loads the backend/frontend images straight into the cluster (no registry round-trip), applies the `k8s/` manifests (with a throwaway in-cluster MongoDB standing in for Atlas), and verifies the whole stack through the ingress end-to-end: health check, register, create a property, confirm it's publicly discoverable. This is the CI job that actually proves the `k8s/` manifests work together, not just that they build.
- **publish** job: on pushes to `main` only (not PRs), gated on **docker** and **k8s-smoke-test** passing. Rebuilds both images and pushes them to GHCR (`ghcr.io/<owner>/kejaapp-backend`, `kejaapp-frontend`), tagged `latest` and the commit SHA. This is what the Kubernetes manifests in `k8s/` deploy — see "Deployment (Kubernetes)" below. Render doesn't use these; it builds directly from the Dockerfiles itself.

## Containers

- `backend/Dockerfile` — Node 22 Alpine, production dependencies only, non-root working dir, `HEALTHCHECK` against `GET /api/health/live`.
- `frontend/Dockerfile` — multi-stage: Node 22 Alpine builds the Vite bundle, then Nginx Alpine serves the static output. `frontend/nginx.conf` handles SPA routing (`try_files ... /index.html`) and long-cache headers for hashed `/assets/`.
- `docker-compose.yml` (repo root) — wires `mongo`, `redis`, `clamav`, `backend`, and `frontend` together for a full local stack: `backend` talks to `mongo`/`redis`/`clamav` by service name, `frontend` is built with `VITE_API_BASE_URL` pointing at the host-exposed backend port. `clamav` (`clamav/clamav:stable`) provides malware scanning on property-image uploads (`backend/services/malwareScanService.js`) — it isn't exposed to the host, only reachable from `backend` on the compose network, and its signature database persists in the `clamav-data` volume so it isn't re-downloaded on every `docker compose up`.

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

## Deployment (Render) — production

This is the actual live deployed instance: `kejaapp-frontend.onrender.com` / `kejaapp-backend-7iu3.onrender.com`, both confirmed working end-to-end. `render.yaml` (repo root) is a [Render Blueprint](https://render.com/docs/blueprint-spec) that defines the whole stack:

- **kejaapp-backend** — web service, built from `backend/Dockerfile`. Render injects `PORT` itself; `backend/config/env.js` already reads `process.env.PORT`, so no code change was needed.
- **kejaapp-frontend** — static site, built with `npm ci && npm run build` in `frontend/`, publishing `frontend/dist`. A catch-all rewrite (`/* -> /index.html`) handles SPA routing (Render static sites don't use `frontend/nginx.conf`/`frontend/Dockerfile` — those stay in use for `docker compose` and the CI `docker` job).
- **kejaapp-redis** — Render's managed Key Value (Redis-compatible) service, wired into the backend via `REDIS_URL`.

No ClamAV service is defined here — it's the one piece of the stack (docker-compose/Kubernetes) that isn't free to run (its signature database needs roughly 1-2GB of RAM, well past the free plan's 512MB), so this Blueprint deliberately leaves `CLAMAV_HOST` unset and lets `malwareScanService.js`'s existing "empty = disabled" convention silently skip scanning on this path. Add a `pserv` service running `clamav/clamav:stable` on a paid plan, wired via `CLAMAV_HOST`/`CLAMAV_PORT`, if you want scanning back.

MongoDB is **not** provisioned by the blueprint — Render has no managed MongoDB, so this stays on the existing MongoDB Atlas instance (or whatever `MONGODB_URI` you already use).

### First-time setup

1. In the Render dashboard: **New > Blueprint**, point it at this repo. Render reads `render.yaml` and creates all three services.
2. Set the one secret the blueprint deliberately leaves blank: `MONGODB_URI` on **kejaapp-backend** (Atlas connection string, including credentials). `JWT_SECRET` is auto-generated by Render; everything else has a value in `render.yaml`.
3. Create an object storage bucket for property images (see "Object storage" below) and set the five `sync: false` secrets on **kejaapp-backend**: `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`.
4. Deploy. Once both web services are up, confirm the frontend can reach the backend (check the browser console/network tab for CORS or 404s) — the URLs baked into `render.yaml` (`CORS_ORIGIN`, `VITE_API_BASE_URL`) assume the default service names `kejaapp-backend`/`kejaapp-frontend`. If Render assigns different subdomains (name already taken, custom domain, etc.), update those values to match and redeploy.

### Object storage

Render web services have no persistent disk on the free plan (and only one disk per paid instance, which doesn't survive across multiple instances either) — anything written to `backend/uploads` disappears on the next restart or deploy. `backend/services/fileStorageService.js` supports two drivers, switched by `STORAGE_DRIVER`:

- `local` (default) — writes to `UPLOAD_DIR` on disk. Used by `docker compose` and local dev; fine there because the volume/filesystem persists.
- `s3` — writes to any S3-compatible bucket via `@aws-sdk/client-s3`. This is what `render.yaml` sets for **kejaapp-backend**.

The `s3` driver isn't tied to AWS — it works with any S3-compatible provider by pointing `S3_ENDPOINT` at it. **Cloudflare R2** is the recommended default for this project: free tier includes 10 GB storage and no egress fees (egress is what most providers charge for on image-heavy apps like this one).

Setup for R2:

1. Create a bucket in the Cloudflare dashboard (R2 > Create bucket).
2. Enable public access on the bucket (R2 > bucket > Settings > Public Access) and note the `r2.dev` public URL (or attach a custom domain) — this is `S3_PUBLIC_BASE_URL`.
3. Create an API token (R2 > Manage API Tokens > Create API Token, "Object Read & Write", scoped to the bucket) — gives you `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`.
4. `S3_ENDPOINT` is `https://<account-id>.r2.cloudflarestorage.com`; `S3_BUCKET` is the bucket name; `S3_REGION` stays `auto` (R2 ignores region but the AWS SDK requires the field).

AWS S3, Backblaze B2, and MinIO all work the same way — swap in their endpoint/credentials and (for MinIO/path-style-only providers) set `S3_FORCE_PATH_STYLE=true`.

Note: `removePropertyImage` now deletes the underlying object (or local file) when a property image is removed, for either driver — previously images were only detached from the Property document and the file was left orphaned on disk.

### Known limitations of this setup

- **Free plan**: both web services spin down after 15 minutes idle (cold start on the next request). With the `s3` driver this no longer affects uploaded images (see above), only request latency after an idle period. This Blueprint (backend + frontend + Redis) is fully free as configured — malware scanning is the one feature deliberately left off this path (see above) rather than a hidden cost.
- Single backend instance — no horizontal scaling. The existing Redis-backed rate limiting (`backend/config/env.js`'s `redisUrl`) already supports multiple instances if you do scale up.
- Render auto-deploys on push to the connected branch by default; there's no GitHub Actions deploy step to maintain, but it also means a red CI run on `main` doesn't block Render from deploying. If that's undesirable, disable auto-deploy in the Render dashboard and trigger deploys manually instead.

## Deployment (Kubernetes) — reference/alternative

`k8s/` (repo root) is a reference deployment path, not currently deployed anywhere — plain manifests (no Helm/Kustomize), for anyone who wants a real cluster instead of Render. It targets any conformant cluster (EKS, GKE, AKS, DigitalOcean, kind, minikube), not a specific provider. CI's **k8s-smoke-test** job keeps these manifests proven to actually work together (not just build) on every push/PR, even though nothing runs on them in production today.

Files:

- `namespace.yaml` — the `kejaapp` namespace everything else lives in.
- `backend-configmap.yaml` — non-secret backend env vars (CORS origin, S3 bucket/endpoint, in-cluster Redis/ClamAV addresses, etc.).
- `backend-secret.example.yaml` — template for the one Secret the backend needs (`MONGODB_URI`, `JWT_SECRET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`). Copy to `backend-secret.yaml` (gitignored) and fill in real values before applying — never commit the filled-in version.
- `backend-deployment.yaml` — Deployment (2 replicas) + Service, wired to the ConfigMap/Secret via `envFrom`, with `livenessProbe`/`readinessProbe` on the existing `/api/health/live` and `/api/health/ready` endpoints.
- `backend-hpa.yaml` — HorizontalPodAutoscaler (2-6 replicas, scales on CPU). Requires `metrics-server` in the cluster.
- `frontend-deployment.yaml` — Deployment (2 replicas) + Service for the Nginx-served static build.
- `redis-statefulset.yaml` — in-cluster Redis (StatefulSet + 1Gi PVC on the cluster's default StorageClass) for rate limiting/caching. Not used for data that needs to survive losing the whole cluster.
- `clamav-statefulset.yaml` — in-cluster ClamAV (StatefulSet + 2Gi PVC, so the ~100MB signature database isn't re-downloaded on every pod restart) for malware scanning on property-image uploads (`backend/services/malwareScanService.js`). A cold signature-load takes roughly 10s in local testing, hence the readiness probe's `initialDelaySeconds: 30`; scanning fails closed (rejects the upload) if the backend can't reach it, rather than silently skipping the check, so a slow/crashed ClamAV pod shows up as upload failures, not a silent gap.
- `backend-cronjob.yaml` — CronJob running `node scripts/runScheduledJobs.js` (the time-based notification sweeps: stale inquiry/viewing nudges, viewing reminders, etc. — see `backend/jobs/`) every 15 minutes, reusing the same backend image/ConfigMap/Secret. `concurrencyPolicy: Forbid` guarantees exactly one run at a time regardless of how many `kejaapp-backend` Deployment replicas are up, so a naive in-process `setInterval` (which would fire once per replica and double-send notifications) was deliberately avoided. Each job is also idempotent on its own (it marks the records it's already acted on), so an overlapping or re-run is harmless even without the concurrency guard. Each sweep's threshold (48h nudge, 24h reminder, 14-day freshness/lookback windows) is an env var (`STALE_NUDGE_THRESHOLD_HOURS`, `VIEWING_REMINDER_WINDOW_HOURS`, `STALE_LISTING_FRESHNESS_DAYS`, `REVIEW_PROMPT_LOOKBACK_DAYS` — see `backend/.env.example`) — add them to the ConfigMap to retune cadence without a code change.
- `ingress.yaml` — routes two hosts to the two Services. Assumes `ingress-nginx` is installed; no TLS/cert-manager wired up (same "left for later" posture as the Docker Compose stack).

MongoDB stays external on Atlas, same as the Render setup — there's no in-cluster MongoDB manifest.

### Why two Ingress hosts, not one with path-based routing

`frontend/src/App.jsx` reads `VITE_API_BASE_URL` at **build time** (baked into the static JS bundle by Vite), not at container start. A single shared host with `/api` path routing would need the frontend to call a relative URL instead, which isn't how the code is written today. Rather than change frontend code for this, `ingress.yaml` keeps the same two-domain shape already used for Render (`kejaapp.example.com` for the frontend, `api.kejaapp.example.com` for the backend) — no app code changes, just infra.

The practical consequence: the `publish` CI job's frontend image is baked for `https://api.kejaapp.example.com` specifically. If you use that exact placeholder domain (pointed at your Ingress), the published image works as-is. For your own domain, rebuild and push the frontend image yourself:

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.<your-domain> -t ghcr.io/<owner>/kejaapp-frontend:latest ./frontend
docker push ghcr.io/<owner>/kejaapp-frontend:latest
```

then update `CORS_ORIGIN` in `backend-configmap.yaml` to match your frontend domain.

### Capacity planning

`backend-hpa.yaml` scales the backend 2-6 replicas on CPU, and the thresholds haven't been revisited since they were first set. Review them against real usage on a recurring basis (quarterly is a reasonable default for a project this size) — check actual CPU/memory utilization against the HPA's target, whether 6 replicas has ever actually been hit, and whether ClamAV's/Redis's own resource requests (`clamav-statefulset.yaml`, `redis-statefulset.yaml`) still match their real footprint. There's no dashboard or reminder wired up for this yet — it's a manual, calendar-driven check, tracked here as the process itself rather than as tooling.

### Network topology

The request path is the same shape on both deployment targets — Render's managed services stand in for the Kubernetes manifests one-to-one:

```mermaid
flowchart LR
    User(["Tenant / Landlord / Agency / Mover<br/>(browser or mobile app)"])

    subgraph Edge["Edge (per deployment target)"]
        direction TB
        RenderEdge["Render: static-site host + web-service URL"]
        K8sEdge["Kubernetes: ingress-nginx (ingress.yaml)<br/>two hosts, no shared path routing"]
    end

    Frontend["Frontend<br/>(Nginx-served static Vite build)"]
    Backend["Backend<br/>(Node/Express, 2+ replicas)"]
    Mongo[("MongoDB Atlas<br/>(external to both targets)")]
    Redis[("Redis<br/>rate limiting + response cache")]
    ClamAV[("ClamAV<br/>malware scanning")]
    Storage[("S3-compatible object storage<br/>(property images)")]
    Expo[("Expo push service")]

    User --> Edge
    Edge --> Frontend
    Edge --> Backend
    Backend --> Mongo
    Backend --> Redis
    Backend --> ClamAV
    Backend --> Storage
    Backend --> Expo
```

Not shown: the `backend-cronjob.yaml` CronJob, which talks to the same Mongo/notification path as the backend Deployment but isn't reachable from outside the cluster at all — it has no Service, only scheduled internal execution. This diagram (control `8.20`/`8.22` in the [ISO 27001 SoA](iso27001-statement-of-applicability.md)) documents the intended topology; it hasn't been cross-checked against a live running cluster's actual `kubectl get all` output.

### First-time setup

1. Point DNS for both hosts in `ingress.yaml` at your ingress controller's load balancer IP/hostname (or edit the hosts to your own domain — see above).
2. Install `ingress-nginx` and (optionally) `metrics-server` in the cluster if they aren't already there.
3. Create an object storage bucket (see the Render section's "Object storage" above — same `STORAGE_DRIVER=s3` setup applies) and a MongoDB Atlas connection string.
4. Make the images pullable: after the CI `publish` job's first run, set the GHCR packages (`kejaapp-backend`, `kejaapp-frontend`) to public in GitHub's package settings, or add an `imagePullSecrets` entry to the Deployments for private pulls.
5. `cp k8s/backend-secret.example.yaml k8s/backend-secret.yaml`, fill in real values, then apply everything:

   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/backend-configmap.yaml -f k8s/backend-secret.yaml
   kubectl apply -f k8s/backend-deployment.yaml -f k8s/backend-hpa.yaml
   kubectl apply -f k8s/backend-cronjob.yaml
   kubectl apply -f k8s/redis-statefulset.yaml
   kubectl apply -f k8s/frontend-deployment.yaml
   kubectl apply -f k8s/ingress.yaml
   ```

   Outside Kubernetes (local dev, Render, Docker Compose), run the same sweeps manually or via your own scheduler with `npm run jobs` in `backend/` (or `node scripts/runScheduledJobs.js` directly) — there's no in-process timer, so nothing runs automatically unless something external calls this on a schedule.

### Known limitations of this setup

- No TLS — add cert-manager plus `tls:` blocks in `ingress.yaml` before using this for anything beyond a demo.
- Deployments don't set a `securityContext`/`runAsNonRoot`; neither Dockerfile creates or switches to a non-root user, so forcing one at the pod level would just fail to start. Hardening this means updating the Dockerfiles first.
- No CI-driven rollout — applying `k8s/` is manual (`kubectl apply` / `kubectl rollout restart`), unlike Render's auto-deploy-on-push. Wiring up `kubectl apply` as a CI step (with cluster credentials as a repo secret) is a natural next step once a real cluster is chosen.
