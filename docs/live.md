# What's Live

A snapshot of what's actually deployed and working right now, separate from [CHANGELOG.md](../CHANGELOG.md) (full history) and [Roadmap.md](Roadmap.md) (shipped/next at a feature level). This page answers one question: **if someone opens the app right now, what do they get, and what's still missing?** Last updated 2026-08-10.

## Live URL

- `https://kejaapp-backend-7iu3.onrender.com` — one URL for both the web app and its API now (the `-7iu3` suffix is real and permanent — the unsuffixed name was already taken by another Render account). There used to be a separate `kejaapp-frontend.onrender.com` static site; it's retired, not renamed — see CHANGELOG.md's "Consolidate Web + API onto One Render Origin" entry for why (closing out a cross-origin CSRF cookie problem at the source).
- Still on Render's default `*.onrender.com` subdomain — no custom domain is wired up yet.

## Infrastructure

| Piece | Status |
|---|---|
| Backend + frontend (one Render web service, Docker, built from `backend/Dockerfile.render`) | Live, free plan |
| Redis (Render managed Key Value) | Live, free plan — rate limiting/caching |
| MongoDB | Atlas cluster (external to Render, not on a free Render product) |
| Object storage (property images) | Backblaze B2, S3-compatible, free tier |
| Malware scanning (ClamAV) | **Not deployed** — needs more RAM than the free plan allows; uploads skip scanning rather than erroring (`STORAGE_DRIVER`'s "empty = disabled" convention) |
| CI (GitHub Actions) | Enabled, but every job fails immediately — an account-level GitHub billing lock, not a code issue. No automated CI actually runs right now. |
| Kubernetes (`k8s/`) | Reference/alternative path only — not deployed anywhere, kept honest by CI's `k8s-smoke-test` job whenever CI runs. Still genuinely two-origin (frontend/backend as separate Services) — the Render consolidation above doesn't apply here. |

Known free-tier tradeoffs: the web service spins down after 15 minutes idle (cold start on the next request); single backend instance (no horizontal scaling).

## Authentication

| Method | Web | Mobile | Backend |
|---|---|---|---|
| Email/username + password | ✅ Live | ✅ Live | ✅ Live |
| Google Sign-In | ✅ Live, verified in production | ⏸️ Paused | ✅ Live, verified in production |

Google Sign-In's backend (`POST /api/auth/google`) and web button both went live and were verified directly against the production site: the endpoint correctly moved from a 503 ("not configured") to a real 401 ("Invalid Google credential") once `GOOGLE_CLIENT_ID` was set, and the web button correctly went from absent to Google's own rendered widget once `VITE_GOOGLE_CLIENT_ID` was set — both confirmed with a real headless-browser pass against the live site, not just local tests.

Mobile is paused because `expo-auth-session`'s Google provider needs separate iOS and Android OAuth client IDs (not just the Web one reused for backend/frontend), and getting Android's SHA-1 fingerprint requires the account owner's own EAS login — not something doable on their behalf. See [Authentication.md](Authentication.md) for the exact resume steps.

## Theme

System/Light/Dark on both web and mobile — System (OS-preference-following, live-updating) is the default for new installs; a manual choice still overrides and persists.

## What's pending

- **Confirm the Render consolidation live**: verified locally (Docker build + a real browser against the built image — login, a real mutation, direct navigation to a client route, all working), but not yet confirmed against the actual Render deploy. Sign in, save a listing, and refresh on a deep link (e.g. `/discover`) once this ships.
- **Mobile Google Sign-In**: register iOS (`com.kejaapp.mobile`, no cert needed) and Android (`com.kejaapp.mobile` + SHA-1 from `eas credentials`) OAuth client IDs in Google Cloud Console, then set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Needs the account owner's own EAS login first.
- **CI billing lock**: GitHub Actions is enabled but every job fails with "your account is locked due to a billing issue" — needs clearing at [github.com/settings/billing](https://github.com/settings/billing).
- **Custom domain**: still on default `*.onrender.com` subdomains.
- **Mobile iOS verification**: only ever verified on a real Android emulator; iOS device/simulator testing is still outstanding.
- **`eslint`/`jest` version pinning**: both `frontend/` and `mobile/` are deliberately held back a major version (peer-dependency incompatibilities) — revisit once `eslint-config-expo`/`jest-expo`/`eslint-plugin-react` catch up.

See [Roadmap.md](Roadmap.md)'s "Next" section for the full, evolving list — this page just calls out the ones with the most immediate user-facing or operational impact.
