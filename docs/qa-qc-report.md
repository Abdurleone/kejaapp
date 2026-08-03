# QA & QC Report

A point-in-time quality report for all three packages (backend, frontend, mobile), split per package into **QA** (the testing methodology/process in place — what's covered and how) and **QC** (the actual current results of running it). Regenerate the QC numbers with `npm test`/`npm run lint` (root-level scripts fan out to all three; see `package.json`) whenever this needs refreshing — they're a snapshot, not a live dashboard.

**Snapshot taken:** 2026-08-03, commit `7245c8a` (`main`). Refreshed after: a documentation-accuracy pass on the README rewrite and the live wiki; a real mobile crash found and fixed on an actual booted emulator (`@react-native-async-storage/async-storage` major-version mismatch against the installed Expo SDK); a full-codebase dead-code sweep across all three packages; and a hands-on review (not a rubber stamp) of three open Dependabot PRs, each checked out and test/lint/build-verified individually before merging. The previous snapshot (2026-07-28, commit `8ae7413`) is superseded below.

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
- **Coverage tooling:** `npm run test:coverage` runs `node --experimental-test-coverage --test` — Node's built-in coverage reporter, zero new dependencies. Opt-in (not part of the default `test` script or CI's test step): a diagnostic report, not a gate — `--test-coverage-lines`/`branches`/`functions` thresholds exist but are deliberately not set, since `CI` is currently disabled and a threshold nothing enforces is just dead config; revisit once/if `CI` itself is re-enabled. Test breadth is otherwise still tracked qualitatively (mirrors the source tree; new controllers/services/validators get a corresponding test file as a matter of convention).

### QC — current results

| Check | Result |
|---|---|
| `npm test` | **466/466 passing**, 84 suites, 0 failures, 0 skipped |
| `npm run lint` | **0 errors, 0 warnings** |
| Integration suites (`TEST_MONGODB_URI` set) | Both pass in CI against a real `mongo:7` container |
| `npm run test:coverage` | **91.4% lines, 92.4% branches, 90.7% functions** (opt-in report, not a gate) |

**Findings from this refresh:** a dead-code sweep (Explore-agent pass, every finding verified against a repo-wide grep before acting) removed one genuinely-orphaned RBAC grouping — `roleGroups.admins` in `constants/rbac.js`, unused because admin routes gate on the string literal `"admin"` directly — plus un-exported six constants that were only ever used inside their own defining file with zero external importers (`inquiryValidators.manageableInquiryStatuses`, `viewingValidators.actionableViewingStatuses`, `moverRequestValidators.manageableMoverRequestStatuses`, `propertyValidators.contactMethods`/`viewingTypes`, `fileStorageService.allowedImageMimeTypes`, `moverController.buildMoverFilters`). Deliberately left alone: `httpStatus.js`'s 2 currently-unused status codes and `moverPricing.js`'s pricing constants, both reference/tunable tables meant to stay discoverable rather than accidental leftovers. Separately, a Dependabot bump of `expo-server-sdk` (6.1.0 → 7.0.0, a major version) was reviewed by checking out the PR branch directly rather than trusting the changelog alone — its only breaking change is dropping Node <22.12 support (this host runs 22.22), and the existing test suite mocks only the network call (`Expo.prototype.sendPushNotificationsAsync`), not the whole module, so it already exercised the real v7 class; merged after confirming 465/465 still passing.

**Findings from a follow-up refresh:** a fresh targeted look past all the prior appraisal passes turned up three more real gaps, now fixed. `PushReceipt` had no index on `createdAt`, despite `pollExpoPushReceipts.js`'s only two queries filtering/sorting on exactly that field every 15-minute run (full collection scan each time) — added, verified against a real local MongoDB (no `pushreceipts` collection existed anywhere locally before this, so a new integration-test assertion creates one and confirms the index via `getIndexes()`, independently re-confirmed via `mongosh`). `backend/docs/openapi.js` (served live at `GET /api/docs/openapi.json`) documented only ~15 of ~83 real registered routes — completed, matching its existing lightweight style with no new schema depth, plus a permanent completeness test that statically parses `app.js`'s own mount declarations rather than Express 5's harder-to-introspect live router internals; proved the test catches real regressions by temporarily deleting an entry and confirming it failed. `docs/API-Reference.md`'s Auth section was separately found missing `DELETE /api/auth/me` during that same audit — fixed there and on the live wiki. The coverage-tooling row above (91.4%/92.4%/90.7%) was the third finding from this pass.

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
| `npm run build` | Succeeds — `54 modules transformed`, main JS bundle 313.4 kB (gzip 85.6 kB), CSS 16.1 kB (gzip 4.3 kB), built in ~170ms |

