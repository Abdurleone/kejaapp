# KejaApp — ISO/IEC 27001:2022 Statement of Applicability (Self-Assessment)

## 1. Purpose and methodology

A Statement of Applicability (SoA) is the core artifact of an ISO/IEC 27001 Information Security Management System — for every control in Annex A, it records whether the control applies and how it's implemented. This document is a **self-assessment against the actual KejaApp codebase and its documented policies**, not a certified SoA produced under a formal ISO audit. It exists so that KejaApp's real security posture is honestly and specifically mapped to a recognized control framework, gaps included, rather than glossed over.

**Last verified against the codebase:** 2026-07-23 (commit `df3ba4c`). This pass re-read every cited mechanism against current code rather than trusting the previous write-up, and found the document had drifted in both directions since its last update (2026-07-10, PR #33): two newly-shipped controls weren't credited yet (CSRF protection, tiered rate limiting — see `5.15`, `8.20`, `8.26`), and three controls were overstated (`8.4`, `8.25`, `8.32` — the `main` branch's GitHub ruleset was verified via `gh api` to require a PR but enforce **zero** required approving reviews and no required status check, so "branch protection requires PR review and CI checks" was not actually true of the live repo configuration). All three have been corrected below.

A follow-up check while considering whether to add a required status check found something more significant: the `CI` GitHub Actions workflow itself has been in state `disabled_manually` since 2026-07-06 (confirmed via `gh api repos/.../actions/workflows`), not merely "not required" — it has not run on a single push or PR since that date, including every PR merged in this session. The team's own account of why: a GitHub Actions pricing/billing notification prompted disabling it as a precaution. This repository is public, and standard GitHub-hosted runners are free and unlimited for public repos, so that concern may no longer apply — this was raised and the team chose to **keep CI disabled for now** rather than re-enable it during this review. `8.4`, `8.25`, `8.29`, and `8.32` below are corrected to reflect that no automated CI currently runs at all; verification for every change in this period has been manual (local `npm test`/`npm run lint` runs before each PR, per the CHANGELOG's established convention), not automated. A `CodeQL` (SAST) workflow is also configured but has only ever run once, on 2026-07-06, and that run failed — it is not currently a working control either.

Two Phase 2 roadmap items have since been implemented and are upgraded to Y below: field-level log masking (`8.11`) and malware scanning on property-image uploads (`8.7`, self-hosted ClamAV, live-verified with a genuine EICAR test file). All five Phase 3 items (process/documentation, no new tooling) are also now done, upgrading `5.8`, `5.12`, `5.13`, `8.6`, and `8.22` to Y. Two of Phase 4's six items — originally assumed to need external engagement — turned out to be writable documentation on closer inspection and are also done, upgrading `5.28` and `5.33` to Y; the CodeQL failure referenced above was also traced to an account billing lock rather than a code problem (see Phase 4, item 1). See the [Remediation roadmap](#7-remediation-roadmap).

**Status key**:

- **Y** — Implemented, with the specific mechanism cited.
- **P** — Partially implemented, or implemented informally without a documented process.
- **N** — Not currently implemented; a genuine gap.
- **N/A** — Out of scope for a codebase-level assessment (e.g. a physical-office or employment-contract control), or not applicable to this application's architecture. Where hosting-provider delegation applies, that's noted rather than marked as satisfied outright.

## 2. A.5 — Organizational controls (37)

