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
- **Rate limiting**: currently in memory. For multiple instances, move counters to Redis or another shared low-latency store so limits apply globally.
- **Property uploads**: currently local disk under `UPLOAD_DIR`. For multiple instances, move uploaded files to object storage such as S3, Cloudinary, or Azure Blob Storage and store public URLs in MongoDB.
- **Image fingerprinting**: current byte-derived perceptual hashes work as a no-dependency baseline. For stronger duplicate detection, use a real image-processing worker with a library such as Sharp and store perceptual hashes in MongoDB.

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
```

For container platforms, configure:

- Liveness probe: `GET /api/health/live`
- Readiness probe: `GET /api/health/ready`
- Graceful termination: send `SIGTERM` and allow the process to finish in-flight requests before force-killing it.

## Production Upgrade Checklist

- Replace in-memory rate limiting with Redis-backed counters.
- Replace local upload storage with object storage.
- Put CDN caching in front of uploaded image assets.
- Run at least two API instances across separate availability zones where possible.
- Add centralized logs and metrics for request latency, status codes, MongoDB connection state, and rate-limit rejections.
- Add queue-backed workers for expensive image hashing if upload traffic grows.
