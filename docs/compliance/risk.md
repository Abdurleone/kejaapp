# KejaApp — Risk Register

## 1. Purpose and scope

This is a cross-cutting risk register for the whole codebase and its operating environment (backend, frontend, mobile, infrastructure, and process) — not a re-derivation of the detailed control-by-control assessments that already exist. Where a deep, itemized breakdown already exists elsewhere, this document **references it and ranks it**, rather than repeating it:

- [ISO/IEC 27001 Statement of Applicability](iso27001-statement-of-applicability.md) — all 93 Annex A:2022 controls, individually scored.
- [SOC 2 Readiness Assessment](soc2-readiness-assessment.md) — the same controls crosswalked onto SOC 2's Trust Services Criteria, with its own "what an auditor would flag first" ranking (Security/Availability/Confidentiality scope only).
- [Database Access Policy](database-access-policy.md) — the actual database access-control model.
- [Data Protection Impact Assessments](data-protection-impact-assessment.md) / [Records of Processing Activities](records-of-processing-activities.md) — data-protection-specific risk.
- [`qa-qc-report.md`](../project/qa-qc-report.md) — point-in-time test/lint/dependency health, refreshed periodically.

What's genuinely new here: a **single prioritized list spanning security, availability, data integrity, supply chain, product/business scope, and organizational risk together**, since no other document ranks across all of those at once — an auditor engaged for SOC 2 would only ever look at three of these categories, and the SoA is a controls checklist rather than a ranked list of what's actually likely to bite first.

**This is a self-assessment**, produced by reading the actual codebase, `render.yaml`, `docker-compose.yml`, `k8s/`, and the documents above — not an independent audit. Likelihood/impact ratings are judgment calls, not statistical estimates. Re-read this alongside `qa-qc-report.md` whenever either is refreshed; risk items move as things ship or drift.

## 2. Rating scheme

Each item gets a **Likelihood** and **Impact**, each Low/Medium/High, combined into an overall **Risk** the same way:

| | Impact: Low | Impact: Medium | Impact: High |
|---|---|---|---|
| **Likelihood: High** | Medium | High | Critical |
| **Likelihood: Medium** | Low | Medium | High |
| **Likelihood: Low** | Low | Low | Medium |

"Likelihood" here means *has this already happened, or is the precondition already true right now* — not a probabilistic forecast. Several items below are rated High/Critical precisely because the precondition (CI disabled, single instance, manual backups) is a **current, standing fact**, not a hypothetical.

## 3. Top risks, ranked