| # | Control | Status | Notes |
|---|---|---|---|
| 5.1 | Policies for information security | Y | This document set (Code of Ethics, Data Protection Policy, Acceptable Use Policy, this SoA) constitutes the policy framework. |
| 5.2 | Information security roles and responsibilities | P | [Incident Response Plan §4](incident-response-plan.md#4-roles) names roles; no formal org chart, since this isn't (yet) a registered company with staff. |
| 5.3 | Segregation of duties | Y | Admin role is separated from listing-management roles at the RBAC layer (`backend/constants/rbac.js`) — admins can't moderate listings, owners can't moderate accounts. |
| 5.4 | Management responsibilities | N/A | Organizational, outside codebase scope — to be defined by the operating entity. |
| 5.5 | Contact with authorities | Y | [Incident Response Plan §3.4](incident-response-plan.md#34-notification-only-where-personal-data-is-implicated) names the ODPC notification duty. |
| 5.6 | Contact with special interest groups | N | No CERT/ISAC or equivalent membership established. |
| 5.7 | Threat intelligence | P | Dependabot advisories are the only current feed; no broader threat-intel source. |
| 5.8 | Information security in project management | Y | `.github/PULL_REQUEST_TEMPLATE.md` (added since the previous review) carries a Security section — auth/ownership checks, input validation, and no hardcoded secrets — on every PR. A lightweight, non-blocking checklist rather than a hard gate, but it turns "ad hoc" into a repeatable prompt. |
| 5.9 | Inventory of information and other associated assets | Y | [Records of Processing Activities](records-of-processing-activities.md) plus the README's Project Structure section. |
| 5.10 | Acceptable use of information and other associated assets | Y | [Acceptable Use Policy](acceptable-use-policy.md). |
| 5.11 | Return of assets | N/A | Employment-related control, outside codebase scope. |
| 5.12 | Classification of information | Y | [RoPA §2](records-of-processing-activities.md#2-information-classification-scheme) (added since the previous review) defines a four-level scheme (Public/Internal/Confidential/Restricted), on top of the Data Protection Policy's personal-vs-sensitive distinction. Informal — not a DLP-enforced label attached to the data itself. |
| 5.13 | Labelling of information | Y | Every row of the [RoPA register](records-of-processing-activities.md#3-register) is labelled with its classification tier. Same informality caveat as `5.12`. |
| 5.14 | Information transfer | Y | HTTPS required in production; CORS origin allow-list restricts browser access. |
| 5.15 | Access control | Y | JWT + RBAC (`protect`/`authorize` middleware) enforced on every protected endpoint; CSRF protection (`backend/middlewares/csrfProtection.js`, added since the previous review) requires an `Authorization` header on every state-changing request, closing the cookie-riding-along gap that a same-site-none session cookie otherwise leaves open. |
| 5.16 | Identity management | Y | `User` model enforces unique email and username per identity. |
| 5.17 | Authentication information | Y | Passwords hashed via a Mongoose pre-save hook, never logged/returned; refresh tokens stored as hashes, not raw values. |
| 5.18 | Access rights | Y | Role guards (`authorize`/`authorizeGroup`) plus ownership checks (e.g. an owner can only edit their own properties). |
| 5.19 | Information security in supplier relationships | P | Third-party processors named in [Data Protection Policy §7](data-protection-policy.md#7-third-party-processors); no signed DPAs on file yet. |
| 5.20 | Addressing information security within supplier agreements | N | Relies on each provider's standard terms of service (MongoDB Atlas, Expo, etc.) rather than a negotiated agreement. |
| 5.21 | Managing information security in the ICT supply chain | P | Dependabot weekly dependency updates; no formal vendor risk assessment process. |
| 5.22 | Monitoring, review and change management of supplier services | N | Not formalized. |
| 5.23 | Information security for use of cloud services | P | Two documented hosting paths (Render, Kubernetes — see `docs/devops.md`); no formal per-provider security review. |
| 5.24 | Information security incident management planning and preparation | Y | [Incident Response Plan](incident-response-plan.md). |
| 5.25 | Assessment and decision on information security events | Y | Incident Response Plan §2 (severity levels), §3.1 (triage). |
| 5.26 | Response to information security incidents | Y | Incident Response Plan §3.2–3.3 (containment, assessment). |
| 5.27 | Learning from information security incidents | Y | Incident Response Plan §3.6 (post-incident review). |
| 5.28 | Collection of evidence | Y | Audit logs (admin status changes, HTTP/app logs) exist. [Incident Response Plan §3.7](incident-response-plan.md#37-evidence-handling) (added since the previous review) is a written evidence-handling procedure — preserve-before-you-act, don't edit records in place, log who accessed what. Informal, engineering-team-authored; not a substitute for a forensic specialist if an incident escalates legally. |
| 5.29 | Information security during disruption | P | Health/liveness/readiness endpoints and HPA-scaled replicas support resilience; no documented continuity plan beyond that. |
| 5.30 | ICT readiness for business continuity | N | No disaster-recovery/backup-restore drill has been performed — see [Section 7](#7-remediation-roadmap). |
| 5.31 | Legal, statutory, regulatory and contractual requirements | Y | This document set is explicitly built to track the Kenya DPA 2019, GDPR, and the Constitution of Kenya. |
| 5.32 | Intellectual property rights | Y | [Terms of Service §4](terms-of-service.md#4-listings-verification-badges-and-content-you-submit); `LICENSE`. |
| 5.33 | Protection of records | Y | [Records Retention & Protection Policy](records-retention-and-protection-policy.md) (new, added since the previous review) documents what records exist, current protection measures, and — honestly, not glossed over — that there's no cryptographic immutability/WORM storage and no automated log expiry yet, plus a real tension where moderation/violation records don't outlive account deletion. |
| 5.34 | Privacy and protection of PII | Y | [Data Protection Policy](data-protection-policy.md), [RoPA](records-of-processing-activities.md), [DPIA](data-protection-impact-assessment.md). |
| 5.35 | Independent review of information security | N | No external audit has been performed. |
| 5.36 | Compliance with policies, rules and standards for information security | P | This SoA is the self-assessment; no independent compliance-monitoring function exists yet. |
| 5.37 | Documented operating procedures | Y | README, `docs/devops.md`, Incident Response Plan, this SoA. |

## 3. A.6 — People controls (8)

| # | Control | Status | Notes |
|---|---|---|---|
| 6.1 | Screening | N/A | Employment control, outside codebase scope. |
| 6.2 | Terms and conditions of employment | N/A | Outside codebase scope. |
| 6.3 | Information security awareness, education and training | N | No formal training program exists yet. |
| 6.4 | Disciplinary process | P | [Code of Ethics §3](code-of-ethics.md#3-enforcement) / Acceptable Use Policy define **user-facing** enforcement; a staff-specific disciplinary process is outside codebase scope. |
| 6.5 | Responsibilities after termination or change of employment | N/A | Outside codebase scope. |
| 6.6 | Confidentiality or non-disclosure agreements | N/A | This is an open-source repository; no contributor NDA is currently used. |
| 6.7 | Remote working | N/A | Outside codebase scope. |
| 6.8 | Information security event reporting | Y | [SECURITY.md](../SECURITY.md) + [Incident Response Plan](incident-response-plan.md). |

## 4. A.7 — Physical controls (14)

KejaApp has no company-owned premises — it runs on cloud/managed infrastructure (MongoDB Atlas, S3-compatible storage, Render or Kubernetes). Physical controls are accordingly delegated to those providers rather than satisfied directly.

| # | Control | Status | Notes |
|---|---|---|---|
| 7.1 | Physical security perimeters | N/A | Delegated to hosting provider. |
| 7.2 | Physical entry | N/A | Delegated to hosting provider. |
| 7.3 | Securing offices, rooms and facilities | N/A | No physical office. |
| 7.4 | Physical security monitoring | N/A | Delegated to hosting provider. |
| 7.5 | Protecting against physical and environmental threats | N/A | Delegated to hosting provider. |
| 7.6 | Working in secure areas | N/A | Not applicable. |
| 7.7 | Clear desk and clear screen | N/A | Organizational practice, outside codebase scope. |
| 7.8 | Equipment siting and protection | N/A | Delegated to hosting provider. |
| 7.9 | Security of assets off-premises | N/A | Not applicable. |
| 7.10 | Storage media | N/A | Delegated to hosting/storage provider. |
| 7.11 | Supporting utilities | N/A | Delegated to hosting provider. |
| 7.12 | Cabling security | N/A | Delegated to hosting provider. |
| 7.13 | Equipment maintenance | N/A | Delegated to hosting provider. |
| 7.14 | Secure disposal or re-use of equipment | N/A | Delegated to hosting provider. |

## 5. A.8 — Technological controls (34)

| # | Control | Status | Notes |
|---|---|---|---|
| 8.1 | User endpoint devices | N/A | No device-management (MDM) requirement for a consumer mobile app. |
| 8.2 | Privileged access rights | Y | Admin is a distinct, separately authorized role (`authorize("admin")`); admins cannot self-elevate. |
| 8.3 | Information access restriction | Y | Ownership + role checks scope every list/detail endpoint (e.g. `fetchMyProperties`, `/inquiries/received`). |
| 8.4 | Access to source code | P | Git-based repo permissions; a GitHub ruleset on `main` blocks direct pushes, force-pushes, and branch deletion, and requires a PR — but verified via `gh api repos/.../rulesets` that `required_approving_review_count` is **0** and no `required_status_checks` rule exists, so neither a second reviewer's approval nor a passing CI run is actually enforced before merge. Both were considered and deliberately left as-is: a required status check isn't meaningful while CI itself is disabled (see `8.25`), and a required-approval count would block the current solo/AI-assisted merge workflow without a second human reviewer in place. In practice every change has gone through review by convention, not by enforcement. |
| 8.5 | Secure authentication | Y | JWT + hashed refresh sessions, HTTP-only cookie option, generic invalid-credentials messaging (no user-enumeration leak). |
| 8.6 | Capacity management | Y | Kubernetes HPA scales the backend 2-6 replicas on CPU. `docs/devops.md`'s new "Capacity planning" section (added since the previous review) establishes a recurring (quarterly) manual review of HPA thresholds against real usage — a calendar-driven process, not tooling-backed, but a documented one. |
| 8.7 | Protection against malware | Y | Uploaded property images are scanned via a self-hosted ClamAV daemon (`backend/services/malwareScanService.js`, added since the previous review) before ever reaching storage — fails closed (rejects the upload) if the scanner is configured but unreachable, rather than silently letting an unscanned file through. Live-verified with a genuine EICAR test file through the real upload endpoint (correctly rejected) and an ordinary file (correctly accepted). Wired into `docker-compose.yml` and `k8s/clamav-statefulset.yaml`; the `render.yaml` private-service wiring hasn't been deployed against a live Render account. |
| 8.8 | Management of technical vulnerabilities | Y | Dependabot weekly updates; CI runs tests/lint on every change. |
| 8.9 | Configuration management | Y | Centralized, validated environment config (`backend/config/env.js`); no hardcoded secrets in source. |
| 8.10 | Information deletion | Y | `DELETE /api/auth/me` cascades deletion across every model referencing the user — see [Data Protection Policy §9](data-protection-policy.md#9-retention-and-deletion). |
| 8.11 | Data masking | Y | Passwords/tokens are never returned in API responses or logs. `backend/utils/logger.js`'s `maskPii` (added since the previous review) partially masks email addresses and Kenyan phone numbers embedded in any app-log message or access-log line before it's written to disk — a regex-based, best-effort safety net against a future call site accidentally logging PII, not a guarantee against every possible format. |
| 8.12 | Data leakage prevention | P | Centralized error handler avoids leaking stack traces in production; no dedicated DLP tool. A real instance of this gap was found and fixed since the previous review — public property endpoints were returning the owner's email/phone to anonymous callers — caught through ordinary code review during a health-check pass, not an automated scanner, which is itself evidence there's no dedicated DLP mechanism to catch the next one. |
| 8.13 | Information backup | N | No documented/automated database backup-and-restore procedure — see [Section 7](#7-remediation-roadmap). |
| 8.14 | Redundancy of information processing facilities | Y | Kubernetes HPA-scaled backend replicas; Render Blueprint as an alternative path. |
| 8.15 | Logging | Y | Daily-rotated access/app logs (`backend/logs/`), Nairobi-timestamped. |
| 8.16 | Monitoring activities | P | Health/liveness/readiness endpoints exist; no alerting/dashboarding layer configured. |
| 8.17 | Clock synchronization | Y | Server timestamps standardized to `Africa/Nairobi` across logs and audit records. |
| 8.18 | Use of privileged utility programs | N/A | No direct production shell/utility-access pattern documented; relies on standard hosting-provider consoles. |
| 8.19 | Installation of software on operational systems | Y | Docker images are the only deployment artifact; no ad hoc software installation on running containers. |
| 8.20 | Networks security | Y | CORS allow-list (fails closed on an unrecognized origin) and Helmet security headers; tiered rate limiting on `/api` (stricter on `/api/auth`, `backend/middlewares/rateLimiter.js`, added since the previous review) mitigates brute-force/basic-DoS exposure. `docs/devops.md`'s new "Network topology" diagram (added since the previous review) documents the request path across both deployment targets. |
| 8.21 | Security of network services | Y | Redis/MongoDB connections are credentialed via environment variables, not exposed publicly by default. |
| 8.22 | Segregation of networks | Y | Still delegated to the Kubernetes/Render network model rather than an explicit internal segmentation control, but `docs/devops.md`'s new "Network topology" diagram (added since the previous review) documents it — not cross-checked against a live cluster's actual `kubectl get all` output. |
| 8.23 | Web filtering | N/A | Not applicable to this application's threat model. |
| 8.24 | Use of cryptography | Y | HTTPS in production, hashed passwords/tokens, JWT signing. |
| 8.25 | Secure development life cycle | P | The `CI` GitHub Actions workflow (`.github/workflows/ci.yml`, lint + tests for all three packages) has been in state `disabled_manually` since 2026-07-06 — a precaution against a GitHub Actions pricing notification, kept off deliberately even after confirming this public repo's standard runners are free/unlimited. No automated CI has run on any push or PR since. Verification is currently manual: `npm test`/`npm run lint` run locally before each PR, per the CHANGELOG's established convention — a real discipline, but not an automated gate. |
| 8.26 | Application security requirements | Y | Request-validation middleware on every mutating endpoint; role/ownership checks documented per feature; CSRF protection and tiered rate limiting (both added since the previous review — see `5.15`, `8.20`) close gaps this document didn't previously credit. |
| 8.27 | Secure system architecture and engineering principles | Y | Layered architecture (routes → middleware → controllers → models) with single chokepoints per concern (`asyncHandler`, `createNotification`, central error handler). |
| 8.28 | Secure coding | Y | ESLint across all three packages in CI; centralized input validation rather than ad hoc checks. |
| 8.29 | Security testing in development and acceptance | P | 446 backend unit/integration tests cover auth/authorization guard-rails, run manually (see `8.25`). A `CodeQL` (SAST) workflow is configured but has only run once, on 2026-07-06, and that run failed — root cause identified via `gh run view`: "account is locked due to a billing issue", not a code or config problem. Later Dependabot workflow runs (as recently as 2026-07-20) succeeded, suggesting the lock has since cleared, but CodeQL's default-setup workflow can't be manually re-triggered — it needs a fresh push to `main` to actually confirm. No penetration test or DAST tool run yet either. |
| 8.30 | Outsourced development | N/A | No outsourced development arrangement currently in place. |
| 8.31 | Separation of development, test and production environments | Y | `TEST_MONGODB_URI` opt-in for integration tests; separate `.env` configuration per environment; CI isolated from production. |
| 8.32 | Change management | P | PR-based workflow is the practiced convention — every merged change in this project's history has gone through a PR — but it isn't fully enforced: the `main` ruleset requires a PR to exist, not an approval or a passing CI run, and CI itself is currently disabled (see `8.4`, `8.25`). |
| 8.33 | Test information | Y | Tests use seeded/synthetic demo data (`backend/seeders/seedDemoData.js`), not real user data. `CONTRIBUTING.md`'s new "Test data policy" section (added since the previous review) makes this an explicit written policy rather than an unstated convention. |
| 8.34 | Protection of information systems during audit testing | N/A | No formal third-party audit has been conducted yet. |

## 6. Pending items (every P and N control)

Every control below is currently either **P** (partial/informal) or **N** (not implemented) — 21 of the 93 Annex A controls (26 are **N/A** to a codebase-level assessment, mostly A.7 Physical and employment-related A.6 controls; the remaining 46 are **Y**). Grouped by theme rather than control number, since that's closer to how these would actually get worked.

### Engineering / SDLC process
| # | Control | Status | Gap |
|---|---|---|---|
| 8.4 | Access to source code | P | `main` ruleset requires a PR but 0 approving reviews and no required status check — review is convention, not enforcement. Both considered and deliberately left as-is this pass. |
| 8.25 | Secure development life cycle | P | The `CI` workflow has been manually disabled since 2026-07-06 (a billing precaution, kept off even after confirming this public repo's runners are free); verification is currently manual per-PR only. |
| 8.32 | Change management | P | Same root cause as `8.4`/`8.25` — PR convention exists, but nothing (review, CI) actually gates the merge. |
| 8.29 | Security testing in development and acceptance | P | `CodeQL`'s one failed run traced to an account billing lock, likely since cleared (unconfirmed - needs a fresh push); no penetration test or DAST tool run yet regardless. |

### Data resilience and continuity
| # | Control | Status | Gap |
|---|---|---|---|
| 5.30 | ICT readiness for business continuity | N | No disaster-recovery/backup-restore drill has ever been performed. |
| 8.13 | Information backup | N | No automated backup schedule exists for MongoDB Atlas data. |
| 5.29 | Information security during disruption | P | Health/liveness/readiness endpoints and HPA replicas exist; no documented continuity plan beyond that. |
| 8.16 | Monitoring activities | P | Health endpoints exist; nothing pages a human when they fail — no alerting/dashboarding layer. |

### Supplier / third-party risk
| # | Control | Status | Gap |
|---|---|---|---|
| 5.19 | Information security in supplier relationships | P | Processors named in the Data Protection Policy; no signed DPAs on file. |
| 5.20 | Addressing information security within supplier agreements | N | Relies on each provider's standard ToS (MongoDB Atlas, Expo, etc.), not a negotiated agreement. |
| 5.21 | Managing information security in the ICT supply chain | P | Dependabot weekly updates only; no formal vendor risk assessment process. |
| 5.22 | Monitoring, review and change management of supplier services | N | Not formalized at all. |
| 5.23 | Information security for use of cloud services | P | Two documented hosting paths (Render, Kubernetes); no formal per-provider security review. |

### Application-level hardening
| # | Control | Status | Gap |
|---|---|---|---|
| 8.12 | Data leakage prevention | P | No dedicated DLP tool — a real PII-leak instance (owner email/phone on public endpoints) was only caught by code review, since fixed. |

### Governance and information handling
| # | Control | Status | Gap |
|---|---|---|---|
| 5.2 | Information security roles and responsibilities | P | Incident Response Plan names roles informally; no formal org chart (not a registered company with staff yet). |
| 5.6 | Contact with special interest groups | N | No CERT/ISAC or equivalent membership established. |
| 5.7 | Threat intelligence | P | Dependabot advisories are the only current feed. |
| 5.35 | Independent review of information security | N | No external/accredited audit has ever been performed. |
| 5.36 | Compliance with policies, rules and standards for information security | P | This SoA is the only compliance-monitoring mechanism; no independent function checks it. |
| 6.3 | Information security awareness, education and training | N | No formal training program exists. |
| 6.4 | Disciplinary process | P | User-facing enforcement exists (Code of Ethics, AUP); a staff-specific disciplinary process is out of scope until there's staff. |

## 7. Remediation roadmap

Phased by effort and dependency, not strictly by the risk-ranking above — some of the highest-value fixes here are also the cheapest.

### Phase 1 — Configuration-only, no engineering effort (considered this pass, currently declined)
The theoretical highest ratio of compliance-value to effort on this list — turning on `required_approving_review_count: 1+` and adding a `required_status_checks` rule to the existing `main` ruleset — was evaluated during this review and **not applied**, for two specific, documented reasons rather than by default or oversight:

1. **Re-enabling CI is the actual prerequisite**, and the team chose to keep it disabled. The `CI` workflow has been in state `disabled_manually` since 2026-07-06 (a GitHub Actions billing-notification precaution); this repo is public, and standard GitHub-hosted runners are free/unlimited for public repos, so that original concern may no longer apply — this was raised during the review and the team opted to keep CI off for now regardless. A required status check against a disabled workflow would block every future merge indefinitely (this ruleset's `current_user_can_bypass` is `never`), so this cannot be revisited independently of the CI decision.
2. **A required approving-review count would block the current solo/AI-assisted workflow** as-is — GitHub doesn't count a PR author's own approval, and there's no second human reviewer in the loop today. Enabling it would require either adding a reviewer to the loop or configuring a bypass exception that would quietly reintroduce the same gap in a different form.

If either constraint changes (CI re-enabled and shown to pass reliably; a second reviewer joins), this becomes a same-day fix.

### Phase 2 — Short-term engineering work (single-PR-sized, no new vendor)
1. **Automated database backup + one tested restore** (`5.30`, `8.13`) — MongoDB Atlas has built-in scheduled snapshots; enabling them plus running one real restore-to-a-scratch-cluster drill closes both controls. The single biggest gap by risk remaining on this list.
2. ~~Malware scanning on uploads~~ — **done**: a self-hosted ClamAV daemon (`backend/services/malwareScanService.js`) now scans every property-image upload before it reaches storage, wired into `docker-compose.yml`/`k8s/clamav-statefulset.yaml`/`render.yaml` and live-verified with a genuine EICAR test file. See `8.7` above.
3. **Minimal alerting on the existing health endpoints** (`8.16`) — a free-tier uptime monitor (UptimeRobot, Better Uptime) pointed at `/health/live` and `/health/ready` gets a human paged with near-zero engineering effort; a fuller dashboard can come later.

### Phase 3 — Process and documentation (no new tooling required) — done
All five items completed in one pass:
1. ~~A lightweight security checklist in the PR template~~ — `.github/PULL_REQUEST_TEMPLATE.md` gained a Security section. Closes `5.8`.
2. ~~A written test-data policy~~ — codified in `CONTRIBUTING.md`. Closes `8.33`.
3. ~~A basic information-classification scheme~~ — a four-level scheme (Public/Internal/Confidential/Restricted) defined and applied to every row of the RoPA. Closes `5.12`, `5.13`.
4. ~~A capacity-planning review cadence~~ — a recurring quarterly review documented in `docs/devops.md`. Closes `8.6`.
5. ~~A network-topology diagram~~ — a Mermaid diagram of the actual Render/Kubernetes request path in `docs/devops.md`. Closes the documentation half of `8.20` (already Y) and `8.22`.

### Phase 4 — Requires external engagement or organizational maturity
Re-examined item by item during this review rather than assumed unactionable wholesale — two items (5) turned out to be genuinely draftable and are done; the rest are confirmed to need something only a human/the business can provide.

1. **Independent security testing** (`8.29`, `5.35`) — partially clarified, not resolved: `CodeQL`'s one failed run was traced to an account billing lock (`gh run view`'s annotation: "account is locked due to a billing issue"), not a code problem, and later Dependabot runs (through 2026-07-20) suggest the lock has since cleared — but this needs an actual fresh push to confirm, and a real penetration test or DAST tool run is still entirely outstanding regardless.
2. **Signed supplier/processor agreements** (`5.19`, `5.20`, `5.21`, `5.22`) — formal DPAs with MongoDB Atlas, the storage provider, and Expo, plus a recurring vendor-risk review cadence. Genuinely needs a human to negotiate/sign real contracts.
3. **Formal security-awareness training** (`6.3`) and a **staff disciplinary process** (`6.4`) — both contingent on this becoming a registered company with actual staff; premature to formalize before then.
4. **CERT/ISAC membership or equivalent threat-intel source** (`5.6`) — needs an actual paid membership/application, not a document.
5. ~~Forensic evidence-handling procedure~~ and ~~a records-retention/immutability policy~~ — **done**: [Incident Response Plan §3.7](incident-response-plan.md#37-evidence-handling) and the new [Records Retention & Protection Policy](records-retention-and-protection-policy.md). These turned out to be writable documentation, not something requiring external engagement — reclassified out of this phase in hindsight. Closes `5.28`, `5.33`.
6. **Independent compliance-monitoring function** (`5.36`) beyond this self-assessment — realistically follows from, not before, item 1's independent audit.

## 8. Review

This SoA should be revisited whenever a new control-relevant capability ships (a new auth mechanism, a new third-party processor, a new deployment target) and at minimum reviewed annually. Maintained in `docs/iso27001-statement-of-applicability.md`.

## 9. Scope and limitations

This is a **self-assessment**, produced by reading the actual codebase and existing documentation, not a certified Statement of Applicability produced under a formal ISO/IEC 27001 audit by an accredited certification body. KejaApp is not ISO/IEC 27001 certified. Treat every "Y" here as "implemented as of this writing, per the cited mechanism" — verify against current code before relying on it, and engage an accredited auditor before making any certification claim externally.
