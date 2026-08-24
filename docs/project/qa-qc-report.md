# QA & QC Report

A point-in-time quality report for all three packages (backend, frontend, mobile), split per package into **QA** (the testing methodology/process in place — what's covered and how) and **QC** (the actual current results of running it). Regenerate the QC numbers with `npm test`/`npm run lint` (root-level scripts fan out to all three; see `package.json`) whenever this needs refreshing — they're a snapshot, not a live dashboard.

**Snapshot taken:** 2026-08-24, commit `fd4473b` (`main`). Refreshed after the mobile SDK-drift fix (#285), the whole-codebase risk register (#289), a fourth SDK-drift Dependabot incident caught and closed before merge (#290), and — for the first time this project's history — mobile testing actually working end-to-end on a real device, which surfaced and fixed a genuine app bug (#291). The previous snapshot (2026-08-23, commit `16ced49`) is superseded below.

## How to reproduce

```bash
npm run test:backend   # or: cd backend && npm test
npm run test:frontend  # or: cd frontend && npm test
npm run test:mobile    # or: cd mobile && npm test
npm run lint            # all three, or npm run lint:backend / :frontend / :mobile
```

---

## Backend

### QA — methodology

- **Runner:** Node's built-in `node --test` (`backend/package.json`'s `test` script) — no third-party test framework.
- **Layout:** `backend/tests/` mirrors the source tree 1:1, 102 test files across 14 subdirectories (controllers, models, services, validators, utils, middlewares, jobs, config, seeders, docs, scripts, integration) — up from 91 files at the last snapshot, mostly new coverage from the whole-app appraisal and security-checklist rounds merged since.
- **Unit vs. integration split:** the vast majority are unit-style, with dependencies (Mongoose models, external services) mocked. `backend/tests/integration/` holds real-database suites that self-skip (`describe(..., { skip: !testMongoUri })`) unless `TEST_MONGODB_URI` is set — CI would normally set this against a real `mongo:7` container, but **CI has been disabled since 2026-07-06** (see Cross-cutting observations), so in practice this suite only runs when someone sets `TEST_MONGODB_URI` locally.
- **Lint:** ESLint flat config (`backend/eslint.config.js`).
- **Coverage tooling:** `npm run test:coverage` (Node's built-in `--experimental-test-coverage`) — opt-in diagnostic, not a gate, per the same Goodhart's-Law caution generalized in the [Code of Ethics](../compliance/code-of-ethics.md#24-safety-and-trust).

### QC — current results

| Check | Result |
|---|---|
| `npm test` | **584/584 passing**, 110 suites, 0 failures |
| `npm run lint` | **0 errors, 0 warnings** |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| Production (`kejaapp-backend-7iu3.onrender.com`) | `/api/health/live`, `/api/health/ready`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` all `200` |

No regressions found this snapshot. Unchanged from last time: a stray environment gotcha worth repeating - running `npm test` with real `SENTRY_DSN`/`BACKUP_S3_*` values present in a local `.env` flips 4 tests that assert the "unconfigured/disabled" default; not a bug, just don't source a real `.env` before running the suite that checks the empty-config path.

---

## Frontend

### QA — methodology

- **Two runners, one command:** `npm test` runs `node --test` first, then `vitest run` (`frontend/package.json`).
- **`node --test` suite** (`frontend/tests/*.test.js`, 6 files, 87 tests): pure-function/API-helper coverage, a real-backend `auth-flow.integration.test.js`, `responsive-css.test.js`.
- **Vitest + jsdom + React Testing Library suite** (`frontend/tests/*.render.test.jsx`, 25 files, +1 since the last snapshot): real render + interaction tests per page component.
- **Lint:** ESLint flat config (`frontend/eslint.config.js`).
- **Build:** `vite build` — not currently run by CI (disabled), verified manually this snapshot.

### QC — current results

| Check | Result |
|---|---|
| `node --test` (`npm run test:node`) | **87/87 passing**, 6 suites |
| `vitest run` (`npm run test:render`) | **186/186 passing**, 25 files |
| `npm run lint` | **0 errors, 0 warnings** |
| `npm run build` | Succeeds — 59 modules transformed, main JS bundle 326.6 kB (gzip 89.2 kB), CSS 20.3 kB (gzip 5.0 kB) |
| `npm audit --omit=dev` | **0 vulnerabilities** |

No findings this snapshot beyond the above — all green, unchanged from last snapshot.

---

## Mobile

### QA — methodology

- **Runner:** Jest via the `jest-expo` preset, with React Native Testing Library.
- **Layout:** 38 test files under `mobile/src/`.
- **Lint:** `expo lint`, flat config via `eslint-config-expo`.
- **Compatibility gate:** `npx expo-doctor` is the source of truth for whether installed package versions match what the installed Expo SDK actually bundles — semver alone is not reliable for Expo-tied native packages (see the incident history in the prior snapshot, and the follow-up incident below).
- **Live device verification: achieved for the first time this snapshot.** Every prior snapshot recorded this as "not part of the automated suite, not re-attempted" — this time, real testing on an actual Android phone via Expo Go was carried through to completion (see the finding below for what it took and what it found). Still not part of any automated gate; still manual, and iOS remains unverified on real hardware.

### QC — current results

| Check | Result |
|---|---|
| `npm test` (fresh `rm -rf node_modules && npm install --legacy-peer-deps`) | **38/38 suites, 217/217 tests passing** |
| `npm run lint` | **0 errors, 82 warnings** (all pre-existing `import/first`, same intentional `jest.mock`-before-imports pattern as prior snapshots) |
| `npx expo-doctor` | **20/21 checks pass** — the 1 remaining is the pre-existing, already-accepted "eas-cli installed locally instead of globally" advisory |
| Live device (real Android phone, Expo Go) | **Achieved.** App loaded and ran end-to-end after fixing a real crash (see below) |

**No repeat of last snapshot's SDK-drift regression** — `expo-doctor`'s clean 20/21 result confirms the `dependabot.yml` guard rails added after that incident (and widened again after a follow-up incident, #290) are holding: a clean install now resolves the exact SDK-57-correct version set with no manual correction needed.

**This snapshot's real finding: a genuine app bug, found only by actually completing a live device test for the first time.** Getting there required working through real infrastructure limits specific to this dev environment, documented in full in `docs/dev/Troubleshooting.md`'s expanded "Android emulator on WSL2" section:
- A Windows-side Android Studio emulator bridge (the standard `adb -a nodaemon server start` + `ADB_SERVER_SOCKET` trick) turned out to be a dead end here specifically — this sandbox's WSL2↔Windows automatic port-forwarding is disabled, confirmed by testing `http://localhost:<port>` from Windows directly (refused), independent of the emulator/adb layer entirely.
- A native WSL2-side emulator (`/opt/android-sdk`'s `kejaapp_avd`) OOM-killed itself and squeezed VS Code badly enough to force-restart its remote server - confirmed via `dmesg`'s own OOM-killer log entry. This environment's ~7.5GB RAM genuinely isn't enough to run an AVD alongside the IDE and dev servers already in use.
- The working path: `expo start --tunnel` failed outright (`@expo/ngrok`'s bundled binary is version-incompatible with ngrok's current backend for free accounts, `ERR_NGROK_121`) - fixed by swapping in a current `ngrok` v3 binary manually and driving it directly (`ngrok http 8081` + `EXPO_PACKAGER_PROXY_URL` env var, since `@expo/ngrok`'s own config-writing code doesn't understand ngrok v3's schema). Separately, Play Store's current Expo Go build had already moved past this project's SDK 57 - fixed by sideloading the official per-SDK APK from `expo/expo-go-releases`.
- With all of that finally working, the app loaded and immediately hung on its splash screen. Root cause: `mobile/src/context/AuthContext.js`'s session-restore effect had no error handling around reading the stored auth token - when `SecureStore.getItemAsync()` threw (`TypeError: ExpoSecureStore.default.getValueWithKeyAsync is not a function`, a native-module quirk in the sideloaded Expo Go build), the effect crashed before ever calling `setLoading(false)`, hanging the app forever instead of falling back to signed-out. **Fixed** with a try/catch treating any read failure the same as "no token," plus a new regression test (#291) - see `CHANGELOG.md` for the full write-up.

Verified clean end-to-end: a fully fresh `rm -rf node_modules && npm install --legacy-peer-deps` followed by `npx jest` (38/38, 217/217), `npm run lint` (0 errors), `npx expo-doctor` (20/21), plus the live device re-test confirming the app now reaches signed-out state instead of hanging.

---

## Cross-cutting observations

- **All three packages are clean on a fresh install**: 888 total automated tests passing (584 backend + 273 frontend + 217 mobile), 0 lint errors anywhere, 0 `npm audit` vulnerabilities in backend/frontend.
- **CI remains disabled since 2026-07-06** (re-confirmed this snapshot — every run still fails in ~4s with "your account is locked due to a billing issue," zero job steps executed). Unchanged risk from every prior snapshot: nothing automated catches a regression before merge, which is exactly why the manual clean-install habit from the last snapshot's finding matters — this snapshot's own fresh mobile install (0 drift found) is the proof that habit is working, not a reason to relax it.
- **Dependabot**: fully cleared — the `dependabot.yml` guard rails from the last two incidents (#285, #290) are holding, `expo-doctor` shows zero drift on a clean install. Security alerts down to **1 open** (`minimatch`, ReDoS-class, in `mobile/package-lock.json`'s `eas-cli` transitive chain) — down from 2 last snapshot; `image-size` resolved naturally via upstream. Still only fixable via `--force`, which would downgrade `eas-cli`/`expo` to versions already known-bad — same deliberate-defer policy as before. No open PRs.
- **Mobile live-device testing worked for the first time this project's QA history has recorded** — see the mobile section above for the full path (Windows-emulator bridge blocked by this sandbox's networking, native emulator blocked by memory, ngrok tunnel + sideloaded per-SDK Expo Go APK as what actually worked) and the real bug it found (`AuthContext.js`'s SecureStore-hang, fixed in #291). `docs/dev/Troubleshooting.md` now documents this whole path for next time, so it shouldn't take as long to re-establish. iOS remains unverified on real hardware — no iOS device available in this environment.
- **No code coverage tooling** configured in frontend or mobile, same as every prior snapshot. Backend's opt-in `test:coverage` wasn't re-run this snapshot (no code changed in a way likely to move it).
- **No dead-code sweep performed this snapshot** — time went to the mobile live-device push and its resulting bug fix instead, a higher-yield use of this refresh than a repeat dead-code pass.
- **Docs link health**: re-swept, still clean (only the one known illustrative-text false positive in `CHANGELOG.md`, not a real link).
