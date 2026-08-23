# QA & QC Report

A point-in-time quality report for all three packages (backend, frontend, mobile), split per package into **QA** (the testing methodology/process in place — what's covered and how) and **QC** (the actual current results of running it). Regenerate the QC numbers with `npm test`/`npm run lint` (root-level scripts fan out to all three; see `package.json`) whenever this needs refreshing — they're a snapshot, not a live dashboard.

**Snapshot taken:** 2026-08-23, commit `16ced49` (`main`). Refreshed after a stretch of unverified work since the previous snapshot (2026-08-12, commit `065b0fb`, superseded below): the docs `compliance`/`dev` cross-reference fixes, the Database Access Policy and SOC 2 Readiness Assessment/COPPA docs, and several Dependabot group merges (backend, frontend, two rounds of mobile). None of those had been checked against a full, fresh test/lint/lockstep-Dependabot pass until this one — and this refresh's real yield was a serious one: **mobile's test suite could not run at all from a clean install**, unnoticed for two merged PRs.

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
| Live local backend (`npm run dev`, real MongoDB) | `/api/health/live`/`/api/health/ready` both healthy; `GET /api/properties` returns real seeded data; a NoSQL-operator-injection probe (`?type[$gt]=`) returns a normal, safely-ignored result rather than a 500 or an unfiltered dump — the earlier security-audit fix for this still holds |
| Production (`kejaapp-backend-7iu3.onrender.com`) | `/api/health/live`, `/api/health/ready`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` all `200` |

No regressions found this snapshot; a stray environment gotcha worth recording: running `npm test` with real `SENTRY_DSN`/`BACKUP_S3_*` values present in a local `.env` flips 4 tests that assert the "unconfigured/disabled" default — not a bug, just don't source a real `.env` before running the suite that checks the empty-config path.

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
| `npm run build` | Succeeds — 59 modules transformed, main JS bundle 326.6 kB (gzip 89.2 kB), CSS 20.3 kB (gzip 5.0 kB), built in ~1.2s |
| Live local frontend (`npm run dev`) | Serves `200` at `/` |

No findings this snapshot beyond the above — all green.

---

## Mobile

### QA — methodology

- **Runner:** Jest via the `jest-expo` preset, with React Native Testing Library.
- **Layout:** 38 test files under `mobile/src/`.
- **Lint:** `expo lint`, flat config via `eslint-config-expo`.
- **Compatibility gate:** `npx expo-doctor` is the source of truth for whether installed package versions match what the installed Expo SDK actually bundles — semver alone is not reliable for Expo-tied native packages (see the real incident below).
- **Live device/emulator verification:** not part of the automated suite, unchanged from prior snapshots.

### QC — current results

| Check | Result |
|---|---|
| `npm test` (fresh `npm ci`/`npm install --legacy-peer-deps`, no pre-existing `node_modules`) | **38/38 suites, 216/216 tests passing** — only after the fix below |
| `npm run lint` | **0 errors, 82 warnings** (all pre-existing `import/first`, same intentional `jest.mock`-before-imports pattern as prior snapshots) |
| `npx expo-doctor` | **20/21 checks pass** — the 1 remaining is the pre-existing, already-accepted "eas-cli installed locally instead of globally" advisory, unrelated to this snapshot |

**The most significant finding of this snapshot, and arguably of any snapshot so far: mobile's test suite could not run at all from a clean install, for two merged PRs' worth of time, with zero signal anywhere that this was true.**

Root cause: PR #269 (a `mobile-dependencies` Dependabot group bump, merged in the session before this one) carried `react-native` from `0.86.2` to `0.87.0` — one version past what the installed `expo@~57.0.x` actually bundles (`npm view expo@57.0.14 devDependencies` shows Expo's own toolchain is built and tested against `react-native@0.86.2` exactly, not a range). `npx expo-doctor` flagged this immediately once run: 5 minor-version mismatches (`react-native`, `@sentry/react-native`, `react-native-safe-area-context`, `react-native-screens`, `react-native-worklets`) and 11 patch-level ones. A subsequent PR (#284, also merged the session before this one) bumped several of the patch-level ones further, on top of the already-wrong `react-native` pin.

The practical effect: a fresh `npm ci` against `main`'s own committed lockfile could not run `jest` at all — not a failing test, a **hard crash before any test file loads** (`jest-expo`'s preset requires `@react-native/jest-preset` as a real peer dependency of the installed `react-native` version, and that peer was never auto-installed by `npm install --legacy-peer-deps`, which skips peer conflicts rather than resolving them). This went undetected through two merged PRs because **CI is disabled** and nobody ran a truly clean reinstall in between — the local `node_modules` directories used to verify those two PRs were stale carryovers from before the `react-native` bump, which is why "all tests passing" kept getting reported right up until this snapshot's from-scratch reinstall exposed it.

**Fixed, in full**:
1. Reverted all 5 minor-drifted packages and 11 patch-drifted ones to the exact versions `npx expo-doctor` reports as correct for the installed Expo SDK (`react-native` 0.87.0 → 0.86.2; `@sentry/react-native` 7.13.0 → 7.11.0; `react-native-safe-area-context` 5.9.1 → 5.7.0; `react-native-screens` 4.27.0 → 4.26.0; `react-native-worklets` 0.12.1 → 0.10.1; `react`/`react-dom` 19.2.8 → 19.2.3; `react-native-reanimated` 4.5.3 → 4.5.1; `react-native-svg` 15.15.5 → 15.15.4; `expo` and five `expo-*` packages patch-bumped forward to their SDK-current versions).
2. Along the way, found and fixed **two more missing peer dependencies** that a clean install never surfaces via any error short of a crash: `@testing-library/react-native@14.0.1` peer-requires a package literally named `test-renderer` (a newer, separate package from React's own `react-test-renderer`, introduced for React Native's testing needs) — added as a devDependency. `eslint-config-expo`'s bundled `@typescript-eslint` tooling requires `typescript` to be installed even in a project with zero `.ts` files — added as a devDependency (`~6.0.3`, the newest version satisfying `@typescript-eslint/eslint-plugin`'s `>=4.8.4 <6.1.0` peer range).
3. Added a permanent `dependabot.yml` ignore rule for `react-native` itself (all update types, not just major — this incident was a plain minor bump) — see the file's own comment for the full incident writeup. `react-native` should only be bumped deliberately, via `npx expo install --fix` alongside an intentional Expo SDK upgrade, never by an automated group bump.

Verified clean end-to-end after the fix: a fully fresh `rm -rf node_modules && npm install --legacy-peer-deps` followed by `npx jest` (38/38, 216/216), `npm run lint` (0 errors), and `npx expo-doctor` (20/21, only the pre-existing eas-cli advisory left).

---

## Cross-cutting observations

- **All three packages are currently clean on a fresh install**: 887 total automated tests passing (584 backend + 273 frontend + 216 mobile *after* the mobile fix — it was 0 mobile tests runnable before it, for a total of 671, going into this snapshot), 0 lint errors anywhere.
- **This snapshot's real yield is the mobile finding above** — the same underlying lesson as every prior snapshot's findings, but the worst version of it yet: **CI has been disabled since 2026-07-06** (confirmed still in effect this snapshot — every recent run fails in ~2-5s with "your account is locked due to a billing issue," zero job steps executed), so nothing that would normally catch a broken clean-install state gets caught until someone manually does one. Two prior snapshots each found one Dependabot-driven mobile regression; this one found a regression that made the *entire test suite unrunnable* survive two merged PRs undetected, because "it still passes" was being checked against a stale `node_modules`, not a real clean install. **Recommendation for future refreshes: always `rm -rf node_modules` before trusting a green mobile result.**
- **Docs**: a link-health sweep across all 47 markdown files under `docs/` (365 relative links checked) found 4 genuinely broken repo-relative links in `docs/project/CHANGELOG.md`/`Roadmap.md` — leftover from the `compliance`/`dev`/`project` folder reorg, missed at the time because they were prose-embedded backticked links inside older changelog narrative entries rather than part of the structured reference list the reorg's own link-checker was run against. Fixed (all four needed a `../compliance/` prefix they were missing). No other broken links found; the ~58 other "broken" hits the sweep initially flagged are bare wiki-style names (e.g. `Architecture`, `Testing`) that are correct links *in the separate GitHub Wiki repo* and are expected not to resolve inside this repo's own `docs/` tree.
- **Dependabot security alerts**: 2 open (`image-size`, `minimatch`, both DoS/ReDoS-class CVEs in `mobile/package-lock.json`). Consistent with prior, already-documented policy — `image-size` already carries a prior `dismissed` alert on record, part of the same known `eas-cli`/`metro` transitive chain that's been deliberately left for upstream rather than forced (forcing would downgrade `eas-cli`/`expo` to versions this project has already been burned by). No open Dependabot PRs remain (all prior ones resolved in the previous session's PR-cleanup pass).
- **No code coverage tooling** configured in frontend or mobile, same as every prior snapshot. Backend's opt-in `test:coverage` wasn't re-run this snapshot (no code changed in a way likely to move it).
- **No dead-code sweep performed this snapshot** — this refresh's time went entirely to the mobile clean-install investigation and the docs link sweep, both higher-yield than a repeat dead-code pass this soon after the last one.
- **Mobile emulator/device verification status is unchanged** — not re-attempted this pass (this was a test/lint/dependency/link-health refresh, not a live-device pass). iOS remains unverified on a real device/simulator.
