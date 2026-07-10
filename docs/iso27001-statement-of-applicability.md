# KejaApp — ISO/IEC 27001:2022 Statement of Applicability (Self-Assessment)

## 1. Purpose and methodology

A Statement of Applicability (SoA) is the core artifact of an ISO/IEC 27001 Information Security Management System — for every control in Annex A, it records whether the control applies and how it's implemented. This document is a **self-assessment against the actual KejaApp codebase and its documented policies**, not a certified SoA produced under a formal ISO audit. It exists so that KejaApp's real security posture is honestly and specifically mapped to a recognized control framework, gaps included, rather than glossed over.

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
| 5.8 | Information security in project management | P | Security is considered ad hoc in PR review; no formal security gate in the SDLC. |
| 5.9 | Inventory of information and other associated assets | Y | [Records of Processing Activities](records-of-processing-activities.md) plus the README's Project Structure section. |
| 5.10 | Acceptable use of information and other associated assets | Y | [Acceptable Use Policy](acceptable-use-policy.md). |
| 5.11 | Return of assets | N/A | Employment-related control, outside codebase scope. |
| 5.12 | Classification of information | P | Data Protection Policy distinguishes personal vs. sensitive personal data; no formal internal classification labels beyond that. |
| 5.13 | Labelling of information | N | Not implemented. |
| 5.14 | Information transfer | Y | HTTPS required in production; CORS origin allow-list restricts browser access. |
| 5.15 | Access control | Y | JWT + RBAC (`protect`/`authorize` middleware) enforced on every protected endpoint. |
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
| 5.28 | Collection of evidence | P | Audit logs (admin status changes, HTTP/app logs) exist; no formal forensic evidence-handling procedure. |
| 5.29 | Information security during disruption | P | Health/liveness/readiness endpoints and HPA-scaled replicas support resilience; no documented continuity plan beyond that. |
| 5.30 | ICT readiness for business continuity | N | No disaster-recovery/backup-restore drill has been performed — see [Section 5](#5-known-gaps-to-prioritize). |
| 5.31 | Legal, statutory, regulatory and contractual requirements | Y | This document set is explicitly built to track the Kenya DPA 2019, GDPR, and the Constitution of Kenya. |
| 5.32 | Intellectual property rights | Y | [Terms of Service §4](terms-of-service.md#4-listings-verification-badges-and-content-you-submit); `LICENSE`. |
| 5.33 | Protection of records | P | Database access is credentialed and role-restricted; no separate records-retention/immutability control beyond normal DB permissions. |
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
| 8.4 | Access to source code | Y | Git-based repo permissions; branch protection on `main` requires PR review. |
| 8.5 | Secure authentication | Y | JWT + hashed refresh sessions, HTTP-only cookie option, generic invalid-credentials messaging (no user-enumeration leak). |
| 8.6 | Capacity management | P | Kubernetes HPA scales the backend; no formal capacity-planning review process. |
| 8.7 | Protection against malware | N | No malware scanning on uploaded property images; relies on file-type/size validation only. |
| 8.8 | Management of technical vulnerabilities | Y | Dependabot weekly updates; CI runs tests/lint on every change. |
| 8.9 | Configuration management | Y | Centralized, validated environment config (`backend/config/env.js`); no hardcoded secrets in source. |
| 8.10 | Information deletion | Y | `DELETE /api/auth/me` cascades deletion across every model referencing the user — see [Data Protection Policy §9](data-protection-policy.md#9-retention-and-deletion). |
| 8.11 | Data masking | P | Passwords/tokens are never returned in API responses or logs; no broader field-level masking (e.g. partial phone-number masking). |
| 8.12 | Data leakage prevention | P | Centralized error handler avoids leaking stack traces in production; no dedicated DLP tool. |
| 8.13 | Information backup | N | No documented/automated database backup-and-restore procedure — see [Section 6](#6-known-gaps-to-prioritize). |
| 8.14 | Redundancy of information processing facilities | Y | Kubernetes HPA-scaled backend replicas; Render Blueprint as an alternative path. |
| 8.15 | Logging | Y | Daily-rotated access/app logs (`backend/logs/`), Nairobi-timestamped. |
| 8.16 | Monitoring activities | P | Health/liveness/readiness endpoints exist; no alerting/dashboarding layer configured. |
| 8.17 | Clock synchronization | Y | Server timestamps standardized to `Africa/Nairobi` across logs and audit records. |
| 8.18 | Use of privileged utility programs | N/A | No direct production shell/utility-access pattern documented; relies on standard hosting-provider consoles. |
| 8.19 | Installation of software on operational systems | Y | Docker images are the only deployment artifact; no ad hoc software installation on running containers. |
| 8.20 | Networks security | P | CORS allow-list and Helmet security headers; no separate network-segmentation documentation beyond the hosting provider's. |
| 8.21 | Security of network services | Y | Redis/MongoDB connections are credentialed via environment variables, not exposed publicly by default. |
| 8.22 | Segregation of networks | P | Delegated to the Kubernetes/Render network model; no explicit internal segmentation diagram. |
| 8.23 | Web filtering | N/A | Not applicable to this application's threat model. |
| 8.24 | Use of cryptography | Y | HTTPS in production, hashed passwords/tokens, JWT signing. |
| 8.25 | Secure development life cycle | Y | CI runs lint + tests on every change; branch protection requires PR review before merge to `main`. |
| 8.26 | Application security requirements | Y | Request-validation middleware on every mutating endpoint; role/ownership checks documented per feature. |
| 8.27 | Secure system architecture and engineering principles | Y | Layered architecture (routes → middleware → controllers → models) with single chokepoints per concern (`asyncHandler`, `createNotification`, central error handler). |
| 8.28 | Secure coding | Y | ESLint across all three packages in CI; centralized input validation rather than ad hoc checks. |
| 8.29 | Security testing in development and acceptance | P | 355+ backend unit/integration tests cover auth/authorization guard-rails; no dedicated penetration test or SAST/DAST tool run yet. |
| 8.30 | Outsourced development | N/A | No outsourced development arrangement currently in place. |
| 8.31 | Separation of development, test and production environments | Y | `TEST_MONGODB_URI` opt-in for integration tests; separate `.env` configuration per environment; CI isolated from production. |
| 8.32 | Change management | Y | PR-based workflow with required review and CI checks before merge to `main` (branch protection). |
| 8.33 | Test information | P | Tests use seeded/synthetic demo data (`backend/seeders/seedDemoData.js`), not real user data; no formal written policy on this beyond convention. |
| 8.34 | Protection of information systems during audit testing | N/A | No formal third-party audit has been conducted yet. |

## 6. Known gaps to prioritize

Ranked by what would most improve real security/compliance posture if closed next:

1. **Database backup and restore** (5.30, 8.13) — no automated backup schedule or tested restore procedure exists today. This is the single biggest gap on this list.
2. **Independent security testing** (8.29, 5.35) — a penetration test or SAST/DAST tool run would validate what the current unit/integration test suite can't (memory-safety-class issues, auth bypass chains, etc.).
3. **Signed supplier/processor agreements** (5.19, 5.20) — formal DPAs with MongoDB Atlas, the S3-compatible storage provider, and Expo, rather than relying on their standard terms of service.
4. **Malware scanning on uploads** (8.7) — property images are validated by type/size only, not scanned for embedded malware.
5. **Monitoring/alerting** (8.16) — health-check endpoints exist, but nothing pages a human when they fail.

## 7. Review

This SoA should be revisited whenever a new control-relevant capability ships (a new auth mechanism, a new third-party processor, a new deployment target) and at minimum reviewed annually. Maintained in `docs/iso27001-statement-of-applicability.md`.

## 8. Scope and limitations

This is a **self-assessment**, produced by reading the actual codebase and existing documentation, not a certified Statement of Applicability produced under a formal ISO/IEC 27001 audit by an accredited certification body. KejaApp is not ISO/IEC 27001 certified. Treat every "Y" here as "implemented as of this writing, per the cited mechanism" — verify against current code before relying on it, and engage an accredited auditor before making any certification claim externally.