**Findings from a prior refresh (found and fixed via the UI/UX appraisal):** dark mode never re-themed `--green`/`--red`/`--amber`/`--teal`, leaving several text elements at ~1.4:1 contrast against the dark background; the landing page's hero heading rendered clipped under the header on every phone-width viewport; a mover with no town on file displayed as literally "Kenya,"; property cards only opened via their small "Details" button; the Account page had no way to actually edit a profile despite the Data Protection Policy promising one; a broken property image rendered the browser's bare broken-image icon instead of a placeholder; the mobile tab bar clipped mid-label with no scroll affordance; Workspace's listing status pill was never color-coded; empty states gave no actionable button; the registration password field had no show/hide or confirmation; and the signed-in mobile header stacked three separate full-width rows. All eleven fixed and re-verified live; see CHANGELOG's "Phase 1"–"Phase 3" entries for specifics.

**Findings from this refresh:** a Dependabot bump of `@vitejs/plugin-react`/`jsdom`/`vite` (all patch/minor) was checked out and verified directly — tests, lint, and a real production build all pass — before merging. The dead-code sweep also found and removed three genuinely-orphaned `roleGroups` keys in `app-utils/access.js` (`propertyOwners`, `agencies`, `admins` — the same drift as the backend's equivalent, found independently), all confirmed via repo-wide grep to have zero references anywhere in `src/`.

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

**Finding from a prior refresh (found and fixed):** both `npm run lint` and `npm test` were completely broken immediately before that snapshot — an auto-merged Dependabot group bump had silently reintroduced `eslint@10.7.0`/`jest@30.4.2`, undoing a previous pin-back and crashing lint and every test suite outright. Both fixed; `.github/dependabot.yml` blocks major-version bumps for `eslint`/`jest` in this package.

**Findings from this refresh — the most significant of this snapshot:** the dev Android emulator finally completed a clean cold boot after 4 consecutive failed attempts across prior sessions (host swap had been recovered; the previous "0 swap available" blocker is resolved — see the corrected cross-cutting note below). Launching the actual app on it surfaced a real crash that the entire mocked test suite had missed: `AsyncStorageError: Native module is null, cannot access legacy storage`, three uncaught rejections deep, on every single launch. Root cause: an auto-merged Dependabot bump (PR #157) had carried `@react-native-async-storage/async-storage` to `3.1.1`, a major version ahead of what this Expo SDK 57 project actually expects (`2.2.0`, per `npx expo install --check` — the authoritative source here, not semver). Invisible to `npm test` because `jest.setup.js` mocks the entire module, and invisible to CI because it's disabled. Downgraded to `^2.2.0`, which surfaced a second, dependent issue — `jest.setup.js`'s mock import path only resolves under 3.x's package layout, so it needed updating to `.../jest/async-storage-mock` (2.2.0's actual layout) to get the suite passing again. Added a Dependabot `ignore` rule for this package's major-version bumps, the same treatment already given to `eslint`/`jest`, since its version needs to track the installed Expo SDK rather than ordinary semver. Live-verified on the real emulator after the fix: force-stopped Expo Go, reloaded against a restarted Metro, confirmed a clean landing-screen render with zero AsyncStorage errors in `logcat`.

Separately, this refresh's dead-code sweep found and fixed one real bug of its own: `MoverRequestFormScreen.test.js`'s "submits a valid future preferred date" test hardcoded `"2026-08-01"` as its example future date — correct when written, but by this snapshot's date the sandbox clock had genuinely passed it, so the app's own client-side date validation started rejecting it for real, failing the test for the right reason applied to a now-stale assumption. Fixed to compute tomorrow's date at runtime instead of a fixed calendar date — a pattern worth checking for elsewhere if similar "N days out" test fixtures start failing unexpectedly. The sweep itself found no other dead code beyond the one unused `theme/colors.js` default export noted below; mobile's source tree was otherwise unusually clean (no orphaned files, no unreachable branches, no commented-out code, no stale TODOs).

A Dependabot bump of `expo`/`expo-image-picker`/`expo-location`/`expo-notifications`/`eslint-config-expo`/`jest-expo` (7 updates, all patch/minor within SDK 57) was also reviewed by checking out the branch directly: its own CI would have shown one failing test, but that was the hardcoded-date bug above (the branch predated the fix) — rebased it onto `main` post-fix, re-verified 167/167, and merged.

**Dead-code finding:** `mobile/src/theme/colors.js`'s default export (`export default lightColors`) had zero references anywhere in `mobile/src` — its own comment already conceded it was "kept... for any lingering static usage" that never materialized, since every real consumer imports the named `{ lightColors, darkColors }` exports instead. Removed. One lower-confidence item was flagged but deliberately left alone: `ThemeContext`'s `setColorMode` is exposed on the context value but currently has no external consumer beyond `toggleColorMode` calling it internally — plausibly intentional forward-looking API surface (e.g. for a future explicit light/dark control, as opposed to only a toggle) rather than dead code, so left as a judgment call rather than removed.

---

## Cross-cutting observations

- **All three packages are currently clean**: 866 total automated tests passing (465 backend + 234 frontend + 167 mobile), 0 lint errors anywhere. (A prior snapshot stated 864 - a small arithmetic error, corrected here: 465+234+167 = 866.)
- **The Android emulator now boots cleanly** — corrected from a prior snapshot's claim of 3 consecutive OOM crashes with "0 swap available, not restorable from inside this container." That was accurate at the time; swap has since been restored at the host level (2.0Gi total) and this session completed multiple clean cold boots (`emulator-5554`, `device` state, `sys.boot_completed=1`) with no crashes. This is precisely what surfaced the real AsyncStorage crash detailed above — a bug the mocked test suite could never have caught on its own, only a real device/emulator run. Memory still runs tight under combined load (emulator + heavy test runs concurrently has triggered OOM-kills this session) - stopping the emulator before running full test suites is the current workaround, not a permanent fix.
- **The dev database was cleaned of accumulated QA/test accounts** in a prior session: 57 of 73 users were ad-hoc test data from prior manual testing sessions, never removed afterward. A reusable `deleteUserCascade` service and a dry-run-first cleanup script now exist (`backend/scripts/cleanupTestData.js`) so this doesn't require one-off scripting again - see CHANGELOG's "admin user-deletion" entry.
- **No code coverage tooling** is configured in any of the three packages. Breadth is currently maintained by convention (new source files get a corresponding test file) rather than measured by a coverage percentage or gate. Worth considering if coverage regressions become a concern as the codebase grows.
- **Mobile now has one genuine data point of real device/emulator verification this session** (the AsyncStorage crash, found and confirmed fixed live) - still not automated, and iOS has never been verified on a real device/simulator (tracked in README's "Next" section), but the tooling to do a real Android run now demonstrably works in this environment when memory allows.
- **`mobile/package.json` has a specific, currently-known dependency drift**: `npx expo install --check` flags `react`/`react-dom` (`19.2.8` installed vs. `19.2.3` expected) and `react-native-safe-area-context` (`5.8.0` vs. `~5.7.0` expected) as behind what Expo SDK 57 wants. Confirmed pre-existing (present on `main` before this session's Dependabot merges, not introduced by them) and not something breaking today - worth a deliberate look rather than an auto-merged bump, given this project's history with SDK-tied version mismatches (`async-storage` above; `eslint`/`jest` previously).
- **CI is still disabled** (`.github/workflows/ci.yml`, manually disabled at the GitHub Actions level since 2026-07-06's billing lock — see the [ISO 27001 SoA](iso27001-statement-of-applicability.md)). New this snapshot: GitHub's own default **CodeQL** scanning is also dead, for the same reason - its one and only run ("CodeQL Setup") failed on the same date, 2026-07-06, and hasn't run since. Every "CI runs X" statement elsewhere in this report describes what the workflow is *configured* to do, not something currently happening on every push/PR - every number in this report comes from running the commands manually. This is also precisely why both the mobile AsyncStorage regression and the `eslint`/`jest` regressions before it went uncaught for as long as they did.
