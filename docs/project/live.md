# What's Live

A snapshot of what's actually deployed and working right now, separate from [CHANGELOG.md](CHANGELOG.md) (full history) and [Roadmap.md](Roadmap.md) (shipped/next at a feature level). This page answers one question: **if someone opens the app right now, what do they get, and what's still missing?** Last updated 2026-08-18.

## Live URL

- **Still `https://kejaapp-backend-7iu3.onrender.com` for now** — the actual Render service hasn't been renamed yet as part of the JakezApp rebrand (see CHANGELOG.md's rebrand entry and Roadmap.md's Next section for why that's a deliberate, not-yet-done manual step: `render.yaml` already describes a `jakezapp-backend` service, but deploying it before the real Render service is renamed to match would desync the config from what's actually running). One URL for both the web app and its API. There used to be a separate `kejaapp-frontend.onrender.com` static site; it's retired, not renamed — see CHANGELOG.md's "Consolidate Web + API onto One Render Origin" entry for why (closing out a cross-origin CSRF cookie problem at the source).
- Still on Render's default `*.onrender.com` subdomain — no custom domain is wired up yet.

## Infrastructure

| Piece | Status |
|---|---|
| Backend + frontend (one Render web service, Docker, built from `backend/Dockerfile.render`) | Live, free plan |
| Redis (Render managed Key Value) | Live, free plan — rate limiting/caching |
| MongoDB | Atlas cluster (external to Render, not on a free Render product) |
| Object storage (property images) | Backblaze B2, S3-compatible, free tier. **Live and verified** — found broken via a live Playwright run against production (`S3_ENDPOINT`, then `S3_PUBLIC_BASE_URL`, were both bare hostnames instead of full URLs), fixed in both Render's dashboard and in code (`config/env.js` now validates both are well-formed URLs at startup, so a bad value crashes at boot with a clear message instead of failing opaquely on first use). Confirmed working end-to-end afterward with a real file upload through the production UI |
| Malware scanning (ClamAV) | **Not deployed** — needs more RAM than the free plan allows; uploads skip scanning rather than erroring (`STORAGE_DRIVER`'s "empty = disabled" convention) |
| CI (GitHub Actions) | Enabled, but every job fails immediately — an account-level GitHub billing lock, not a code issue. No automated CI actually runs right now. |
| Kubernetes (`k8s/`) | Reference/alternative path only — not deployed anywhere, kept honest by CI's `k8s-smoke-test` job whenever CI runs. Still genuinely two-origin (frontend/backend as separate Services) — the Render consolidation above doesn't apply here. |
| Error tracking (Sentry) | Wired and **verified working locally** on both backend (`backend/instrument.js` + `backend/app.js`, `SENTRY_DSN`) and mobile (`mobile/App.js`, `EXPO_PUBLIC_SENTRY_DSN`) - real test events confirmed landing in both Sentry projects (`200`, not just a successful-looking flush). **Not yet set on Render** or as an EAS secret, so production errors still aren't reported anywhere but local logs |
| Uptime monitoring (UptimeRobot, free tier) | **Live** - two HTTP monitors (5-minute interval, email alert) poll `/api/health/live` and `/api/health/ready` in production; both confirmed `up`. Independent of Sentry - catches a full process crash even before a production `SENTRY_DSN` is ever set, since a dead process can't self-report to Sentry either way |
| Web push notifications | Wired and **verified working locally** (real subscription created against Google's FCM push infrastructure with temporary VAPID keys). **Not yet set on Render** (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` - `web-push`'s "empty = disabled" convention), so the Account page's "Enable notifications" toggle fails with "Web push isn't configured on the server yet." in production. Mobile push (Expo) is unaffected - separate delivery channel |
| Support JakezApp (voluntary M-Pesa) | Wired and **verified locally against the "not configured" state** (no real Daraja credentials exist in this dev environment). **Not yet set on Render** (`MPESA_CONSUMER_KEY`/`MPESA_CONSUMER_SECRET`/`MPESA_SHORTCODE`/`MPESA_PASSKEY`/`MPESA_CALLBACK_URL` - same "empty = disabled" convention), so `/support`'s "Pay via M-Pesa" fails cleanly with "M-Pesa support payments are not configured" in production. Unrelated to any tenant/landlord/agency/mover payment - see [Payment Boundary](../../README.md#payment-boundary) |

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

- **Rename the live Render service to match the JakezApp rebrand — do this before deploying anything from this branch**: the running service is still `kejaapp-backend-7iu3`; `render.yaml` now describes `jakezapp-backend`. Rename it in Render's dashboard (Settings → Name), confirm the resulting URL, then update `render.yaml`'s `CORS_ORIGIN`/`VITE_API_BASE_URL` and this page's Live URL section to match before deploying — deploying first would desync the config from the actually-running service. Every "jakezapp-backend" mention below is the target name, not yet the real one. `MONGODB_DB_NAME` needs no change either way — it deliberately still points at the existing `kejaapp` Atlas database (see CHANGELOG.md's rebrand entry for why renaming it would have orphaned real production data).
- **Sentry DSNs on Render/EAS**: both DSNs are confirmed working end-to-end locally (real events verified landing in each Sentry project - `200` responses, not just an SDK-reported successful flush, which turned out to be misleading on its own during setup). Still need `SENTRY_DSN` set on **jakezapp-backend** in Render, and `EXPO_PUBLIC_SENTRY_DSN` as an EAS secret for real mobile builds, before production errors actually reach Sentry. Mobile production builds will also need a `SENTRY_AUTH_TOKEN` EAS secret for source-map upload (not needed for Expo Go dev testing, already set locally).
- **VAPID keys for web push on Render**: confirmed working end-to-end locally (a real subscription against Google's FCM push infrastructure), but no real key pair is set on **jakezapp-backend** yet - `render.yaml` now declares `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` as blueprint vars (so Render's dashboard prompts for them), but they still need generating (`npx web-push generate-vapid-keys`) and setting. Until then, the Account page's "Enable notifications" toggle fails cleanly with a "not configured on the server yet" message rather than crashing - confirmed via a live Playwright run against production.
- **Daraja credentials for Support JakezApp on Render**: code is built, tested, and locally verified against the "not configured" state - `render.yaml` declares all five `MPESA_*` vars as blueprint vars from the start (unlike VAPID above, this one didn't ship the gap first). The account owner already has a paybill/till; setting the real values in Render's dashboard is what's left. See `docs/dev/Payments.md`.
- **Mobile Google Sign-In**: register iOS (`com.jakezapp.mobile`, no cert needed) and Android (`com.jakezapp.mobile` + SHA-1 from `eas credentials`) OAuth client IDs in Google Cloud Console, then set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Needs the account owner's own EAS login first.
- **CI billing lock**: GitHub Actions is enabled but every job fails with "your account is locked due to a billing issue" — needs clearing at [github.com/settings/billing](https://github.com/settings/billing).
- **Custom domain**: still on default `*.onrender.com` subdomains.
- **Mobile iOS verification**: only ever verified on a real Android emulator; iOS device/simulator testing is still outstanding.
- **`eslint`/`jest` version pinning**: both `frontend/` and `mobile/` are deliberately held back a major version (peer-dependency incompatibilities) — revisit once `eslint-config-expo`/`jest-expo`/`eslint-plugin-react` catch up.

See [Roadmap.md](Roadmap.md)'s "Next" section for the full, evolving list — this page just calls out the ones with the most immediate user-facing or operational impact.
