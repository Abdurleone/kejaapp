# What's Live

A snapshot of what's actually deployed and working right now, separate from [CHANGELOG.md](CHANGELOG.md) (full history) and [Roadmap.md](Roadmap.md) (shipped/next at a feature level). This page answers one question: **if someone opens the app right now, what do they get, and what's still missing?** Last updated 2026-08-22.

**Recovered from a production outage since the last update**: `kejaapp-backend` briefly went fully down (crash-looping on a missing `MONGODB_URI` - a Render dashboard-only secret this service instance didn't have set). Confirmed fixed: `/api/health` now reports `database.status: "connected"`, and a full real-browser pass against the live URL confirms the app works end-to-end again. See `Roadmap.md`'s Completed section for the full incident writeup.

**The Google-only-account login fix (PR #276) is now confirmed live**, after a day's delay from an unrelated Render/Google Cloud platform outage. Chasing it further turned up two more real gaps (missing `VITE_GOOGLE_CLIENT_ID`, then a Google Cloud Console `origin_mismatch`), both fixed - and now a third, genuinely code-level bug (Google's rendered button hanging on `gsi/transform` in current Chrome). See "What's pending" below - that one's a fresh commit, not yet deployed.

## Live URL

- `https://kejaapp-backend-7iu3.onrender.com` — one URL for both the web app and its API now (the `-7iu3` suffix is real and permanent — the unsuffixed name was already taken by another Render account). The web app used to be served from a separate `kejaapp-frontend.onrender.com` static site before the two origins were consolidated — see CHANGELOG.md's "Consolidate Web + API onto One Render Origin" entry for why (closing out a cross-origin CSRF cookie problem at the source). **Correction**: this page previously said that old service was retired/deleted; re-checked while updating this page and it's still live on Render (`kejaapp-frontend.onrender.com` still resolves and responds `200`) - just unused, not actually torn down. Not urgent, but worth a deliberate delete-or-keep decision rather than leaving stray infrastructure running - see What's pending.
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
| Web push notifications | **Live in production** - `GET /api/push-subscriptions/vapid-public-key` confirmed returning a real key against the live URL, meaning `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` are now set on Render. Mobile push (Expo) is unaffected either way - separate delivery channel |
| Support KejaApp (voluntary M-Pesa) | Wired and **verified locally against the "not configured" state** (no real Daraja credentials exist in this dev environment). **Not yet set on Render** (`MPESA_CONSUMER_KEY`/`MPESA_CONSUMER_SECRET`/`MPESA_SHORTCODE`/`MPESA_PASSKEY`/`MPESA_CALLBACK_URL` - same "empty = disabled" convention), so `/support`'s "Pay via M-Pesa" fails cleanly with "M-Pesa support payments are not configured" in production. Unrelated to any tenant/landlord/agency/mover payment - see [Payment Boundary](../../README.md#payment-boundary) |

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

- **Google Sign-In FedCM fix - resume here first**: with the login fix confirmed live (below) and `VITE_GOOGLE_CLIENT_ID`/the Google Cloud Console origin both set, clicking the Google button opened a real popup that hung on a blank `accounts.google.com/gsi/transform` page. Root cause confirmed against Google's current docs: `use_fedcm_for_button` (the rendered-button flow) defaults to `false` and Chrome's legacy fallback no longer completes reliably. Fixed in `GoogleSignInButton.jsx` (`use_fedcm_for_button: true`), 182/182 frontend tests pass - **not yet deployed or re-verified live**. Deploy and confirm the same way the login fix was verified (a real browser pass against production, not just a health check).
- **Sentry DSNs on Render/EAS**: both DSNs are confirmed working end-to-end locally (real events verified landing in each Sentry project - `200` responses, not just an SDK-reported successful flush, which turned out to be misleading on its own during setup). Still need `SENTRY_DSN` set on **kejaapp-backend** in Render, and `EXPO_PUBLIC_SENTRY_DSN` as an EAS secret for real mobile builds, before production errors actually reach Sentry. Mobile production builds will also need a `SENTRY_AUTH_TOKEN` EAS secret for source-map upload (not needed for Expo Go dev testing, already set locally).
- **Daraja credentials for Support KejaApp on Render**: code is built, tested, and locally verified against the "not configured" state - `render.yaml` declares all five `MPESA_*` vars as blueprint vars from the start (unlike VAPID above, this one didn't ship the gap first). The account owner already has a paybill/till; setting the real values in Render's dashboard is what's left. See `docs/dev/Payments.md`.
- **Mobile Google Sign-In**: register iOS (`com.kejaapp.mobile`, no cert needed) and Android (`com.kejaapp.mobile` + SHA-1 from `eas credentials`) OAuth client IDs in Google Cloud Console, then set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Needs the account owner's own EAS login first.
- **CI billing lock**: GitHub Actions is enabled but every job fails with "your account is locked due to a billing issue" — needs clearing at [github.com/settings/billing](https://github.com/settings/billing).
- **Custom domain**: still on default `*.onrender.com` subdomains.
- **Stray `kejaapp-frontend` Render service still exists**: this page previously (incorrectly) said it was retired/deleted after the frontend+backend consolidation - it's actually still deployed and responding, just unused since nothing links to it anymore. Needs the account owner's own call in Render's dashboard (delete it, since nothing depends on it, or leave it) - not something to act on unilaterally.
- **Mobile iOS verification**: only ever verified on a real Android emulator; iOS device/simulator testing is still outstanding.
- **`eslint`/`jest` version pinning**: both `frontend/` and `mobile/` are deliberately held back a major version (peer-dependency incompatibilities) — revisit once `eslint-config-expo`/`jest-expo`/`eslint-plugin-react` catch up.

See [Roadmap.md](Roadmap.md)'s "Next" section for the full, evolving list — this page just calls out the ones with the most immediate user-facing or operational impact.
