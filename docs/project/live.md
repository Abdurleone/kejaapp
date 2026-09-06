# What's Live

A snapshot of what's actually deployed and working right now, separate from [CHANGELOG.md](CHANGELOG.md) (full history) and [Roadmap.md](Roadmap.md) (shipped/next at a feature level). This page answers one question: **if someone opens the app right now, what do they get, and what's still missing?** Last updated 2026-09-06.

**Recovered from a production outage since the last update**: `kejaapp-backend` briefly went fully down (crash-looping on a missing `MONGODB_URI` - a Render dashboard-only secret this service instance didn't have set). Confirmed fixed: `/api/health` now reports `database.status: "connected"`, and a full real-browser pass against the live URL confirms the app works end-to-end again. See `Roadmap.md`'s Completed section for the full incident writeup.

**The Google-only-account login fix (PR #276) is now confirmed live**, after a day's delay from an unrelated Render/Google Cloud platform outage. Chasing it further turned up three more real gaps, all now fixed and verified: a missing `VITE_GOOGLE_CLIENT_ID`, a Google Cloud Console `origin_mismatch`, and a genuinely code-level bug (Google's rendered button hanging on `gsi/transform` in current Chrome, `use_fedcm_for_button` now set). See `Roadmap.md`'s Completed section for the full chain.

## Live URL

- `https://kejaapp-backend-7iu3.onrender.com` — one URL for both the web app and its API now (the `-7iu3` suffix is real and permanent — the unsuffixed name was already taken by another Render account). The web app used to be served from a separate `kejaapp-frontend.onrender.com` static site before the two origins were consolidated — see CHANGELOG.md's "Consolidate Web + API onto One Render Origin" entry for why (closing out a cross-origin CSRF cookie problem at the source). That old service briefly lingered on Render after the consolidation (this page incorrectly said it was already gone) but has since actually been deleted by the account owner.
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
| Error tracking (Sentry) | Backend: **live in production** - `SENTRY_DSN` set on `kejaapp-backend` in Render (no independent public check possible, unlike VAPID's key endpoint - recorded on the account owner's confirmation). Mobile (`mobile/App.js`, `EXPO_PUBLIC_SENTRY_DSN`): **verified working locally** (real test event confirmed landing in Sentry, `200`), but no EAS secret set yet, so mobile crash reports still aren't reaching Sentry in production builds. Separately, the package's own native module was crashing the app outright under Expo Go (import-time native lookup, not a JS error) - fixed with a lazy-require guard; unrelated to the EAS-secret gap, which remains open |
| Uptime monitoring (UptimeRobot, free tier) | **Live** - two HTTP monitors (5-minute interval, email alert) poll `/api/health/live` and `/api/health/ready` in production; both confirmed `up`. Independent of Sentry - catches a full process crash even before a production `SENTRY_DSN` is ever set, since a dead process can't self-report to Sentry either way |
| Web push notifications | **Live in production** - `GET /api/push-subscriptions/vapid-public-key` confirmed returning a real key against the live URL, meaning `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` are now set on Render. Mobile push (Expo) is unaffected either way - separate delivery channel |
| Support KejaApp (voluntary M-Pesa) | **Sandbox credentials set on Render**, but payments don't actually complete yet. All 6 `MPESA_*` vars are set and the service redeployed; two live sandbox test payments through the production UI were both accepted by Daraja (reaching the phone-PIN-prompt state, confirming the request itself is correct) but Safaricom's asynchronous result callback never arrived at either - confirmed via Render's own logs showing no inbound request to the callback route at all. Root cause still open. Real production credentials (an actual paybill/till) haven't been set up at all yet. See `Roadmap.md`'s Next section. Unrelated to any tenant/landlord/agency/mover payment - see [Payment Boundary](../../README.md#payment-boundary) |
| Scheduled notification jobs (`backend/jobs/`) | **Not running at all.** No Cron Job service exists on Render - confirmed directly in the dashboard - and the Kubernetes `CronJob` that would run these every 15 minutes only exists on the non-live k8s path. Viewing reminders, post-viewing review prompts, and stale-listing/inquiry nudges are not firing for real users right now. See `Roadmap.md`'s Next section for the fix options under consideration |

Known free-tier tradeoffs: the web service spins down after 15 minutes idle (cold start on the next request); single backend instance (no horizontal scaling).

## Authentication

| Method | Web | Mobile | Backend |
|---|---|---|---|
| Email/username + password | ✅ Live | ✅ Live | ✅ Live |
| Google Sign-In | ✅ Live, verified in production | ⏸️ Paused | ✅ Live, verified in production |

Google Sign-In's backend (`POST /api/auth/google`) and web button both went live and were verified directly against the production site: the endpoint correctly moved from a 503 ("not configured") to a real 401 ("Invalid Google credential") once `GOOGLE_CLIENT_ID` was set, and the web button correctly went from absent to Google's own rendered widget once `VITE_GOOGLE_CLIENT_ID` was set — both confirmed with a real headless-browser pass against the live site, not just local tests.

Mobile is paused pending the account owner's own Google Cloud Console setup: `expo-auth-session`'s Google provider needs separate iOS and Android OAuth client IDs (not just the Web one reused for backend/frontend). Getting Android's SHA-1 fingerprint turned out not to need the account owner's own EAS login after all — a local debug keystore gives an equally valid one. That SHA-1 has been generated and handed over along with the exact 3 client IDs to create; mobile stays paused only until those are created and set as env vars. See [Authentication.md](../dev/Authentication.md) for the exact resume steps.

## Theme

System/Light/Dark on both web and mobile — System (OS-preference-following, live-updating) is the default for new installs; a manual choice still overrides and persists.

## What's pending

- **Mobile Sentry DSN as an EAS secret**: confirmed working end-to-end locally (real event verified landing in Sentry - a `200` response, not just an SDK-reported successful flush, which turned out to be misleading on its own during setup). `SENTRY_DSN` is now live on the backend (see Infrastructure above); mobile still needs `EXPO_PUBLIC_SENTRY_DSN` as an EAS secret for real builds, plus `SENTRY_AUTH_TOKEN` for source-map upload (not needed for Expo Go dev testing, already set locally).
- **Daraja credentials for Support KejaApp on Render**: code is built, tested, and locally verified against the "not configured" state - `render.yaml` declares all five `MPESA_*` vars as blueprint vars from the start (unlike VAPID above, this one didn't ship the gap first). The account owner already has a paybill/till; setting the real values in Render's dashboard is what's left. See `docs/dev/Payments.md`.
- **Mobile Google Sign-In**: register iOS (`com.kejaapp.mobile`, no cert needed) and Android (`com.kejaapp.mobile` + SHA-1 from `eas credentials`) OAuth client IDs in Google Cloud Console, then set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Needs the account owner's own EAS login first.
- **CI billing lock**: GitHub Actions is enabled but every job fails with "your account is locked due to a billing issue" — needs clearing at [github.com/settings/billing](https://github.com/settings/billing).
- **Custom domain**: still on default `*.onrender.com` subdomains.
- **Mobile iOS verification**: only ever verified on a real Android emulator; iOS device/simulator testing is still outstanding.
- **`eslint`/`jest` version pinning**: both `frontend/` and `mobile/` are deliberately held back a major version (peer-dependency incompatibilities) — revisit once `eslint-config-expo`/`jest-expo`/`eslint-plugin-react` catch up.

See [Roadmap.md](Roadmap.md)'s "Next" section for the full, evolving list — this page just calls out the ones with the most immediate user-facing or operational impact.