| # | Risk | Likelihood | Impact | Rating |
|---|---|---|---|---|
| 1 | [CI has been disabled since 2026-07-06](#41-ci-disabled-the-risk-multiplier-behind-most-other-entries-here) — nothing automated catches a regression before merge | High (true right now) | High | **Critical** |
| 2 | [Single free-tier Render instance](#42-single-instance-single-region-no-horizontal-scaling) — no redundancy, no autoscaling, cold starts | High (true right now) | High | **Critical** |
| 3 | [Database backup/restore is manual, not scheduled](#43-backuprestore-is-manual-a-real-capability-but-not-a-recurring-one) — one successful drill, no recurring cadence | Medium | High | **High** |
| 4 | [Expo-SDK-tied mobile dependencies can silently break tooling](#44-mobile-dependency-drift-a-demonstrated-repeat-failure-mode) — already happened 4 times | High (demonstrated 4x) | Medium | **High** |
| 5 | [No independent security/compliance audit has ever been performed](#45-no-independent-audit-of-any-kind) | High (true right now) | Medium | **High** |
| 6 | [No alerting/paging beyond uptime pings](#46-monitoring-exists-to-be-polled-nothing-pages-a-human) — a slow failure mode goes unnoticed | Medium | Medium | **Medium** |
| 7 | [Payment Boundary is a policy discipline, not a technical guardrail](#47-payment-boundary-enforced-by-discipline-not-by-code) | Low | High | **Medium** |
| 8 | [Solo/small-team organizational risk](#48-organizational-risk-no-segregation-of-duties) — no segregation of duties, bus-factor of one | Medium | Medium | **Medium** |
| 9 | [Mobile iOS path never verified on real hardware](#49-mobile-ios-never-verified) | High (true right now) | Low | **Low** |
| 10 | [One open Dependabot alert, DoS-class, deliberately unforced](#410-known-deliberately-accepted-dependency-alerts) | Medium | Low | **Low** |
| 11 | [Rate limiting trusts `X-Forwarded-For` under `TRUST_PROXY`](#411-rate-limit-key-derivation-trusts-the-proxy-chain) | Low | Low | **Low** |
| 12 | [`k8s/` manifests pin container images to `:latest`](#412-kubernetes-reference-path-uses-latest-image-tags) | Low (path isn't deployed) | Low | **Low** |
| 13 | [Mobile live-device testing infrastructure is fragile in this dev environment](#413-mobile-live-device-testing-is-genuinely-hard-here) — real bugs take real effort to catch | High (demonstrated) | Low | **Low** |

Security-control-level findings (injection, authn/authz, secrets, crypto) are **not re-listed here** because the [SoA](iso27001-statement-of-applicability.md) and the full-codebase security audit it's built on (see `CHANGELOG.md`'s "Full-codebase security audit, all 8 findings closed" entry) already found and closed every concrete vulnerability identified — 8 findings across SSRF, NoSQL injection, health-endpoint leakage, error-message leakage, session-revocation, and infrastructure exposure, all fixed and verified. The residual security risk that's genuinely new here is item 5 (nobody independent has ever checked that work).

## 4. Detail

### 4.1. CI disabled: the risk multiplier behind most other entries here

`.github/workflows/ci.yml` is enabled on GitHub Actions but every run fails immediately with "your account is locked due to a billing issue" (an account-level lock, re-confirmed as recently as 2026-08-25 — see `docs/project/Roadmap.md`'s "Next" section). This is not a standalone risk so much as the reason several others on this list exist at all:

- The mobile SDK-drift incident (item 4) survived **two merged PRs** because nothing re-ran a clean install to catch it.
- The stale integration-test fixture found in an earlier QA/QC pass survived because the integration suite only runs with `TEST_MONGODB_URI` set locally, which CI would otherwise do automatically.
- Every Dependabot PR is merged on a human running `npm test`/`npm run lint` locally, not an automated gate — reliable so far, but a single point of process failure (skip the manual check once, and a bad dependency bump reaches `main` with zero automated pushback).

**Mitigation in place**: a recurring manual QA/QC pass (`docs/project/qa-qc-report.md`) substitutes for CI's automated regression-catching, and has caught real bugs each time it's run. **Residual risk**: it only catches what it's run against, and it's run by a human remembering to run it, not a trigger. Clearing the billing lock at [github.com/settings/billing](https://github.com/settings/billing) is the actual fix; everything else on this list involving "undetected until manually checked" traces back to this one item.

### 4.2. Single instance, single region, no horizontal scaling

Production is one Render web service on the free plan (`render.yaml`) — no redundant replica, no autoscaling, no multi-region failover. Known, accepted tradeoffs already documented in `docs/project/live.md`: the service spins down after 15 minutes idle (cold start on the next request), and there is no horizontal scaling. `k8s/backend-hpa.yaml` exists as a reference implementation of what horizontal scaling would look like, but that whole path is explicitly not deployed anywhere (`docker-compose.yml`/`k8s/` model a two-origin, non-consolidated architecture that diverged from what's actually live).

**Impact if this fails**: any single Render outage, a bad deploy, or a Render account issue takes the entire product down — there is no failover target. **Likelihood**: this is the accepted, current, standing architecture, not a hypothetical — rated High for that reason, same logic as item 1.

**Mitigation in place**: UptimeRobot monitors (`/api/health/live`, `/api/health/ready`) catch a full outage within 5 minutes and alert by email — genuine detection, but detection is not redundancy; nothing automatically routes around a downed instance.

### 4.3. Backup/restore is manual, a real capability but not a recurring one

`backend/scripts/backupDatabase.js`/`restoreDatabase.js` exist, were built because MongoDB Atlas's scheduled snapshots need a paid M10+ tier this project doesn't run, and have been **verified with one real drill** (byte-for-byte restore confirmed, including BSON type fidelity) — a materially better position than "no backup exists." See the [Database Access Policy](database-access-policy.md) for the full mechanism.

**What's still a gap**: it's on-demand, not scheduled — nobody is reminded to run it, and there's exactly one recorded successful drill, not a recurring cadence that would catch a scenario the first drill didn't cover (e.g., a partial restore, a corrupted backup file, a schema that's since changed). Three automation paths (Render Cron — costs money on the free plan, GitHub Actions — blocked by item 1, Kubernetes CronJob — not a deployed target) were each considered and deliberately deferred, not overlooked.

**Rated High, not Critical**: a real, working, verified mechanism exists — the gap is recurrence and automation, not absence.

### 4.4. Mobile dependency drift: a demonstrated repeat failure-mode

Not hypothetical — this exact failure mode has now happened **four times**, each caught only by a manual QA pass, never by CI (which can't run, see item 1):

1. `@react-native-async-storage/async-storage` major-version group bump (PR #157) broke AsyncStorage at runtime with zero test-suite signal (the suite mocks it entirely).
2. `@sentry/react-native` major-version bump attempt bundled into a group PR (#234) — caught by manually reading the diff before merge.
3. **`react-native` itself**, a plain *minor* bump (0.86.2 → 0.87.0, PR #269), broke the entire mobile test suite outright (`jest` couldn't even start) — undetected through that PR and one more (#284) because both were verified against a stale `node_modules` rather than a clean install.
4. **The very next `mobile-dependencies` group PR (#288) reproduced the same pattern immediately after #269 was fixed** — `react-native` itself stayed correctly pinned this time (the new ignore rule worked), but everything *around* it (`react`/`react-dom`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `react-native-worklets`, `@react-native/jest-preset`) drifted forward regardless, plus `typescript` jumped to a major version `@typescript-eslint` doesn't support at all. Caught and closed *before* merging this time (verified: `jest` failed all 38 suites, lint crashed outright) — real progress over incident 3, but proof the underlying pattern wasn't fully closed by one ignore rule.

See `docs/project/qa-qc-report.md`'s snapshots and `CHANGELOG.md`'s "QA/QC Refresh" and "Dependabot Backlog Review" entries for the full incident writeups.

**Root cause common to all four**: these packages' real-world compatible version is dictated by the installed Expo SDK (`npx expo-doctor`/`npx expo install --check` is the actual source of truth), not by semver — and Dependabot's group-bump automation has no way to know that. `.github/dependabot.yml` now has explicit `ignore` rules covering every package incidents 3 and 4 touched (both majors from 1-2, plus `react-native` and the whole cluster from incident 4) — a real, incrementally-built guard rail, but one that only covers packages that have *already* caused an incident, applied preemptively for the cluster in incident 4 rather than waiting for each to cause its own. Any *other* Expo-bundled native package not yet on that list could still drift the same way undetected.

**Rated High**: a fresh clean-install check after this snapshot found zero drift, confirming the current guard rails hold for now — but four incidents in is enough to treat this as an ongoing pattern requiring standing vigilance (a clean-install re-check each QA/QC pass), not a closed issue.

### 4.5. No independent audit of any kind

The [SoA](iso27001-statement-of-applicability.md) (control 5.35) and the [SOC 2 Readiness Assessment](soc2-readiness-assessment.md) (§5, item 3) both already flag this: every security/compliance assessment in this repo, including this risk register, is self-produced. No external CPA firm, security auditor, or penetration tester has ever reviewed this codebase. This is circular in a specific way worth naming plainly (as the SOC 2 doc already does): engaging an auditor *is* the fix, but until that happens, "no independent review" stays true and would itself be a finding in any future audit's own prior-period context.

**Rated High, not Critical**: the underlying controls being assessed are, per the SoA, largely implemented or partial rather than absent — the risk is *unverified confidence*, not a known-broken system.

### 4.6. Monitoring exists to be polled, nothing pages a human

`/api/health/live`/`/api/health/ready` exist and UptimeRobot polls them every 5 minutes (catches a full crash). Sentry (backend live, mobile configured but no production DSN set yet — see `docs/project/live.md`'s "What's pending") catches unhandled exceptions. Neither covers the space between those two extremes: a slow memory leak, a degraded-but-technically-200 endpoint, an elevated error rate that never fully fails health checks, or a queue/job silently stalling (`jobs/` run as a separate `npm run jobs` process with no independent monitoring of its own liveness).

**Rated Medium**: real detection exists for the two failure modes that matter most (full crash, unhandled exception); the gap is specifically the slow/partial-degradation middle ground.

### 4.7. Payment Boundary: enforced by discipline, not by code

The [Payment Boundary](../../README.md#payment-boundary) — kejaapp never holds, routes, or takes a cut of money between tenants/landlords/agencies/movers — is a **permanent product invariant**, and the one exception that exists (the M-Pesa "Support KejaApp" voluntary charge) was deliberately scoped to a direct-to-developer payment specifically to avoid crossing it (see `CHANGELOG.md`'s entry on the feature's own design fork). There's no technical guardrail (a lint rule, a schema constraint, a CI check) that would catch a *future* feature request accidentally reintroducing inter-user payment routing — the discipline lives in `CLAUDE.md`, the Code of Ethics, and this project's own institutional memory, not in code that would fail a build.

**Rated Medium**: likelihood is low (the boundary has held across every feature built so far, including one that explicitly designed around it), but impact would be high if it were ever crossed by mistake — this becomes a real money-transmission/licensing question the moment kejaapp's own infrastructure routes funds between two other parties, not just a design preference.

### 4.8. Organizational risk: no segregation of duties

Directly named in the [SOC 2 Readiness Assessment](soc2-readiness-assessment.md) (CC1): this is a solo or small AI-assisted engineering operation, with no board-level oversight, no separate reviewer required on `main`'s branch-protection ruleset (a PR must exist, but not an approval or a passing check — see item 1), and a bus-factor of effectively one for institutional knowledge of *why* things are built the way they are. This isn't fixable by writing more documentation (this document included) — it's a structural fact of the organization's current size, and changes only as the team grows.

**Rated Medium**: the same underlying gap the SOC 2 doc already scores as a real maturity finding, ranked here for how it interacts with everything else — a single point of failure for both *building* and *reviewing* changes compounds every other item on this list.

### 4.9. Mobile iOS never verified

Every mobile QA pass and every live-device verification recorded in `CHANGELOG.md`/`docs/project/live.md` has been on Android (real device or emulator) — iOS has never been run on a real device or simulator, and no Mac hardware is available in this development environment to change that. Given the volume of platform-specific native code involved (Reanimated/worklets, `expo-secure-store`'s Keychain backing, push notification entitlements), an iOS-only regression is plausible and would currently ship undetected. The real bug found this snapshot (item 13's SecureStore crash) is itself a case in point — a native-module-specific issue, the same class of thing that could differ again between Android and iOS.

**Rated Low**: likelihood is high (this gap is real and current), but impact is bounded — Android is the verified, working platform, and this is a coverage gap rather than a demonstrated live failure.

### 4.10. Known, deliberately-accepted dependency alerts

One open Dependabot security alert as of this snapshot (down from 2 last snapshot — `image-size` resolved naturally via an upstream update), in `mobile/package-lock.json`, DoS/ReDoS-class (not injection/RCE/auth-bypass): `minimatch` (ReDoS). A transitive dependency of `eas-cli`/`metro`'s own dependency chain — fixing it requires `npm audit fix --force`, which would downgrade `eas-cli` to a nonsensically old version or `expo` back to an unsupported SDK, a worse trade than the alert itself (see `docs/project/qa-qc-report.md` and `Roadmap.md`'s "Next" section for the full history — down from 26 originally, nearly all resolved naturally via routine bumps). `eas-cli` is a locally-run dev tool never exposed to untrusted input in normal use, which further lowers the real-world exercise path.

**Rated Low**: explicitly triaged and deliberately deferred, not overlooked — revisit once upstream (`eas-cli`/`expo`) publish SDK-57-compatible fixed versions.

### 4.11. Rate-limit key derivation trusts the proxy chain

`backend/middlewares/rateLimiter.js`'s `getClientKey` falls back through `req.ip` → `X-Forwarded-For` → `req.socket.remoteAddress`. This is correct and safe **only** because Render's own reverse proxy sits in front of the app and `TRUST_PROXY=1` is set to match — Express only trusts the outermost hop it's configured to trust. If this were ever deployed behind a *different* topology without re-verifying the trust-proxy hop count, a client could forge `X-Forwarded-For` to present a fresh IP on every request and bypass IP-based rate limiting entirely.

**Rated Low**: correctly configured for the actual current deployment topology (Render); the risk is specifically about *redeploying* without re-checking this assumption, not a live gap today.

### 4.12. Kubernetes reference path uses `:latest` image tags

`k8s/backend-deployment.yaml`/`frontend-deployment.yaml`/`backend-cronjob.yaml` all pin to `ghcr.io/.../kejaapp-*:latest` rather than an immutable digest or version tag — ordinarily a real risk (non-reproducible deploys, no clean rollback target, a `latest` push silently changing what's already running). Rated Low here specifically because `k8s/` is confirmed, repeatedly, as a reference/alternative deployment path **not currently deployed anywhere** (see `CLAUDE.md`, `docs/project/live.md`) — this would need fixing before that path is ever used for real, but isn't live risk today.

### 4.13. Mobile live-device testing is genuinely hard here

Getting a single real bug fix verified on an actual phone took working through three different infrastructure dead ends before finding one that worked (see `docs/dev/Troubleshooting.md`'s expanded "Android emulator on WSL2" section for the full detail):

1. A Windows-side Android Studio emulator, bridged into this WSL2 sandbox via the standard `adb -a nodaemon`/`ADB_SERVER_SOCKET` trick — blocked entirely, because this specific sandbox has WSL2↔Windows automatic port-forwarding disabled (confirmed independently of the emulator: `http://localhost:<port>` from Windows was refused even for a plain Metro server).
2. A native WSL2-side emulator — booted, but was OOM-killed by the kernel under real memory pressure (confirmed via `dmesg`) and forced a crash-restart of the IDE's own remote server in the process. This environment's ~7.5GB RAM isn't enough for an AVD alongside the IDE and dev servers already running.
3. A real phone via Expo Go over a manually-configured ngrok tunnel — this is what worked, but needed: swapping `@expo/ngrok`'s stale bundled binary for a current one (ngrok's backend now rejects old agent versions for free accounts), manually setting an undocumented env var (`EXPO_PACKAGER_PROXY_URL`) since `@expo/ngrok`'s own tunnel orchestration doesn't understand the current ngrok config schema, and sideloading an official per-SDK Expo Go APK since the Play Store build had already moved past this project's SDK.

**Why this matters as a risk, not just a one-time annoyance**: every one of the mobile bugs this project has found via live testing (the Liquid Glass crash, this snapshot's SecureStore hang) was only findable *by actually completing a live run* — none of them showed up in the automated suite, which mocks out the exact native modules involved. If live testing is this much friction to set up, it's less likely to happen regularly, which means bugs in this class have a longer window to ship undetected than bugs the automated suite can catch.

**Mitigation in place**: the working path (steps and gotchas) is now fully documented in `docs/dev/Troubleshooting.md`, so re-establishing it next time should be much faster than the first time. **Rated Low**: real and demonstrated, but the impact is "slower detection of a specific bug class," not a live production issue — and the one bug this friction did eventually surface was found and fixed the same session.

## 5. What would move the needle most

In order of leverage, not urgency:

1. **Clear the GitHub billing lock.** Nearly every "undetected for N merged PRs" item on this list traces back to CI being dark. This is the single highest-leverage fix available and doesn't require new engineering.
2. **Schedule the database backup**, even a simple cron-triggered `npm run` on a low-cost always-on box, closing the gap between "one verified drill" and "a recurring, trusted cadence."
3. **Keep expanding the `dependabot.yml` ignore pattern preemptively, not just reactively** — incident 4 already improved on incidents 1-3 by widening the whole affected cluster at once rather than one package at a time, but the list still only covers packages that have caused an incident *so far*. A documented policy of never auto-merging *any* Expo-SDK-bundled native package without an `expo-doctor` check first would close this properly.
4. **A real, external second opinion** — even a lightweight one — on the security posture the SoA/SOC 2 doc already self-assess, since "no independent review" is the one gap self-assessment structurally cannot close on its own.
5. **Reduce the friction in mobile live-device testing** (item 13) — now that the working path is documented, consider whether it's worth pre-provisioning (e.g., a standing ngrok authtoken, a pre-downloaded per-SDK Expo Go APK) so the next live bug hunt doesn't need to rediscover the same three dead ends first.

## 6. Scope and limitations

This is a self-assessment, produced by reading the actual codebase and the compliance/QA documents it references, not an independent audit. Ratings are qualitative judgment calls made at the time of writing, not statistical risk quantification. Treat every entry as "true as of this writing, per the cited mechanism" — re-verify against current code before relying on it, and refresh this document whenever `qa-qc-report.md`, the SoA, or the SOC 2 readiness assessment are next refreshed, since all four are meant to move together.

**Maintained in** `docs/compliance/risk.md`.
