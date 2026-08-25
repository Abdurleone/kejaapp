# QA & QC Report

A point-in-time quality report for all three packages (backend, frontend, mobile), split per package into **QA** (the testing methodology/process in place — what's covered and how) and **QC** (the actual current results of running it). Regenerate the QC numbers with `npm test`/`npm run lint` (root-level scripts fan out to all three; see `package.json`) whenever this needs refreshing — they're a snapshot, not a live dashboard.

**Snapshot taken:** 2026-08-25, commit `bba1aad` (`main`), plus three mobile fixes landed since on top of it this same session (not yet on `main` at snapshot time - see the mobile section below). Refreshed after a whole-app appraisal that found and fixed 6 real findings across all three packages (#293-#295), a mobile Sentry-crashes-under-Expo-Go fix (native module import-time crash), a Discover-screen collapsible-filters UX change, and a genuine crash-fix correction: the Liquid Glass tab bar's redundant `babel.config.js` was recorded as removed weeks ago but never actually was - fixed and confirmed live this session. The previous snapshot (2026-08-24, commit `fd4473b`) is superseded below.

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
- **Layout:** `backend/tests/` mirrors the source tree 1:1 across 14 subdirectories (controllers, models, services, validators, utils, middlewares, jobs, config, seeders, docs, scripts, integration).
- **Unit vs. integration split:** the vast majority are unit-style, with dependencies (Mongoose models, external services) mocked. `backend/tests/integration/` holds real-database suites that self-skip (`describe(..., { skip: !testMongoUri })`) unless `TEST_MONGODB_URI` is set — CI would normally set this against a real `mongo:7` container, but **CI has been disabled since 2026-07-06** (see Cross-cutting observations), so in practice this suite only runs when someone sets `TEST_MONGODB_URI` locally.
- **Lint:** ESLint flat config (`backend/eslint.config.js`).
- **Coverage tooling:** `npm run test:coverage` (Node's built-in `--experimental-test-coverage`) — opt-in diagnostic, not a gate, per the same Goodhart's-Law caution generalized in the [Code of Ethics](../compliance/code-of-ethics.md#24-safety-and-trust).

### QC — current results

| Check | Result |
|---|---|
| `npm test` | **585/585 passing**, 110 suites, 0 failures |
| `npm run lint` | **0 errors, 0 warnings** |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| Production (`kejaapp-backend-7iu3.onrender.com`) | `/api/health/live`, `/api/health/ready`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` all `200` |

No regressions found this snapshot. Unchanged from last time: a stray environment gotcha worth repeating - running `npm test` with real `SENTRY_DSN`/`BACKUP_S3_*` values present in a local `.env` flips 4 tests that assert the "unconfigured/disabled" default; not a bug, just don't source a real `.env` before running the suite that checks the empty-config path.

---

## Frontend

### QA — methodology

- **Two runners, one command:** `npm test` runs `node --test` first, then `vitest run` (`frontend/package.json`).
- **`node --test` suite** (`frontend/tests/*.test.js`, 6 files, 90 tests): pure-function/API-helper coverage, a real-backend `auth-flow.integration.test.js`, `responsive-css.test.js`.
- **Vitest + jsdom + React Testing Library suite** (`frontend/tests/*.render.test.jsx`, 25 files, +1 since the last snapshot): real render + interaction tests per page component.
- **Lint:** ESLint flat config (`frontend/eslint.config.js`).
- **Build:** `vite build` — not currently run by CI (disabled), verified manually this snapshot.

### QC — current results

| Check | Result |
|---|---|
| `node --test` (`npm run test:node`) | **90/90 passing**, 6 suites |
| `vitest run` (`npm run test:render`) | **186/186 passing**, 25 files |
| `npm run lint` | **0 errors, 0 warnings** |
| `npm run build` | Succeeds — 59 modules transformed, main JS bundle 326.6 kB (gzip 89.2 kB), CSS 20.3 kB (gzip 5.0 kB) |
| `npm audit --omit=dev` | **0 vulnerabilities** |

Two findings from the whole-app appraisal, both fixed: `statusTone()` mis-colored accepted/completed mover-request and draft/archived property statuses as banned-red (written only against the user-account status vocabulary, never updated as other models reused it); `MoversPage.jsx` carried a dead, never-wired `maxBasePrice` filter key. Both fixed with regression tests; no other findings this snapshot.

---

## Mobile

### QA — methodology

- **Runner:** Jest via the `jest-expo` preset, with React Native Testing Library.
- **Layout:** 38 test files under `mobile/src/`.
- **Lint:** `expo lint`, flat config via `eslint-config-expo`.
- **Compatibility gate:** `npx expo-doctor` is the source of truth for whether installed package versions match what the installed Expo SDK actually bundles — semver alone is not reliable for Expo-tied native packages (see the incident history in prior snapshots).
- **Live device/emulator verification is now routine, not a one-off.** A prior snapshot recorded the first-ever real-device pass (a physical Android phone, over a manual ngrok tunnel). This snapshot adds a second, separate live-verification pass on an Android Studio emulator (also over a tunnel, since this dev sandbox can't reach the emulator via USB/adb directly) - which caught two further real bugs no test suite could have (see findings below). iOS remains unverified on real hardware.

### QC — current results

| Check | Result |
|---|---|
| `npm test` (fresh `rm -rf node_modules && npm install --legacy-peer-deps`) | **38/38 suites, 219/219 tests passing** |
| `npm run lint` | **0 errors, 82 warnings** (all pre-existing `import/first`, same intentional `jest.mock`-before-imports pattern as prior snapshots) |
| `npx expo-doctor` | **19/21 checks pass** — the pre-existing, already-accepted "eas-cli installed locally instead of globally" advisory, plus a newly-drifted patch-version mismatch across 8 Expo-bundled packages (Expo's own SDK-57 patch releases have moved slightly ahead of what's installed; not a regression, just not yet bumped) |
| Live device/emulator (Android, Expo Go) | **Two real bugs found and fixed this snapshot** (see below) |

**No repeat of the earlier SDK-drift regression** — the `dependabot.yml` guard rails from those incidents are still holding; the only drift `expo-doctor` shows now is ordinary upstream patch releases, not a bad bump.

**This snapshot's real findings, both found only by actually running the app live:**
1. **`@sentry/react-native` crashed the app outright under Expo Go.** `App.js` imported it unconditionally; that package's native module lookup (`TurboModuleRegistry.getEnforcing('RNSentry')`) throws as an *import-time* side effect, which Expo Go can't survive since it doesn't ship that native module - a hard native crash (`Fatal signal 11`), not a catchable JS error. Fixed with the same lazy-`require()`-behind-an-Expo-Go-check pattern `pushNotifications.js` already used for `expo-notifications`.
2. **The Liquid Glass tab bar's crash-on-load, previously recorded as fixed, actually wasn't.** A prior PR was titled and logged as having deleted the redundant `mobile/babel.config.js` (which double-applies the Reanimated/worklets Babel plugin `babel-preset-expo` already auto-configures) - but its merged commit never touched that file at all, confirmed by diffing it directly. Deleted it for real this time and verified live: the tab bar's spring animations now load without crashing. Worth internalizing as a QA lesson on its own: a PR title recording a fix is not proof the fix landed in the merged diff.

Also carried a **Discover-screen UX fix** (collapsible filter bar, closed by default with an active-filter-count badge) and the **whole-app appraisal's mobile finding** (a missing "Mover" role filter chip in the admin console) - both reflected in the test-count increase above.

Verified clean end-to-end: a fully fresh `rm -rf node_modules && npm install --legacy-peer-deps` followed by `npx jest` (38/38, 219/219), `npm run lint` (0 errors), `npx expo-doctor` (19/21), plus live re-verification on the emulator confirming both crash fixes hold.

---

## Cross-cutting observations

- **All three packages are clean on a fresh install**: 894 total automated tests passing (585 backend + 276 frontend + 219 mobile — 90 node:test + 186 Vitest for frontend), 0 lint errors anywhere, 0 `npm audit` vulnerabilities in backend/frontend.
- **CI remains enabled but account-billing-locked since 2026-07-06** (re-confirmed this snapshot — every run still fails in ~4s with "your account is locked due to a billing issue," zero job steps executed; it's enabled on GitHub Actions, not manually disabled - a prior snapshot's framing of this was corrected in `docs/compliance/iso27001-statement-of-applicability.md`). Unchanged risk from every prior snapshot: nothing automated catches a regression before merge, which is exactly why the manual clean-install habit matters, and why this snapshot's two real mobile bugs were only found by actually running the app, not by any test suite.
- **Dependabot**: fully cleared — the `dependabot.yml` guard rails from prior SDK-drift incidents are holding, `expo-doctor` shows no *bad* drift on a clean install (only ordinary upstream patch releases not yet bumped, see the mobile section above). Security alerts down to **1 open** (`minimatch`, ReDoS-class, in `mobile/package-lock.json`'s `eas-cli` transitive chain) — `image-size` resolved naturally via upstream. Still only fixable via `--force`, which would downgrade `eas-cli`/`expo` to versions already known-bad — same deliberate-defer policy as before. No open PRs.
- **A whole-app appraisal (3 parallel read-only agents over backend/frontend/mobile) found and fixed 6 real findings** since the last snapshot, most severe a fully-unauthenticated `GET /api/properties?status=draft` data-exposure gap - see `CHANGELOG.md`'s "Whole-App Appraisal" entry for the complete list; the frontend/mobile findings are also reflected in their respective sections above.
- **Mobile live-device testing is now a repeatable habit, not a one-off** — a second independent pass (an Android Studio emulator, over the same kind of tunnel a prior snapshot established for a physical phone) found two further real bugs this snapshot (see the mobile section above). `docs/dev/Troubleshooting.md` documents the full recipe, including a fix for a multipart-streaming/ngrok interaction that otherwise hangs the app at "Bundling 99%...". iOS remains unverified on real hardware — no iOS device available in this environment.
- **No code coverage tooling** configured in frontend or mobile, same as every prior snapshot. Backend's opt-in `test:coverage` wasn't re-run this snapshot (no code changed in a way likely to move it).
- **No dead-code sweep performed this snapshot** — time went to the appraisal and the mobile live-testing push instead, a higher-yield use of this refresh than a repeat dead-code pass.
- **Docs link health**: not re-swept this snapshot; a separate documentation-accuracy pass found and fixed several stale cross-references and status claims across `docs/compliance/` and `docs/dev/` instead (see each doc's own edit history / `CHANGELOG.md`).
