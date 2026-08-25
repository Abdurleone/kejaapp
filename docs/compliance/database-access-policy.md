# KejaApp — Database Access Policy

## 1. Purpose and scope

This documents how access to KejaApp's database (MongoDB) is actually controlled today — at the connection level and at the application level — and where the real gaps are. It's the technical counterpart to the [Data Protection Policy](data-protection-policy.md) (which covers *what* personal data is collected and *why*, for a legal/privacy audience) and the [Records Retention & Protection Policy](records-retention-and-protection-policy.md) (which covers operational records specifically). This one is for anyone changing backend code, provisioning a new deployment, or reviewing whether a specific piece of data is actually protected the way it's assumed to be.

Written to address ISO/IEC 27001:2022 controls **5.15 (Access control)** and **8.3 (Information access restriction)** in the [Statement of Applicability](iso27001-statement-of-applicability.md), and cross-referenced from there.

**A note on terminology**: this is sometimes requested as "Row-Level Security" (RLS), which is a specific Postgres/SQL-engine feature (`CREATE POLICY`, enforced by the database engine itself on every query, for clients that connect to the database directly). KejaApp uses MongoDB via Mongoose from a single trusted Express backend — no client (web, mobile, or otherwise) ever holds a database credential or talks to MongoDB directly, so there is no database-engine-level policy layer to write. The equivalent protection here is enforced in application code, described in [Section 4](#4-application-layer-access-control-the-rls-equivalent) below.

## 2. Who can reach the database at all

- **Application backend only.** `backend/config/db.js` is the single place `MONGODB_URI` is read and connected from. No other part of the system (web frontend, mobile app, admin tooling) is ever given a database credential.
- **Connection security**: Atlas connections use `mongodb+srv://` (TLS-encrypted in transit) with SCRAM authentication — the username/password embedded in `MONGODB_URI` (`sync: false` in `render.yaml`, never committed — see `backend/.env.example`).
- **Network access**: whoever provisions a deployment is responsible for Atlas's own Network Access (IP allowlist) — see [`docs/dev/Troubleshooting.md`](../dev/Troubleshooting.md). This isn't something the application code can enforce.
- **Local/self-hosted MongoDB** (`docker-compose.yml`): the `mongo` service's port is bound to `127.0.0.1` only (fixed as part of the security audit below — previously published with no host IP prefix, meaning it was reachable from the internet on any host with a public IP and no firewall). The container itself still has no authentication configured (`MONGO_INITDB_ROOT_USERNAME`/`_PASSWORD` unset) — acceptable for local development where the loopback binding is the actual boundary, not appropriate for a real deployment without adding auth.

## 3. Data classification

Reusing the [Data Protection Policy §3](data-protection-policy.md#3-data-we-collect) categories, with the access-control-relevant distinction added:

| Category | Examples | Extra protection |
|---|---|---|
| Credentials | `password` (bcrypt hash), `googleId` | `select: false` on both fields in `User.js` — excluded from every query by default; only explicitly re-included (`.select("+password")`) on the exact login/change-password code paths that need to compare it. |
| Session secrets | Refresh token hashes (`AuthSession.tokenHash`) | Only the SHA-256 hash is stored, never the raw token — see `backend/utils/tokens.js`. |
| PII | Name, email, phone, device location | No field-level restriction beyond role/ownership scoping (Section 4) — a user's own PII is visible to that user and to roles with a legitimate reason to see it (e.g. a landlord sees an inquiring tenant's contact details). |
| Public data | Property listings, mover profiles, public feedback/testimonials | Deliberately unrestricted — served to anonymous, unauthenticated visitors by design. |

## 4. Application-layer access control (the "RLS equivalent")

Every request that reaches a Mongoose query passes through two layers, both enforced in `backend/middlewares/authMiddleware.js` and each controller:

1. **Authentication** (`protect`): resolves the JWT (from the `Authorization: Bearer` header or the httpOnly session cookie — see [`docs/dev/Authentication.md`](../dev/Authentication.md)) to a real, active `User` document, attached as `req.user`. An inactive/suspended account (`accountStatus !== "active"`) is rejected here, on every request, not just at login.
2. **Authorization**, two forms, both used depending on the endpoint:
   - **Role-based** (`authorize(...roles)` / `authorizeGroup(group)`): gates an entire route to specific roles (e.g. admin-only moderation endpoints, tenant-only favorites).
   - **Ownership-scoped queries**: the actual "which documents can this specific user see/touch" boundary. Every list/detail/mutation endpoint that isn't meant to be public filters by the requester's own identity directly in the query — e.g. `Property.find({ owner: req.user._id })` for "my properties", `GET /api/inquiries/received` filtering by the receiving owner's `_id`, `Favorite`/`SavedSearch` always scoped to `req.user._id`. This is the mechanism that plays the role Postgres RLS policies would play — it's just written as an explicit `find()` filter in each controller rather than a database-engine policy, because the only thing that can ever query the database is this same trusted backend code.

This model was independently verified during a full-codebase security audit (backend auth/authz reviewed specifically for IDOR — one user reaching another's resource by guessing an ID): every ownership-sensitive controller checked (Property, Inquiry, ViewingRequest, MoverRequest, Review, Favorite, SavedSearch, Notification) was found to correctly scope by `req.user._id`/`owner`/`requester` — no IDOR was found. Three real, unrelated data-exposure gaps *were* found and fixed in that same audit, worth noting here since they were specifically about data reaching further than intended:
- **NoSQL operator injection** in public property search (`type`/`listedBy`/`viewingType` read unvalidated from `req.query`) — fixed by validating against schema enums (`backend/utils/propertyFilters.js`).
- **Unauthenticated health endpoints** leaking the live Mongo hostname/db name and raw driver error text — fixed with a redaction helper (`backend/controllers/healthController.js`).
- **`docker-compose.yml`'s MongoDB publicly reachable** — see [Section 2](#2-who-can-reach-the-database-at-all) above.

See `docs/project/Roadmap.md`'s Completed section for the full detail on all of these.

## 5. Database user privilege (Atlas)

**Not verified as part of this document** — this requires checking the actual Atlas project's Database Access tab, which needs the account owner's own Atlas login, not something checkable from the codebase alone. The recommended state (principle of least privilege) is a database user scoped to `readWrite` on the `kejaapp` database specifically, not an Atlas project owner/admin-level user reused for the application connection. If the current user is broader than that, narrowing it is a low-effort, high-value follow-up — see [Section 7](#7-known-gaps).

## 6. Backups and recovery

**A manual, human-triggered backup/restore procedure exists** (`npm run backup`/`npm run restore`, `backend/scripts/`) — dumps every collection to gzip-compressed EJSON and uploads it to a separate, private S3-compatible bucket (deliberately not the public-read property-image bucket). One real restore drill has been performed against a scratch MongoDB instance and verified byte-for-byte, including BSON type fidelity. Tracked as ISO/IEC 27001 control **8.13** in the [Statement of Applicability](iso27001-statement-of-applicability.md#7-remediation-roadmap) - the remaining gap is automation (no scheduler wired up yet), not the existence of a procedure at all. Not duplicated in full here — the SoA is the canonical tracker for this gap.

## 7. Known gaps

Documented honestly, matching this project's convention of not overstating a control:

- **Atlas database user privilege is unverified** (Section 5) — needs a one-time check by whoever holds Atlas access.
- **Backups are manual, not automated** (Section 6) — a real procedure exists and has been drilled, but nothing runs it on a schedule yet; tracked in the SoA.
- **No field-level encryption at rest beyond Atlas's own default encryption** — sensitive fields (`password`, `googleId`) are protected by application-layer exclusion (`select: false`) and, for `password`, one-way hashing — not by client-side/CSFLE-style encryption. Anyone with direct database access (an Atlas admin, or someone holding the connection string) can still read PII fields in plaintext if they deliberately query for them.
- **No database-level audit logging enabled.** Access-pattern auditing today relies entirely on the application's own HTTP access logs (`backend/logs/`), not a database-level audit trail of every query. Atlas offers database auditing on paid tiers; not currently enabled.
- **Local/self-hosted MongoDB (`docker-compose.yml`) has no authentication.** Acceptable given the loopback-only binding for local dev; would need real auth added before any non-local use.

## 8. Review

This policy should be revisited whenever a new collection with different access-control needs is introduced, whenever a new role is added to the RBAC model (`backend/constants/rbac.js`), and at minimum whenever the [Statement of Applicability](iso27001-statement-of-applicability.md) is reviewed. Maintained in `docs/compliance/database-access-policy.md`.

## 9. Scope and limitations

This is an engineering-team-authored policy reflecting KejaApp's actual current implementation and its honestly-acknowledged gaps — not a substitute for a formal database security audit, a penetration test, or legal advice on data-handling obligations for a specific operating entity or jurisdiction.
