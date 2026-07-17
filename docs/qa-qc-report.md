# QA & QC Report

A point-in-time quality report for all three packages (backend, frontend, mobile), split per package into **QA** (the testing methodology/process in place — what's covered and how) and **QC** (the actual current results of running it). Regenerate the QC numbers with `npm test`/`npm run lint` (root-level scripts fan out to all three; see `package.json`) whenever this needs refreshing — they're a snapshot, not a live dashboard.

**Snapshot taken:** 2026-07-17, commit `6010028` (`main`), immediately after the 28-item general health-check remediation roadmap (PRs #80–#107) completed. All three packages were clean at this point with zero uncommitted changes other than the pre-existing, untouched `mobile/package.json`/`package-lock.json` Expo dependency drift (see CHANGELOG.md).

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
- **Layout:** `backend/tests/` mirrors the source tree 1:1: `controllers/` (18 files), `models/` (11), `services/` (11), `validators/` (9), `utils/` (9), `middlewares/` (6), `jobs/` (6), `config/` (4), `seeders/` (1), `docs/` (1) — 79 suites, 436 tests total.
- **Unit vs. integration split:** the vast majority are unit-style, with dependencies (Mongoose models, external services) mocked. `backend/tests/integration/` holds two real-database suites (`apiFlows.integration.test.js`, `mongodb.integration.test.js`) that self-skip (`describe(..., { skip: !testMongoUri })`) unless `TEST_MONGODB_URI` is set — they don't run on a bare local `npm test`, but CI's `backend` job sets `TEST_MONGODB_URI` against a real `mongo:7` service container, so they do run there.
- **Lint:** ESLint flat config (`backend/eslint.config.js`).
- **CI:** `.github/workflows/ci.yml`'s `backend` job runs lint then test against the real MongoDB container on every push/PR to `main` (see `docs/devops.md`).
- **Coverage tooling:** none configured. Test breadth is tracked qualitatively (mirrors the source tree; new controllers/services/validators get a corresponding test file as a matter of convention) rather than via a coverage percentage gate.

### QC — current results

| Check | Result |
|---|---|
| `npm test` | **436/436 passing**, 79 suites, 0 failures, 0 skipped |
| `npm run lint` | **0 errors, 0 warnings** |
| Integration suites (`TEST_MONGODB_URI` set) | Both pass in CI against a real `mongo:7` container |

No findings.

---

## Frontend

### QA — methodology

- **Two runners, one command:** `npm test` runs `node --test` first, then `vitest run` (`frontend/package.json`). Split scripts (`test:node`, `test:render`) exist for running either half alone.
- **`node --test` suite** (`frontend/tests/*.test.js`, 6 files): pure-function/API-helper coverage (`api-helpers.test.js`, `app.test.js`, `request-cache.test.js`), a real-backend `auth-flow.integration.test.js`, `responsive-css.test.js` (regex-asserts specific CSS rules exist, used to guard mechanical CSS refactors), and `page-components.test.js` — a legacy regex-source-matching suite predating the Vitest render-test migration (see CHANGELOG's Phase 4 entries); most of what it once covered has since been superseded by dedicated `.render.test.jsx` files, but it hasn't been fully retired.
- **Vitest + jsdom + React Testing Library suite** (`frontend/tests/*.render.test.jsx`, 15 files): real render + interaction tests for every page component (`AccountPage`, `AdminPage`, `App`, `AuthModal`, `DashboardPage`, `DiscoverPage`, `FeedbackPage`, loading skeletons, `MoversPage`, `NotificationsPage`, `PropertyCreatePage`, `PropertyDetailPage`, `PropertyEditPage`, `SavedPage`, `WorkspacePage`). This is the suite that actually exercises component behavior (clicks, form fills, async fetch/error/retry states, race-condition guards) rather than just asserting JSX source text exists.
- **Live/manual verification:** Playwright is used ad hoc during development (via a scratch driver script, not committed to the repo) to verify behavior that's impractical to unit test — real out-of-order network races, focus traps, print-stylesheet rendering, actual browser dialog semantics. This is **not** part of the automated `npm test` run; it's a manual step taken PR-by-PR for UI-visible changes (documented per-PR in CHANGELOG.md).
- **Lint:** ESLint flat config (`frontend/eslint.config.js`).
- **Build:** `vite build` — CI's `frontend` job runs it after tests to catch build-breaking errors.
- **Coverage tooling:** none configured, same as backend.

### QC — current results

| Check | Result |
|---|---|
| `node --test` (`npm run test:node`) | **80/80 passing**, 6 suites |
| `vitest run` (`npm run test:render`) | **106/106 passing**, 15 files |
| `npm run lint` | **0 errors, 0 warnings** |
| `npm run build` | Succeeds (`dist/` ~301 KB JS / ~83 KB gzipped) |

No findings.

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
- **Lint:** `expo lint` (ESLint flat config, `mobile/eslint.config.js`). `eslint`/`jest` are deliberately pinned back from their latest majors pending `eslint-config-expo`/`jest-expo` compatibility (see CHANGELOG's dependency-upgrade entries) — this is a known, intentional constraint, not an oversight.
- **Live device/emulator verification:** not part of the automated suite. Every PR in the recent health-check remediation roadmap that touched mobile screens explicitly disclosed whether a live emulator run happened (most didn't, per this project's established honesty convention over claiming untested behavior works) — see individual CHANGELOG entries for exactly which mobile changes are test-level-only versus emulator-verified.
- **Coverage tooling:** none configured.

### QC — current results

| Check | Result |
|---|---|
| `npm test` | **153/153 passing**, 31 suites |
| `npm run lint` | **0 errors, 67 warnings** |

The 67 warnings are all `import/first` ("Import in body of module; reorder to top"), stemming from this codebase's deliberate convention of placing `jest.mock(...)` calls before the imports they affect (a common Jest pattern that this particular ESLint rule doesn't recognize as intentional). Confirmed pre-existing and unrelated to any specific change — not a regression, not blocking.

No test failures. No functional findings.

---

## Cross-cutting observations

- **All three packages are currently clean**: 775 total automated tests passing (436 backend + 186 frontend + 153 mobile), 0 lint errors anywhere.
- **No code coverage tooling** is configured in any of the three packages. Breadth is currently maintained by convention (new source files get a corresponding test file) rather than measured by a coverage percentage or gate. Worth considering if coverage regressions become a concern as the codebase grows.
- **Mobile has no automated device/emulator testing** — only Jest's simulated RN environment. Real Android-emulator verification happens ad hoc and is explicitly called out per-PR when it does (or doesn't) happen; iOS has never been verified on a real device/simulator (tracked in README's "Next" section).
- **`mobile/package.json`/`mobile/package-lock.json`** show ongoing Expo-driven dependency drift, unrelated to any code change — flagged repeatedly across recent PRs rather than committed or reverted without understanding its origin.
