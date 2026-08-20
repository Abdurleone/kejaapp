# Scaling and Load Balancing

KejaApp can run behind a reverse proxy or load balancer as multiple Node.js instances. The backend should be treated as mostly stateless, with shared services handling durable or cross-instance state.

## Runtime Model

- Run multiple backend instances from the same image or release artifact.
- Put a load balancer in front of the instances.
- Route health probes to `/api/health/live` and readiness probes to `/api/health/ready`.
- Set `TRUST_PROXY=true` or `TRUST_PROXY=1` when the app is behind a trusted proxy so Express reads forwarded client IP and protocol correctly.
- Keep `AUTH_COOKIE_SECURE=true` in production when traffic reaches users over HTTPS.

## Health Checks

Use these endpoints differently:

```text
GET /api/health/live
```

Use this for liveness. It returns `200` when the Node process is responsive.

```text
GET /api/health/ready
```

Use this for readiness. It returns `200` only when required dependencies, currently MongoDB, are reachable. A load balancer should stop sending traffic to an instance when this returns `503`.

```text
GET /api/health
```

Use this for human-readable operational status.

## Shared State Requirements

Current local-development defaults are fine for one instance, but production scaling needs shared services:

- **MongoDB Atlas**: primary source of truth for users, sessions, properties, inquiries, viewings, notifications, and moderation records.
- **Refresh sessions**: already stored in MongoDB, so access-token refresh works across instances.
- **Rate limiting and response caching**: backed by a shared store abstraction (`backend/config/redisClient.js`) used by both `backend/middlewares/rateLimiter.js` and `backend/middlewares/responseCache.js`. Set `REDIS_URL` to make rate limits and the public property/mover response cache consistent across instances; if `REDIS_URL` is unset, both fall back to a per-process in-memory store (fine for a single instance, not for multiple). If Redis is configured but briefly unreachable, both middlewares fail open to the in-memory store rather than rejecting requests.
- **Property uploads**: currently local disk under `UPLOAD_DIR`. For multiple instances, move uploaded files to object storage such as S3, Cloudinary, or Azure Blob Storage and store public URLs in MongoDB.
- **Image fingerprinting**: current byte-derived perceptual hashes work as a no-dependency baseline. For stronger duplicate detection, use a real image-processing worker with a library such as Sharp and store perceptual hashes in MongoDB.

## Caching

- `GET /api/properties` and `GET /api/properties/:id` are cached (namespace `properties`, TTL via `PROPERTIES_CACHE_TTL_MS`, default 30s) and invalidated immediately on any property create/update/delete or image add/remove.
- `GET /api/movers` is cached (namespace `movers`, TTL via `MOVERS_CACHE_TTL_MS`, default 60s). There is no mover write endpoint, so no invalidation hook is needed.
- `GET /api/feedback/public` is cached (namespace `feedbackPublic`, TTL via `FEEDBACK_PUBLIC_CACHE_TTL_MS`, default 30s) and invalidated immediately when an admin responds to a feedback submission.
- Only fully anonymous, non-personalized GET endpoints are cached — protected/user-scoped endpoints such as `GET /api/properties/mine` are never cached.
- `/uploads/*` is served with `Cache-Control: public, max-age=31536000, immutable`, since uploaded image filenames embed a unique Mongo ObjectId and are never reused for different content.
- The frontend (`frontend/app-utils/`) keeps a short-lived (15s) in-memory cache (`client.js`'s `getCached`/`setCached`) for `fetchProperties`/`fetchFavorites` to avoid redundant refetches on remount, clearing the favorites cache on save/remove and the entire cache on login/logout/register/account deletion.

## Logging

- `backend/utils/logger.js` writes daily-rotated files under `LOG_DIR` (default `backend/logs/`): `access-YYYY-MM-DD.log` (Morgan combined format, one line per request) and `app-YYYY-MM-DD.log` (connection/cache/rate-limit warnings and 5xx errors with stack traces). Console output is unchanged; the file writes are additive.
- Log files are local disk, per-instance, and not centralized. On a container platform, either mount `LOG_DIR` to persistent/shared storage or, preferably, ship stdout/stderr (which still receive everything) to your platform's log aggregator instead of relying on the local files across multiple instances.
- File logging is disabled entirely when `NODE_ENV=test` so the test suite stays hermetic.

## Load Balancer Strategy

- No sticky sessions are required for JWT access tokens.
- Refresh-token sessions are stored in MongoDB, so refresh requests can reach any instance.
- Web and mobile clients should retry safe `GET` requests after transient `502`, `503`, or timeout failures.
- Keep upload payload size limits consistent between the load balancer and `MAX_UPLOAD_BYTES`.

## Deployment Notes

Recommended production environment variables:

```text
NODE_ENV=production
DB_REQUIRED=true
TRUST_PROXY=true
AUTH_COOKIE_SECURE=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=500
AUTH_RATE_LIMIT_MAX=50
REDIS_URL=redis://user:password@host:6379
PROPERTIES_CACHE_TTL_MS=30000
MOVERS_CACHE_TTL_MS=60000
LOG_DIR=/var/log/kejaapp
```

For container platforms, configure:

- Liveness probe: `GET /api/health/live`
- Readiness probe: `GET /api/health/ready`
- Graceful termination: send `SIGTERM` and allow the process to finish in-flight requests before force-killing it.

## Production Upgrade Checklist

- Set `REDIS_URL` so rate limiting and response caching are consistent across instances instead of per-process.
- Replace local upload storage with object storage.
- Put CDN caching in front of uploaded image assets (in addition to the `Cache-Control` headers already set on `/uploads`).
- Run at least two API instances across separate availability zones where possible.
- Ship the local log files (or stdout/stderr) to a centralized log aggregator, and add metrics for request latency, status codes, MongoDB connection state, and rate-limit rejections.
- Add queue-backed workers for expensive image hashing if upload traffic grows.
