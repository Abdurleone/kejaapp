# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Three independent Node packages (no npm workspaces — each has its own `node_modules`, install separately), plus docs/deployment assets:

- `backend/` — Express + MongoDB API
- `frontend/` — Vite + React web SPA
- `mobile/` — Expo + React Native app
- `docs/` — `compliance/` (legal/privacy/security), `dev/` (engineering reference), `project/` (CHANGELOG.md, Roadmap.md, live.md — status tracking)
- `k8s/` — Kubernetes manifests (reference/alternative deploy path, not currently live)
- `render.yaml` — the actual production Blueprint (Render, not k8s)

The GitHub Wiki (not in this repo) is the canonical deep reference — API reference, per-role user stories, architecture, governance/policy docs, user manuals. `docs/project/CHANGELOG.md`/`Roadmap.md`/`live.md` are mirrored there; when editing those three files, mirror the same edit into the wiki clone (it's a separate git repo, `<name>.wiki.git`, pushed directly with no PR flow).

## Commands

Install (no root-level install — each package is separate):
```bash
npm --prefix backend install
npm --prefix frontend install
npm --prefix mobile install
```

Dev servers (also available as `npm run dev` / `npm run frontend` / `npm run mobile` from the repo root):
```bash
npm --prefix backend run dev     # nodemon
npm --prefix frontend run dev    # vite
npm --prefix mobile run start    # expo start
```

Lint (also `npm run lint` from root, which runs all three):
```bash
npm --prefix backend run lint    # eslint .
npm --prefix frontend run lint   # eslint .
npm --prefix mobile run lint     # expo lint
```

Test (also `npm run test:backend` / `test:frontend` / `test:mobile` / `npm test` from root):
```bash
npm --prefix backend run test    # node --test
npm --prefix frontend run test   # node --test (plain *.test.js) then vitest run (*.render.test.jsx)
npm --prefix mobile run test     # jest
```

Running a single test:
```bash
# backend — plain node:test
node --test tests/path/to/file.test.js
node --test --test-name-pattern="some test name"

# frontend — two runners depending on the file
node --test tests/some-file.test.js               # plain node:test files
npx vitest run tests/some-file.render.test.jsx     # *.render.test.jsx (jsdom + @testing-library/react)

# mobile
npx jest path/to/file.test.js
```

Seed local demo data: `npm --prefix backend run seed` (see `docs/project/demo-credentials.md` for the seeded accounts/shared password).

Backend integration tests under `backend/tests/integration/` (real MongoDB, not mocked) are skipped unless `TEST_MONGODB_URI` is set — check that a fix actually needs one before assuming an integration test ran.

## Architecture

### Backend (`backend/`)

Layering: `routes/` → `middlewares/` (auth, CSRF, validation, rate limiting) → `controllers/` → `services/`/`models/` (Mongoose). `validators/` define Joi-style schemas consumed by `middlewares/validateRequest.js`. `jobs/` are scheduled tasks (stale-listing flags, inquiry/viewing nudges, review prompts, Expo push receipt polling) run via `npm run jobs`, separate from the request-serving process. `constants/rbac.js` defines the five roles (`tenant`, `landlord`, `agency`, `mover`, `admin`) and role groups used throughout for access checks.

**Auth**: JWT in httpOnly cookies (`keja_token`/`keja_refresh`, configurable via `AUTH_COOKIE_NAME`/`REFRESH_COOKIE_NAME`), double-submit CSRF via a separate readable cookie (`keja_csrf`) + `X-CSRF-Token` header, enforced by `middlewares/csrfProtection.js` whenever an auth cookie is present. Google Sign-In is a parallel path (`POST /api/auth/google`) that links to an existing password account by email if one exists, otherwise creates a new account with `roleConfirmed: false` (forces the role-picker before anything else). `User.password`/`User.googleId` are both `select: false` in the schema — any `.select()` that fetches one for a `.save()` involving the other's conditional-required logic must select both, or Mongoose validates against stale/missing data (a real bug fixed once already — see CHANGELOG.md's Google-only-account entry for the failure mode).

**"Empty = disabled" convention**: several integrations are optional and degrade gracefully rather than crashing when unconfigured — `REDIS_URL` (falls back to in-memory rate limiting/caching), `CLAMAV_HOST` (skips malware scanning), `GOOGLE_CLIENT_ID` (Google Sign-In 503s), `SENTRY_DSN` (no-op), `VAPID_*` (web push disabled), `MPESA_*` (M-Pesa support payments disabled). `STORAGE_DRIVER` is the exception with teeth: switching it to `s3` makes the `S3_*` group genuinely required, validated at startup (`config/env.js`) rather than failing on first upload. Any new optional integration should follow this same pattern, not add a new one.

**Storage**: `services/storageDrivers/` abstracts local disk vs. S3-compatible object storage behind one interface (`services/fileStorageService.js`), selected by `STORAGE_DRIVER`.

**Notifications**: `services/notificationService.js` is the single choke point that fans out to in-app notifications, web push (`pushNotificationService.js`, VAPID), and mobile push (Expo) via `Promise.allSettled`, so one channel failing never blocks another.

**Payment Boundary — a permanent product invariant, not a TODO**: kejaapp never holds, routes, or takes a cut of money between tenants/landlords/agencies/movers; those transactions are always direct and off-platform. The one M-Pesa integration that exists (`services/mpesaService.js`, `/api/support-payments`) is a voluntary service charge paid directly to the app's own developer/shortcode — unrelated to any inter-user transaction. Don't build a payment feature that routes money between two other roles; that's explicitly out of scope, not an oversight.

### Frontend (`frontend/`)

No React Router — client-side routing is hand-rolled in `app-utils/access.js` (`resolveViewFromPath`/`getViewPath`, a path↔view-name map) plus a big `switch` in `App.jsx`'s `renderCurrentPage()`, driven by `window.history.pushState`/`popstate`. `canAccessView(role, view)` in the same file is the single gate for role-based access — check it before adding a new view rather than duplicating the logic inline. `app-utils/` (not under `src/`) is the shared API-client/formatting layer imported by both `src/` and the test suite.

Two test runners, split by file suffix (see `vitest.config.js`'s own comment): plain `*.test.js` files run under `node --test`; `*.render.test.jsx` files (anything mounting a React component) run under Vitest + jsdom + `@testing-library/react`. Don't rename a file across that suffix boundary without also moving its assertions to match the runner's syntax.

### Mobile (`mobile/`)

Expo + React Navigation (`RootNavigator.js` → role-aware tab/stack structure in `navigation/`) — not Expo Router. Mirrors the web app's role/view model but as its own native navigation tree, not shared code with `frontend/`.

**Expo moves fast — `mobile/AGENTS.md` (included via `mobile/CLAUDE.md`) requires checking the exact versioned docs at `https://docs.expo.dev/versions/v57.0.0/` before writing any Expo-related code.** Don't rely on general React Native knowledge or an assumed API shape for Expo modules; if `mobile/package.json`'s `expo` version has moved past SDK 57, use the docs URL for whatever version is actually installed.

### Deployment

Production is a **single** Render web service (Docker, `backend/Dockerfile.render`) — the frontend is built and copied into the backend image as static files, served by `backend/app.js` (`express.static` + an SPA catch-all) so the web app and its API are genuinely same-origin. `docker-compose.yml` and `k8s/` still model this as two separate origins/services — they're a different, unconverted deployment path, not out of sync by accident. `render.yaml`'s `sync: false` env vars are dashboard-only secrets that live only in Render's UI, never in git; a recreated/fresh service instance starts with none of them set (this has caused real outages — check this first if production is failing in a way local dev isn't).
