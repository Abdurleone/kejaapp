# Deployment

JakezApp has three deployment-related setups: local Docker Compose, a Render Blueprint (the actual live production deployment), and Kubernetes manifests (a reference/alternative path, not currently deployed anywhere). MongoDB is **external** (Atlas or your own instance) in all three — nothing here provisions a database.

For the full detail behind every section here, see [docs/devops.md](https://github.com/Abdurleone/jakezapp/blob/main/docs/dev/devops.md) in the repo.

## CI

`.github/workflows/ci.yml` is enabled on GitHub Actions, but currently every job fails to start with "your account is locked due to a billing issue" — an account-level GitHub billing lock, not a workflow/code problem. Needs clearing at github.com/settings/billing before any of this actually runs. Once unblocked, it runs on every push to `main` and every PR:

- **backend** — spins up a `mongo:7` service container, runs the full test suite against it (this is what exercises the opt-in MongoDB integration tests).
- **frontend** — tests, then `npm run build` to catch build-breaking errors.
- **mobile** — lint + test, runs independently in parallel — doesn't gate the docker/publish pipeline below.
- **docker** — builds both images (no push) to catch Dockerfile regressions, gated on **backend**/**frontend** passing (not **mobile**).
- **k8s-smoke-test** — gated on **docker**. Spins up a real `kind` cluster, installs `ingress-nginx`, applies the `k8s/` manifests, and verifies the whole stack through the ingress end-to-end (register, create a property, confirm public discovery) — the job that actually proves the manifests work together, not just that they build.
- **publish** — on `main` only, gated on **docker** and **k8s-smoke-test**. Rebuilds and pushes both images to GHCR (`ghcr.io/<owner>/jakezapp-backend`, `jakezapp-frontend`), tagged `latest` and the commit SHA. This is what the Kubernetes manifests deploy — Render builds its own images directly from the Dockerfiles.

## Containers

- `backend/Dockerfile` — Node 22 Alpine, production deps only, `HEALTHCHECK` against `GET /api/health/live`.
- `frontend/Dockerfile` — multi-stage: Node builds the Vite bundle, Nginx Alpine serves it. `frontend/nginx.conf` handles SPA routing and long-cache headers for hashed assets.
- `docker-compose.yml` — wires `mongo`, `redis`, `backend`, `frontend` together for a full local/staging stack.

```bash
cp .env.example .env   # set JWT_SECRET
docker compose up --build
```

Frontend at `http://localhost:8080`, backend at `http://localhost:5000`. Single backend replica, no TLS termination — a reasonable local/staging starting point, not hardened for production as-is.

## Health checks

- `GET /api/health` — overall status + current DB connection state.
- `GET /api/health/live` — liveness only, no DB check (used by the Docker `HEALTHCHECK`).
- `GET /api/health/ready` — readiness: actively pings MongoDB, `503` if unreachable. Point a load balancer's health check here.
- `GET /api/health/database` — DB connectivity only.

## Deployment: Render — production

This is the actual live deployed instance: a single URL, `jakezapp-backend.onrender.com`, serving both the web app and its API. `render.yaml` (repo root) is a [Render Blueprint](https://render.com/docs/blueprint-spec) defining:

- **jakezapp-backend** — one web service, built from `backend/Dockerfile.render` (**not** the plain `backend/Dockerfile`), with `dockerContext: .` (repo root, not `backend/`).
- **jakezapp-redis** — Render's managed Redis-compatible Key Value service.

There used to be a separate **jakezapp-frontend** static site; it's retired, not renamed. `backend/Dockerfile.render` builds the frontend in its own stage and copies the output into the image as `./public`; `backend/app.js` serves it (static files + an SPA fallback route) whenever that directory exists, falling back to today's plain JSON message otherwise — so local dev / `docker compose` / Kubernetes (none of which ever have that directory) are unaffected. This makes the web app and its API genuinely same-origin — see `docs/devops.md` for the three non-obvious things that took to make that actually work (build-time env vars need to be Docker build args, `CORS_ORIGIN` is still required despite being same-origin, and Helmet's CSP needs a scoped exception for the Google Identity Services script).

MongoDB is **not** provisioned — bring your own Atlas (or other) connection string.

**First-time setup:**
1. Render dashboard → **New > Blueprint**, point at this repo.
2. Set `MONGODB_URI` on **jakezapp-backend** (the one secret the blueprint leaves blank). `JWT_SECRET` is auto-generated.
3. Create an object storage bucket (see below) and set the five `sync: false` secrets: `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`.
4. Deploy. If Render assigns a different subdomain than the default baked into `render.yaml` (`CORS_ORIGIN`, `VITE_API_BASE_URL`), update both and redeploy.

**Known limitations:** the service spins down after 15 min idle on the free plan (cold start on next request, though uploaded images aren't affected if using the `s3` driver); single backend instance (no horizontal scaling, though Redis-backed rate limiting already supports it if you scale up); auto-deploys on push with no CI gate (a red `main` doesn't block a Render deploy unless you disable auto-deploy). This Blueprint (backend+frontend + Redis) is entirely on free plans — malware scanning (ClamAV) is deliberately left off this path since it needs more RAM than the free plan allows; uploads just skip scanning rather than erroring (see `docs/devops.md` for adding it back on a paid plan).

## Object storage

Render (and Kubernetes) have no reliable persistent disk, so `backend/services/fileStorageService.js` supports two drivers via `STORAGE_DRIVER`:

- `local` (default) — disk, fine for Docker Compose/local dev where the filesystem persists.
- `s3` — any S3-compatible bucket via `@aws-sdk/client-s3`. **Cloudflare R2** is the recommended default (free tier: 10 GB storage, no egress fees).

**R2 setup:** create a bucket → enable public access, note the `r2.dev` URL (`S3_PUBLIC_BASE_URL`) → create an API token scoped to the bucket (`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`) → `S3_ENDPOINT` is `https://<account-id>.r2.cloudflarestorage.com`, `S3_REGION` stays `auto`.

AWS S3, Backblaze B2, and MinIO work the same way (MinIO/path-style-only providers also need `S3_FORCE_PATH_STYLE=true`).

## Deployment: Kubernetes — reference/alternative

`k8s/` is a reference deployment path, not currently deployed anywhere (plain manifests, no Helm/Kustomize) for any conformant cluster (EKS, GKE, AKS, DigitalOcean, kind, minikube). CI's **k8s-smoke-test** job keeps these manifests proven to actually work together on every push/PR, even though nothing runs on them in production today.

| File | Purpose |
|---|---|
| `namespace.yaml` | the `jakezapp` namespace |
| `backend-configmap.yaml` | non-secret backend env vars |
| `backend-secret.example.yaml` | template — copy to `backend-secret.yaml` (gitignored), fill in real values, never commit it |
| `backend-deployment.yaml` | Deployment (2 replicas) + Service, liveness/readiness probes on `/api/health/live`/`/api/health/ready` |
| `backend-hpa.yaml` | HorizontalPodAutoscaler (2–6 replicas, CPU-based) — needs `metrics-server` |
| `frontend-deployment.yaml` | Deployment (2 replicas) + Service for the Nginx-served build |
| `redis-statefulset.yaml` | in-cluster Redis (StatefulSet + 1Gi PVC) |
| `clamav-statefulset.yaml` | in-cluster ClamAV (StatefulSet + 2Gi PVC, so the ~100MB signature database isn't re-downloaded on every pod restart) for malware scanning on property-image uploads — `backend-configmap.yaml` points `CLAMAV_HOST`/`CLAMAV_PORT` at it |
| `backend-cronjob.yaml` | CronJob running the scheduled notification sweeps (`node scripts/runScheduledJobs.js`) every 15 minutes, reusing the same image/ConfigMap/Secret |
| `ingress.yaml` | routes two hosts to the two Services — needs `ingress-nginx` |

**Why two Ingress hosts instead of path-based routing:** the frontend reads `VITE_API_BASE_URL` at **build time** (baked into the static JS bundle by Vite), not at container start. Rather than rewrite the frontend to use a relative URL, `ingress.yaml` keeps two domains (`jakezapp.example.com` / `api.jakezapp.example.com`) — this is now a deliberate difference from Render (which consolidated onto one origin, see above), not a mirror of it; Kubernetes stays a genuinely two-origin deployment on purpose. The CI `publish` job's frontend image is baked for that exact placeholder API domain — using it as-is works out of the box; for your own domain, rebuild:

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.<your-domain> -t ghcr.io/<owner>/jakezapp-frontend:latest ./frontend
docker push ghcr.io/<owner>/jakezapp-frontend:latest
```

then update `CORS_ORIGIN` in `backend-configmap.yaml` to match.

**First-time setup:**
1. Point DNS for both hosts at your ingress controller's load balancer.
2. Install `ingress-nginx` and (optionally) `metrics-server`.
3. Create an object storage bucket + MongoDB Atlas connection string (same as Render, above).
4. Make GHCR images pullable (set packages public, or add `imagePullSecrets`).
5. `cp k8s/backend-secret.example.yaml k8s/backend-secret.yaml`, fill in real values, then:
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/backend-configmap.yaml -f k8s/backend-secret.yaml
   kubectl apply -f k8s/backend-deployment.yaml -f k8s/backend-hpa.yaml
   kubectl apply -f k8s/backend-cronjob.yaml
   kubectl apply -f k8s/redis-statefulset.yaml
   kubectl apply -f k8s/clamav-statefulset.yaml
   kubectl apply -f k8s/frontend-deployment.yaml
   kubectl apply -f k8s/ingress.yaml
   ```

   `backend-configmap.yaml` sets `CLAMAV_HOST` unconditionally, so skipping the `clamav-statefulset.yaml` step above doesn't just disable malware scanning — property-image uploads fail closed (rejected) once the backend can't reach a scanner it's configured to expect.

   Outside Kubernetes, run the same sweeps manually or via your own scheduler with `npm run jobs` in `backend/` — there's no in-process timer, so nothing runs automatically unless something external calls it on a schedule.

**Known limitations:** no TLS (add cert-manager + `tls:` blocks before real use); no non-root `securityContext` (neither Dockerfile creates a non-root user yet); no CI-driven rollout — applying is manual (`kubectl apply`/`kubectl rollout restart`).
