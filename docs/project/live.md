# What's Live

A snapshot of what's actually deployed and working right now, separate from [CHANGELOG.md](CHANGELOG.md) (full history) and [Roadmap.md](Roadmap.md) (shipped/next at a feature level). This page answers one question: **if someone opens the app right now, what do they get, and what's still missing?** Last updated 2026-08-11.

## Live URL

- `https://kejaapp-backend-7iu3.onrender.com` — one URL for both the web app and its API now (the `-7iu3` suffix is real and permanent — the unsuffixed name was already taken by another Render account). There used to be a separate `kejaapp-frontend.onrender.com` static site; it's retired, not renamed — see CHANGELOG.md's "Consolidate Web + API onto One Render Origin" entry for why (closing out a cross-origin CSRF cookie problem at the source).
- Still on Render's default `*.onrender.com` subdomain — no custom domain is wired up yet.

## Infrastructure

| Piece | Status |
|---|---|
| Backend + frontend (one Render web service, Docker, built from `backend/Dockerfile.render`) | Live, free plan |
| Redis (Render managed Key Value) | Live, free plan — rate limiting/caching |
| MongoDB | Atlas cluster (external to Render, not on a free Render product) |
| Object storage (property images) | Backblaze B2, S3-compatible, free tier. **Uploads are currently broken in production** - `S3_ENDPOINT` on Render is set to a bare hostname instead of a full URL, so every `POST /images/upload` 500s with an opaque AWS SDK `TypeError: Invalid URL`. Found via a live Playwright run against production; `config/env.js` now validates this at startup instead of failing silently on first use, but the actual value in Render's dashboard still needs correcting - see "What's pending" |
| Malware scanning (ClamAV) | **Not deployed** — needs more RAM than the free plan allows; uploads skip scanning rather than erroring (`STORAGE_DRIVER`'s "empty = disabled" convention) |
| CI (GitHub Actions) | Enabled, but every job fails immediately — an account-level GitHub billing lock, not a code issue. No automated CI actually runs right now. |
| Kubernetes (`k8s/`) | Reference/alternative path only — not deployed anywhere, kept honest by CI's `k8s-smoke-test` job whenever CI runs. Still genuinely two-origin (frontend/backend as separate Services) — the Render consolidation above doesn't apply here. |
| Error tracking (Sentry) | Wired and **verified working locally** on both backend (`backend/instrument.js` + `backend/app.js`, `SENTRY_DSN`) and mobile (`mobile/App.js`, `EXPO_PUBLIC_SENTRY_DSN`) - real test events confirmed landing in both Sentry projects (`200`, not just a successful-looking flush). **Not yet set on Render** or as an EAS secret, so production errors still aren't reported anywhere but local logs |
| Uptime monitoring (UptimeRobot, free tier) | **Live** - two HTTP monitors (5-minute interval, email alert) poll `/api/health/live` and `/api/health/ready` in production; both confirmed `up`. Independent of Sentry - catches a full process crash even before a production `SENTRY_DSN` is ever set, since a dead process can't self-report to Sentry either way |
| Web push notifications | Wired and **verified working locally** (real subscription created against Google's FCM push infrastructure with temporary VAPID keys). **Not yet set on Render** (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` - `web-push`'s "empty = disabled" convention), so the Account page's "Enable notifications" toggle fails with "Web push isn't configured on the server yet." in production. Mobile push (Expo) is unaffected - separate delivery channel |

Known free-tier tradeoffs: the web service spins down after 15 minutes idle (cold start on the next request); single backend instance (no horizontal scaling).

## Authentication

| Method | Web | Mobile | Backend |
|---|---|---|---|
| Email/username + password | ✅ Live | ✅ Live | ✅ Live |
| Google Sign-In | ✅ Live, verified in production | ⏸️ Paused | ✅ Live, verified in production |

Google Sign-In's backend (`POST /api/auth/google`) and web button both went live and were verified directly against the production site: the endpoint correctly moved from a 503 ("not configured") to a real 401 ("Invalid Google credential") once `GOOGLE_CLIENT_ID` was set, and the web button correctly went from absent to Google's own rendered widget once `VITE_GOOGLE_CLIENT_ID` was set — both confirmed with a real headless-browser pass against the live site, not just local tests.

Mobile is paused because `expo-auth-session`'s Google provider needs separate iOS and Android OAuth client IDs (not just the Web one reused for backend/frontend), and getting Android's SHA-1 fingerprint requires the account owner's own EAS login — not something doable on their behalf. See [Authentication.md](../dev/Authentication.md) for the exact resume steps.

## Theme

System/Light/Dark on both web and mobile — System (OS-preference-following, live-updating) is the default for new installs; a manual choice still overrides and persists.

## What's pending

- **Production image uploads are broken (`S3_ENDPOINT` misconfigured)**: `kejaapp-backend`'s `S3_ENDPOINT` on Render is a bare hostname, not a full URL - every property-image upload 500s. Set it to the full Backblaze B2 endpoint URL (`https://s3.<region>.backblazeb2.com`, from the B2 bucket's own details page) in Render's dashboard and redeploy. Worth double-checking the B2 application key itself is still valid/unrevoked while there, especially since this project has had one credential incident already this cycle (see `CHANGELOG.md`). This is the highest-priority item on this list - everything else here is a missing optional feature, this one actively breaks a core flow.
- **Sentry DSNs on Render/EAS**: both DSNs are confirmed working end-to-end locally (real events verified landing in each Sentry project - `200` responses, not just an SDK-reported successful flush, which turned out to be misleading on its own during setup). Still need `SENTRY_DSN` set on **kejaapp-backend** in Render, and `EXPO_PUBLIC_SENTRY_DSN` as an EAS secret for real mobile builds, before production errors actually reach Sentry. Mobile production builds will also need a `SENTRY_AUTH_TOKEN` EAS secret for source-map upload (not needed for Expo Go dev testing, already set locally).
- **VAPID keys for web push on Render**: confirmed working end-to-end locally (a real subscription against Google's FCM push infrastructure), but no real key pair is set on **kejaapp-backend** yet - `render.yaml` now declares `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` as blueprint vars (so Render's dashboard prompts for them), but they still need generating (`npx web-push generate-vapid-keys`) and setting. Until then, the Account page's "Enable notifications" toggle fails cleanly with a "not configured on the server yet" message rather than crashing - confirmed via a live Playwright run against production.
- **Mobile Google Sign-In**: register iOS (`com.kejaapp.mobile`, no cert needed) and Android (`com.kejaapp.mobile` + SHA-1 from `eas credentials`) OAuth client IDs in Google Cloud Console, then set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Needs the account owner's own EAS login first.
- **CI billing lock**: GitHub Actions is enabled but every job fails with "your account is locked due to a billing issue" — needs clearing at [github.com/settings/billing](https://github.com/settings/billing).
- **Custom domain**: still on default `*.onrender.com` subdomains.
- **Mobile iOS verification**: only ever verified on a real Android emulator; iOS device/simulator testing is still outstanding.
- **`eslint`/`jest` version pinning**: both `frontend/` and `mobile/` are deliberately held back a major version (peer-dependency incompatibilities) — revisit once `eslint-config-expo`/`jest-expo`/`eslint-plugin-react` catch up.

See [Roadmap.md](Roadmap.md)'s "Next" section for the full, evolving list — this page just calls out the ones with the most immediate user-facing or operational impact.
