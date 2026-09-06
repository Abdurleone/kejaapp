# QA & QC Report

A point-in-time quality report for all three packages (backend, frontend, mobile), split per package into **QA** (the testing methodology/process in place — what's covered and how) and **QC** (the actual current results of running it). Regenerate the QC numbers with `npm test`/`npm run lint` (root-level scripts fan out to all three; see `package.json`) whenever this needs refreshing — they're a snapshot, not a live dashboard.

**Snapshot taken:** 2026-09-06, commit `119d870` (`main`), refreshed after a busy session: a second whole-app appraisal (14 more findings, all fixed - PR #322), a design-checklist pass (pill buttons → 8px radius, emoji icons → SVG - PR #321), and a documentation-accuracy sweep across `CLAUDE.md`/`Roadmap.md`/`live.md`/`Architecture.md` that found and corrected two real stale claims (see Cross-cutting observations). This pass also found and fixed one new backend dependency vulnerability and one mobile lockfile drift issue - see each package's section below. The previous snapshot (2026-08-25, commit `bba1aad`) is superseded below.

## How to reproduce

```bash
npm run test:backend   # or: cd backend && npm test
npm run test:frontend  # or: cd frontend && npm test
npm run test:mobile    # or: cd mobile && npm test -- --maxWorkers=2 (see mobile note below)
npm run lint            # all three, or npm run lint:backend / :frontend / :mobile
```

**Mobile-specific note**: this dev container has 12 CPUs but only 7.5GB RAM with no memory cap configured; Jest's default (uncapped) worker count has caused a real OOM crash here before (killed the VS Code server process mid-test-run). Always run mobile's suite with `--maxWorkers=2` in this specific environment - not needed on a normal dev machine or CI runner with more headroom.

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
| `npm test` | **613/617 passing**, 113 suites, 4 failures (all pre-existing/environment-specific - see below) |
| `npm run lint` | **0 errors, 0 warnings** |
| `npm audit --omit=dev` | **0 vulnerabilities** (see finding below - fixed this snapshot) |
| Production (`kejaapp-backend-7iu3.onrender.com`) | `/api/health/live`, `/api/health/ready`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` all `200` |

**One new finding this snapshot, fixed**: `npm audit` turned up a moderate-severity `qs` vulnerability (array-limit bypass + a DoS via attacker-controlled `isBuffer`, `GHSA-x5fp-wj9c-mxmx`/`GHSA-4mjr-xmp4-gh2g`) - a transitive dependency of `express@5.2.1` via `body-parser`, pinned at `qs@6.15.2` while the fixed `6.16.0` exists but Express hasn't bumped its own pin yet. Added a `package.json` `overrides` entry forcing `qs@^6.16.0` across the tree - a safe minor bump, confirmed with the full suite still passing (613/613 of the tests that were passing before, same 4 pre-existing failures) and lint clean. `npm audit` now reports 0 vulnerabilities.

The 4 failures are unchanged from every prior snapshot and are a stray environment gotcha, not a regression: this dev container has real `SENTRY_DSN`/`BACKUP_S3_*` values in its local environment, which flips the tests asserting the "unconfigured/disabled" default behavior. Don't source a real `.env` before running this suite if you want those 4 to pass too.

---

## Frontend

### QA — methodology

- **Two runners, one command:** `npm test` runs `node --test` first, then `vitest run` (`frontend/package.json`).
- **`node --test` suite** (`frontend/tests/*.test.js`, 6 files, 92 tests): pure-function/API-helper coverage, a real-backend `auth-flow.integration.test.js`, `responsive-css.test.js`.
- **Vitest + jsdom + React Testing Library suite** (`frontend/tests/*.render.test.jsx`, 25 files): real render + interaction tests per page component.
- **Lint:** ESLint flat config (`frontend/eslint.config.js`).
- **Build:** `vite build` — not currently run by CI (disabled), verified manually this snapshot.

### QC — current results

| Check | Result |
|---|---|
| `node --test` (`npm run test:node`) | **92/92 passing**, 6 suites |
| `vitest run` (`npm run test:render`) | **214/214 passing**, 25 files |
| `npm run lint` | **0 errors, 0 warnings** |
| `npm run build` | Succeeds — 59 modules transformed, main JS bundle 338.3 kB (gzip 92.0 kB), CSS 21.5 kB (gzip 5.2 kB) |
| `npm audit --omit=dev` | **0 vulnerabilities** |

No new findings this snapshot beyond what the second whole-app appraisal already covered (see Cross-cutting observations) - all clean on a fresh check.

---

## Mobile

### QA — methodology

- **Runner:** Jest via the `jest-expo` preset, with React Native Testing Library.
- **Layout:** 40 test files under `mobile/src/`.
- **Lint:** `expo lint`, flat config via `eslint-config-expo`.
- **Compatibility gate:** `npx expo-doctor` is the source of truth for whether installed package versions match what the installed Expo SDK actually bundles — semver alone is not reliable for Expo-tied native packages (see the incident history in prior snapshots).

### QC — current results

| Check | Result |
|---|---|
| `npm test` (fresh `rm -rf node_modules package-lock.json && npm install --legacy-peer-deps`) | **40/40 suites, 247/247 tests passing** (`--maxWorkers=2`, see the environment note above) |
| `npm run lint` | **0 errors, 86 warnings** (all pre-existing `import/first`, same intentional `jest.mock`-before-imports pattern as prior snapshots) |
| `npx expo-doctor` | **19/21 checks pass** — the pre-existing, already-accepted "eas-cli installed locally instead of globally" advisory, plus a single `react-native` patch-version mismatch (`0.86.2` installed vs `0.86.3` expected - ordinary upstream drift, not a bad bump) |
| `npm audit --omit=dev` | **7 moderate vulnerabilities, no fix available - see finding below** |

**Two findings this snapshot:**

1. **Fixed: a stale lockfile had `@react-navigation/native-stack`/`@react-navigation/bottom-tabs` installed below `package.json`'s own declared `^` ranges** (`npm ls` flagged both `invalid`). A fresh `rm -rf node_modules package-lock.json && npm install --legacy-peer-deps` resolved it cleanly and, as a side effect, cleared 12 of the 13 patch-version mismatches `expo-doctor` had been showing (only `react-native` itself remains one patch behind). Full suite re-verified afterward: 247/247 passing, 0 lint errors.
2. **New, currently unfixable without a breaking downgrade: `@react-navigation/core` (and by extension `native`/`bottom-tabs`/`elements`/`native-stack`) transitively depends on a vulnerable `query-string@7.1.3` → `decode-uri-component@0.2.2` chain** (`GHSA-vcc3-ghjq-m6fr`, DoS via exponential decoding of malformed percent-encoded input). Confirmed this isn't a lag in our own lockfile: `@react-navigation/core@7.21.13` is the actual latest published release, and it still declares `query-string: ^7.1.3` itself - `npm audit` correctly reports "No fix available," not just "fix available via a bump we haven't taken." `npm audit fix --force` would downgrade `@react-navigation/native-stack` to `5.0.5`, a major, app-breaking regression, not a real fix. Deliberately deferred, same policy as the already-documented `minimatch`/`eas-cli` alert: this needs an upstream fix from the React Navigation team, not action on our end. Worth noting this is now a **production**-path dependency (unlike `eas-cli`, which is dev-only tooling) - the realistic exposure is a malicious deep-link URL reaching React Navigation's own query-string parsing, not something a normal user flow would trigger. Revisit whenever `@react-navigation/core` cuts a new release.

---

## Cross-cutting observations

- **All three packages are clean on a fresh install**: 953 total automated tests passing (613 backend + 306 frontend [92 node:test + 214 Vitest] + 247 mobile), 0 lint errors anywhere, 0 `npm audit` vulnerabilities in backend/frontend (mobile carries the one upstream-blocked react-navigation chain above).
- **CI remains enabled but account-billing-locked** (re-confirmed this snapshot via `gh run list` — every run still fails in ~4s with "your account is locked due to a billing issue," zero job steps executed). Unchanged risk from every prior snapshot: nothing automated catches a regression before merge.
- **A second whole-app appraisal (3 parallel read-only agents over backend/frontend/mobile) found and fixed 14 more findings** since the last snapshot - most severe an admin-account-deletion bug that destroyed *other users'* Feedback records (same actor-vs-subject cascade bug already fixed elsewhere, never extended to this model, and locked in by a test that had been asserting the buggy behavior as correct). See `CHANGELOG.md`'s "Second Whole-App Appraisal" entry for the complete 14-item list. Two of the three fix-implementation passes were interrupted mid-session; re-running each package's full suite from scratch (rather than trusting the diff) caught one real regression a diff-only review would have missed.
- **A design-checklist pass fixed two more findings outside the appraisal**: app-wide pill-shaped buttons (999px radius) switched to the same 8px radius already used for panels/menus, and two raw emoji icons (a bell, a broken-image house) replaced with proper inline SVGs. The landing page's own deliberately different pill-shaped/sticker visual identity was left untouched. See `CHANGELOG.md`.
- **A confirmed, previously-undocumented production gap: the scheduled notification jobs (`backend/jobs/`) are not running at all against production.** The Kubernetes `CronJob` that would run them every 15 minutes only exists on the non-live k8s path; Render (the actual live deployment) has no Cron Job service - confirmed directly in Render's dashboard. Viewing reminders, post-viewing review prompts, and stale-listing/inquiry nudges are silently not firing for real users. Three fix options assessed and deliberately deferred for now (a paid Render Cron Job, a new authenticated endpoint + free external pinger, or waiting on the CI billing lock above to clear). See `docs/project/Roadmap.md`'s Next section.
- **Support KejaApp (M-Pesa) sandbox setup hit a real, still-open bug**: all 6 `MPESA_*` vars are now genuinely set on Render, and two live sandbox test payments through the production UI were both accepted by Daraja (reaching the phone-PIN-prompt state) - but Safaricom's asynchronous result callback never arrived at either, confirmed via Render's own logs showing no inbound request at all. Root cause still open; next debugging step is Safaricom's own Query STK Push Transaction Status API. See `docs/project/live.md`.
- **A documentation-accuracy pass found and fixed two genuinely stale/misleading claims**: `Roadmap.md`'s 2026-08-14 appraisal table still marked the Liquid Glass crash fix as "Paused/unverified" despite a later entry in the same file already confirming it fixed and verified on-device, and `CLAUDE.md`/`Architecture.md`/`live.md` all implied the scheduled-jobs CronJob "runs in production" when it only ever ran on the non-live k8s path. All four files corrected, plus the wiki mirror for `Roadmap.md`/`live.md`.
- **Dependency vulnerabilities**: backend's new `qs` finding fixed this snapshot (see Backend section). Mobile's react-navigation → query-string → decode-uri-component chain is new, real, and currently unfixable upstream (see Mobile section) - not the same issue as the already-known, already-deferred `minimatch`/`eas-cli` dev-only alert, which is unchanged.
- **No code coverage tooling** configured in frontend or mobile, same as every prior snapshot.
- **No dead-code sweep performed this snapshot** — the two appraisals and the documentation pass were a higher-yield use of this refresh.
