# QA & QC Report

A point-in-time quality report for all three packages (backend, frontend, mobile), split per package into **QA** (the testing methodology/process in place — what's covered and how) and **QC** (the actual current results of running it). Regenerate the QC numbers with `npm test`/`npm run lint` (root-level scripts fan out to all three; see `package.json`) whenever this needs refreshing — they're a snapshot, not a live dashboard.

**Snapshot taken:** 2026-07-28, commit `8ae7413` (`main`). Refreshed after a live UI/UX appraisal and its four-phase remediation, plus a dev-database cleanup that added a new backend service/endpoint/script. The previous snapshot (2026-07-27, commit `ac0363f`) is superseded below; mobile wasn't touched this pass, so its numbers carry forward unchanged.

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
- **Layout:** `backend/tests/` mirrors the source tree 1:1: `controllers/` (18 files), `models/` (11), `services/` (12), `validators/` (10), `utils/` (10), `middlewares/` (6), `jobs/` (6), `config/` (4), `seeders/` (1), `docs/` (1), `scripts/` (1, new — covers `cleanupTestData.js`'s account-identification logic) — 83 suites, 465 tests total.
- **Unit vs. integration split:** the vast majority are unit-style, with dependencies (Mongoose models, external services) mocked. `backend/tests/integration/` holds two real-database suites (`apiFlows.integration.test.js`, `mongodb.integration.test.js`) that self-skip (`describe(..., { skip: !testMongoUri })`) unless `TEST_MONGODB_URI` is set — they don't run on a bare local `npm test`, but CI's `backend` job sets `TEST_MONGODB_URI` against a real `mongo:7` service container, so they do run there.
- **Lint:** ESLint flat config (`backend/eslint.config.js`).
- **CI:** `.github/workflows/ci.yml`'s `backend` job runs lint then test against the real MongoDB container on every push/PR to `main` (see `docs/devops.md`).
- **Coverage tooling:** none configured. Test breadth is tracked qualitatively (mirrors the source tree; new controllers/services/validators get a corresponding test file as a matter of convention) rather than via a coverage percentage gate.

### QC — current results

| Check | Result |
|---|---|
| `npm test` | **465/465 passing**, 83 suites, 0 failures, 0 skipped |
| `npm run lint` | **0 errors, 0 warnings** |
| Integration suites (`TEST_MONGODB_URI` set) | Both pass in CI against a real `mongo:7` container |

No findings.

---

## Frontend

### QA — methodology

- **Two runners, one command:** `npm test` runs `node --test` first, then `vitest run` (`frontend/package.json`). Split scripts (`test:node`, `test:render`) exist for running either half alone.
- **`node --test` suite** (`frontend/tests/*.test.js`, 6 files): pure-function/API-helper coverage (`api-helpers.test.js`, `app.test.js`, `request-cache.test.js`), a real-backend `auth-flow.integration.test.js`, `responsive-css.test.js` (regex-asserts specific CSS rules exist, used to guard mechanical CSS refactors), and `page-components.test.js` — a legacy regex-source-matching suite predating the Vitest render-test migration (see CHANGELOG's Phase 4 entries); most of what it once covered has since been superseded by dedicated `.render.test.jsx` files, but it hasn't been fully retired.
- **Vitest + jsdom + React Testing Library suite** (`frontend/tests/*.render.test.jsx`, 22 files): real render + interaction tests for every page component (`AccountPage`, `AdminPage`, `App`, `AuthContext`, `AuthModal`, `DashboardPage`, `DiscoverPage` (plus its grid-memoization variant), `FeedbackPage`, list-row memoization, loading skeletons, `MoversPage`, the notification badge, `NotificationsPage`, `PropertyCreatePage`, `PropertyDetailPage` (plus its image lazy-loading and broken-image-fallback variants), `PropertyEditPage`, `SavedPage`, `WorkspacePage`, `UserMenu`). This is the suite that actually exercises component behavior (clicks, form fills, async fetch/error/retry states, race-condition guards) rather than just asserting JSX source text exists.
- **Live/manual verification:** Playwright is used ad hoc during development (via a scratch driver script, not committed to the repo) to verify behavior that's impractical to unit test — real out-of-order network races, focus traps, print-stylesheet rendering, actual browser dialog semantics. This is **not** part of the automated `npm test` run; it's a manual step taken PR-by-PR for UI-visible changes (documented per-PR in CHANGELOG.md). This same scratch-driver approach was also the primary method for a full UI/UX appraisal (screenshot evidence across five roles, both color modes, desktop + mobile viewports) that produced the fixes described in CHANGELOG's "Phase 1"–"Phase 3" entries; every finding was traced to an exact source line and, where fixed, re-verified live rather than by the unit-test suite passing alone.
- **Lint:** ESLint flat config (`frontend/eslint.config.js`).
- **Build:** `vite build` — CI's `frontend` job runs it after tests to catch build-breaking errors.
- **Coverage tooling:** none configured, same as backend.

### QC — current results

| Check | Result |
|---|---|
| `node --test` (`npm run test:node`) | **82/82 passing**, 6 suites |
| `vitest run` (`npm run test:render`) | **152/152 passing**, 22 files |
| `npm run lint` | **0 errors, 0 warnings** |
| `npm run build` | Succeeds (numbers not re-measured this pass) |

**Findings from this refresh (found and fixed via the UI/UX appraisal above):** dark mode never re-themed `--green`/`--red`/`--amber`/`--teal`, leaving several text elements at ~1.4:1 contrast against the dark background; the landing page's hero heading rendered clipped under the header on every phone-width viewport; a mover with no town on file displayed as literally "Kenya,"; property cards only opened via their small "Details" button; the Account page had no way to actually edit a profile despite the Data Protection Policy promising one; a broken property image rendered the browser's bare broken-image icon instead of a placeholder; the mobile tab bar clipped mid-label with no scroll affordance; Workspace's listing status pill was never color-coded; empty states gave no actionable button; the registration password field had no show/hide or confirmation; and the signed-in mobile header stacked three separate full-width rows. All eleven fixed and re-verified live; see CHANGELOG's "Phase 1"–"Phase 3" entries for specifics.

---

## Mobile

### QA — methodology

- **Runner:** Jest via the `jest-expo` preset (`mobile/package.json`'s `jest` config), with React Native Testing Library (`@testing-library/react-native`) for render/interaction tests.
- **Layout:** 31 test files under `mobile/src/`, spanning `api/`, `components/`, `context/`, `navigation/`, `services/`, `utils/`, and one file per screen family under `screens/` (`account`, `admin` ×3, `auth` ×2, `dashboard` ×2, `discover` ×5, `feedback`, `movers` ×2, `notifications`, `requests`, `saved`, `workspace` ×3).
- **Known environment quirks** (documented on the wiki's Testing page, load-bearing for anyone adding new mobile tests):
  - `render()` and every `fireEvent.*()` call are `async` in this RNTL version and must be `await`ed — skipping this silently leaves state updates unflushed rather than throwing.
  - `Platform.OS` reports `"ios"` under Jest by default (not `"web"`), so screens that branch on platform (e.g. `DateTimePicker` vs. a web text-input fallback) need that accounted for — either stubbing the native module out (`jest.mock("@react-native-community/datetimepicker", () => "DateTimePicker")`) or deliberately overriding `Platform.OS` per-test.
  - Real (non-mocked) `setTimeout`-based debounce tests are isolated into their own file (e.g. `MoversScreen.debounce.test.js`, `AdminScreen.debounce.test.js`) rather than mixed into a screen's main synchronous test file — a stray timer callback from one test was found to leak into and corrupt a later, unrelated test otherwise.
  - `getByText` does not concatenate a `<Text>` element's multiple expression-children into one matchable string.
- **Lint:** `expo lint` (ESLint flat config, `mobile/eslint.config.js`). `eslint`/`jest` are deliberately pinned back from their latest majors pending `eslint-config-expo`/`jest-expo` compatibility (see CHANGELOG's dependency-upgrade entries) — this is a known, intentional constraint, not an oversight. It has been silently undone by an auto-merged Dependabot group bump twice now; `.github/dependabot.yml` gained explicit `ignore` rules for both packages' major versions after the second occurrence (see this report's QC findings below).
- **Live device/emulator verification:** not part of the automated suite. Every PR in the recent health-check remediation roadmap that touched mobile screens explicitly disclosed whether a live emulator run happened (most didn't, per this project's established honesty convention over claiming untested behavior works) — see individual CHANGELOG entries for exactly which mobile changes are test-level-only versus emulator-verified.
- **Coverage tooling:** none configured.

### QC — current results

| Check | Result |
|---|---|
| `npm test` | **167/167 passing**, 31 suites |
| `npm run lint` | **0 errors, 67 warnings** |

The 67 warnings are all `import/first` ("Import in body of module; reorder to top"), stemming from this codebase's deliberate convention of placing `jest.mock(...)` calls before the imports they affect (a common Jest pattern that this particular ESLint rule doesn't recognize as intentional). Confirmed pre-existing and unrelated to any specific change — not a regression, not blocking.

**Finding from this refresh (found and fixed):** both `npm run lint` and `npm test` were completely broken immediately before this snapshot — an auto-merged Dependabot group bump (the "16 updates" PR) had silently reintroduced `eslint@10.7.0`/`jest@30.4.2`, undoing a previous pin-back and crashing lint outright (`TypeError: contextOrFilename.getFilename is not a function`) and every single test suite (`this._moduleMocker.clearMocksOnScope is not a function`, 0 of 31 suites able to even start). This went unnoticed because CI is currently disabled (see the ISO 27001 SoA). Separately, `jest.setup.js`'s `@react-native-async-storage/async-storage` mock import (`.../jest/async-storage-mock`) had gone stale against that package's own export-map change (the mock now lives at `.../jest`, not `.../jest/async-storage-mock`) — a second, independent breakage affecting 4 suites. Both fixed; `.github/dependabot.yml` now blocks major-version bumps for `eslint`/`jest` in this package specifically.

---

## Cross-cutting observations

- **All three packages are currently clean**: 864 total automated tests passing (465 backend + 234 frontend + 167 mobile), 0 lint errors anywhere.
- **A live Android emulator attempt this session OOM-crashed** three separate times (across two sessions) before finishing a cold boot, unrelated to any code change - the host currently has 0 swap available (disabled while troubleshooting a prior crash, and not restorable from inside this container - needs `wsl --shutdown` run from a Windows-side terminal). Backend/frontend dev servers were unaffected each time. This is why the UI/UX appraisal above covers only the web frontend, not the native mobile app.
- **The dev database was cleaned of accumulated QA/test accounts** this session: 57 of 73 users were ad-hoc test data from prior manual testing sessions, never removed afterward. A reusable `deleteUserCascade` service and a dry-run-first cleanup script now exist (`backend/scripts/cleanupTestData.js`) so this doesn't require one-off scripting again - see CHANGELOG's "admin user-deletion" entry.
- **No code coverage tooling** is configured in any of the three packages. Breadth is currently maintained by convention (new source files get a corresponding test file) rather than measured by a coverage percentage or gate. Worth considering if coverage regressions become a concern as the codebase grows.
- **Mobile has no automated device/emulator testing** — only Jest's simulated RN environment. Real Android-emulator verification happens ad hoc and is explicitly called out per-PR when it does (or doesn't) happen; iOS has never been verified on a real device/simulator (tracked in README's "Next" section).
- **`mobile/package.json`/`mobile/package-lock.json`** show ongoing Expo-driven dependency drift, unrelated to any code change — flagged repeatedly across recent PRs rather than committed or reverted without understanding its origin.
- **CI is currently disabled** (`.github/workflows/ci.yml`, manually disabled at the GitHub Actions level — see the [ISO 27001 SoA](iso27001-statement-of-applicability.md)). Every "CI runs X" statement elsewhere in this report describes what the workflow is *configured* to do, not something currently happening on every push/PR — this snapshot's numbers all come from running the commands manually. This is also precisely why the mobile regression noted above went uncaught for as long as it did.
