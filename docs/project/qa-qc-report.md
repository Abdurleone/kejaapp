# QA & QC Report

A point-in-time quality report for all three packages (backend, frontend, mobile), split per package into **QA** (the testing methodology/process in place — what's covered and how) and **QC** (the actual current results of running it). Regenerate the QC numbers with `npm test`/`npm run lint` (root-level scripts fan out to all three; see `package.json`) whenever this needs refreshing — they're a snapshot, not a live dashboard.

**Snapshot taken:** 2026-08-12, commit `065b0fb` (`main`). Refreshed after a long stretch of unverified work since the previous snapshot: the mobile matatu-poster port, the Render single-origin consolidation and its CSRF/CSP follow-up fixes, Sentry error tracking (backend + mobile), UptimeRobot uptime monitoring, self-hosted database backup/restore scripts, a full duplication/staleness audit across ~40 docs, the `docs/` folder reorganization into `compliance/`/`dev/`/`project/`/`user-manual/`, and a README appraisal. None of those had been checked against a full, fresh test/lint/lockstep-Dependabot-review pass until this one. The previous snapshot (2026-08-03, commit `7245c8a`) is superseded below.

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
- **Layout:** `backend/tests/` mirrors the source tree 1:1: `controllers/` (20 files), `models/` (11), `services/` (14, +4 since the last snapshot — the database backup/restore work added `backupStorageService.test.js` ×2 and coverage for the new S3-backed backup path), `validators/` (10), `utils/` (10), `middlewares/` (6), `jobs/` (6), `config/` (5), `seeders/` (1), `docs/` (2), `scripts/` (3, +2 — `backupDatabase.test.js`/`restoreDatabase.test.js`) — 91 files, 97 suites, 522 tests total.
- **Unit vs. integration split:** the vast majority are unit-style, with dependencies (Mongoose models, external services) mocked. `backend/tests/integration/` holds two real-database suites (`apiFlows.integration.test.js`, `mongodb.integration.test.js`) that self-skip (`describe(..., { skip: !testMongoUri })`) unless `TEST_MONGODB_URI` is set — they don't run on a bare local `npm test`. CI's `backend` job is configured to set this against a real `mongo:7` service container, but **CI has been disabled since 2026-07-06** (see Cross-cutting observations below), so in practice this suite currently only runs when someone sets `TEST_MONGODB_URI` locally — verified for real this snapshot rather than assumed (see QC findings below).
- **Lint:** ESLint flat config (`backend/eslint.config.js`).
- **CI:** `.github/workflows/ci.yml`'s `backend` job is configured to run lint then test against a real MongoDB container on every push/PR to `main` (see `docs/dev/devops.md`) — not currently executing (billing lock, unresolved).
- **Coverage tooling:** `npm run test:coverage` runs `node --experimental-test-coverage --test` — Node's built-in coverage reporter, zero new dependencies. Opt-in, a diagnostic report not a gate, for the same reasons as the previous snapshot.

### QC — current results

| Check | Result |
|---|---|
| `npm test` | **522/522 passing**, 97 suites, 0 failures |
| `npm run lint` | **0 errors, 0 warnings** |
| Integration suites (`TEST_MONGODB_URI` set) | **39/39 passing** — verified against a real local MongoDB instance (a scratch `mongod`, not CI, since CI doesn't run) |
| `npm run test:coverage` | **91.94% lines, 92.74% branches, 90.69% functions** (opt-in report, not a gate) |

**Real bug found and fixed this snapshot**: running the integration suite for the first time since the "no submitter consent" feedback fix shipped (see CHANGELOG's General Health-Check Appraisal entry) surfaced two failing tests — `apiFlows.integration.test.js` still asserted that an admin responding to feedback unconditionally publishes it (`isPublic === true`), which was true *before* that fix, not since (`respondToFeedback` now sets `isPublic = feedback.allowPublicSharing`, default `false`). The test's own fixture never opted in, so under the correct current behavior the assertion was simply wrong. Nobody had caught this because the suite only runs with `TEST_MONGODB_URI` set, which nothing has done since CI went dark. Fixed by opting the test's feedback into `allowPublicSharing: true`, so it now genuinely exercises the real consent → publish flow instead of contradicting it. The underlying logic was never wrong — `feedbackController.test.js`'s unit tests already covered both branches correctly; only this integration fixture was stale.

**Dependabot**: one open PR (`@aws-sdk/client-s3`, `expo-server-sdk`, `eslint`, all patch-level) reviewed by checking out the branch directly, verified 522/522 + clean lint, merged.

---

## Frontend

### QA — methodology

- **Two runners, one command:** `npm test` runs `node --test` first, then `vitest run` (`frontend/package.json`). Split scripts (`test:node`, `test:render`) exist for running either half alone.
- **`node --test` suite** (`frontend/tests/*.test.js`, 6 files, 87 tests): pure-function/API-helper coverage, a real-backend `auth-flow.integration.test.js`, `responsive-css.test.js`, and the legacy `page-components.test.js` regex-source-matching suite — unchanged in shape since the last snapshot.
- **Vitest + jsdom + React Testing Library suite** (`frontend/tests/*.render.test.jsx`, 24 files, +2 since the last snapshot): real render + interaction tests for every page component. Still the suite that actually exercises behavior rather than asserting JSX source text exists.
- **Live/manual verification:** Playwright ad hoc during development, same as the previous snapshot — not part of the automated `npm test` run.
- **Lint:** ESLint flat config (`frontend/eslint.config.js`).
- **Build:** `vite build` — CI's `frontend` job is configured to run it after tests (not currently executing).
- **Coverage tooling:** none configured, same as backend.

### QC — current results

| Check | Result |
|---|---|
| `node --test` (`npm run test:node`) | **87/87 passing**, 6 suites |
| `vitest run` (`npm run test:render`) | **171/171 passing**, 24 files |
| `npm run lint` | **0 errors, 0 warnings** |
| `npm run build` | Succeeds — 57 modules transformed, main JS bundle 320.9 kB (gzip 87.7 kB), CSS 20.3 kB (gzip 5.0 kB), built in ~500ms |

**Findings from this refresh:** one open Dependabot PR (`@testing-library/user-event`, `globals`, `vite`, all patch-level) reviewed by checking out the branch directly — tests, lint, and a real production build all pass — merged. No dead-code sweep performed this snapshot (out of scope for this refresh's time budget; the last full sweep is documented in the prior snapshot and CHANGELOG).

---

## Mobile

### QA — methodology

- **Runner:** Jest via the `jest-expo` preset, with React Native Testing Library — unchanged.
- **Layout:** 36 test files under `mobile/src/` (+5 since the last snapshot — new coverage from the matatu-poster mobile port, the mobile Sentry wiring, and `PropertyCreateScreen.test.js`, closed as a real coverage gap during a mobile security/health pass — see CHANGELOG).
- **Known environment quirks:** unchanged from the previous snapshot (async `render()`/`fireEvent`, `Platform.OS` reporting `"ios"` under Jest, isolated real-timer debounce tests, `getByText` not concatenating multi-expression `<Text>` children) — still load-bearing for anyone adding new mobile tests.
- **Lint:** `expo lint`. `eslint`/`jest`/`@react-native-async-storage/async-storage` remain pinned/ignored for major-version bumps, per the previous snapshot's findings. **New this snapshot**: `@sentry/react-native` added to the same ignore list — see the QC finding below.
- **Live device/emulator verification:** not part of the automated suite, same disclosure convention as the previous snapshot.
- **Coverage tooling:** none configured.

### QC — current results

| Check | Result |
|---|---|
| `npm test` | **206/206 passing**, 36 suites |
| `npm run lint` | **0 errors, 78 warnings** |

The 78 warnings are all `import/first` (same pre-existing, intentional `jest.mock`-before-imports pattern documented in the previous snapshot) — up from 67 simply because there are more test files, not a new category of warning.

**The most significant finding of this snapshot**: the open `mobile-dependencies` Dependabot group PR bundled `@sentry/react-native` `7.11.0` → `8.22.0` — a **major** version bump to exactly the version this project already confirmed is wrong for Expo SDK 57 when Sentry was first wired up (`npx expo install` resolves `~7.11.0` as correct; `8.22.0` is just npm's semver-`latest` tag, untested against this SDK). This is the same class of incident as the `@react-native-async-storage/async-storage` regression documented in the previous snapshot — a native module's real-world compatible version is tied to the installed Expo SDK, not semver, and a group bump doesn't know that. Caught by manually reading the PR diff, not by any automated signal — CI is disabled, and the test suite mocks Sentry out entirely, so an SDK-incompatible native module version would have shipped silently otherwise. Fixed: merged every other update from the group (11 packages — react-navigation, expo-image-picker/location/notifications, react-native-screens/svg, eas-cli, globals), reverted just `@sentry/react-native` back to `~7.11.0`, and added a `dependabot.yml` ignore rule for its major version. Dependabot regenerated a corrected standalone PR within the same session (`7.11.0` → `7.13.0`, safely within the 7.x line) — reviewed, verified 206/206, and merged, confirming the new ignore rule works as intended.

`npx expo install --check` still flags real (patch/minor-level) drift on several packages (`expo`, `expo-image-picker`, `expo-location`, `expo-notifications`, `expo-splash-screen`, `react`/`react-dom`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `jest-expo`) — a larger list than the previous snapshot's 2-package drift, but all ordinary patch/minor gaps rather than anything broken today. Consistent with the previous snapshot's framing: worth a deliberate look given this project's SDK-mismatch history, not urgent.

---

## Cross-cutting observations

- **All three packages are currently clean**: 986 total automated tests passing (522 backend + 258 frontend + 206 mobile), 0 lint errors anywhere.
- **This snapshot's real yield: two genuine bugs found by actually running things that hadn't been run in a while**, not by code review — the stale feedback-consent integration test (backend, above) and the Sentry major-version trap bundled in a Dependabot group (mobile, above). Both are the same underlying lesson repeating: **CI has been disabled since 2026-07-06** (account-level GitHub billing lock, confirmed still in effect this snapshot via `gh run list` — every recent run fails in ~3-4 seconds with zero job steps executed, consistent with the account-level lock rather than a workflow problem), so nothing that only CI would normally catch (integration-suite regressions, Dependabot group bumps with a bad package mixed in) gets caught until someone manually re-runs it. This report's own purpose is exactly that manual check, and it found real things this time specifically because enough had accumulated unverified since the last one.
- **Dependabot**: all 4 PRs open at the start of this snapshot (backend ×1, frontend ×1, mobile ×2 — one original group bump plus its Sentry-only regeneration) reviewed by checking out each branch directly and verifying test/lint/build, not merged on the changelog alone. All merged (the unsafe mobile one only after excluding the Sentry major bump); zero remain open as of this snapshot.
- **No code coverage tooling** is configured in frontend or mobile, same as the previous snapshot. Backend's opt-in `test:coverage` report is unchanged in kind (91.94/92.74/90.69% this snapshot vs. 91.4/92.4/90.7% previously — noise-level movement, not a regression).
- **No dead-code sweep performed this snapshot** beyond spot-checking this session's own new code (backup/restore script exports, all confirmed genuinely wired up) — a full repo-wide sweep like the previous two snapshots did is a reasonable next refresh's focus, not repeated here given how much of this pass's time went to the two real bugs found and the Dependabot backlog.
- **CodeQL** remains dead for the same billing-lock reason as CI — not re-checked in detail this snapshot beyond confirming CI's own status, since the previous snapshot already traced its one failed run to the same root cause.
- **Mobile emulator/device verification status is unchanged** from the previous snapshot — not re-attempted this pass (this was a test/lint/dependency-review refresh, not a live-device pass). iOS remains unverified on a real device/simulator.
