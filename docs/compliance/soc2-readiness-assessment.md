# KejaApp — SOC 2 Readiness Assessment (Self-Assessment, Not an Audit)

## 1. Purpose and scope

**SOC 2 is not self-certifiable.** A SOC 2 report is an attestation issued only by an independent, licensed CPA firm, under AICPA attestation standards (SSAE 18 / AT-C 105 and 205), against the AICPA's Trust Services Criteria (TSC). No SOC 2 report exists for KejaApp, no auditor has been engaged, and nothing in this document may be represented to a customer, partner, or investor as "SOC 2 compliant" or "SOC 2 certified" — those claims require an actual engagement letter and a signed report.

This document exists for a narrower, honest purpose: to crosswalk KejaApp's existing controls — most of them already documented in the [ISO/IEC 27001 Statement of Applicability](iso27001-statement-of-applicability.md) — onto SOC 2's Trust Services Criteria vocabulary, and to identify, without glossing over them, the gaps a real auditor would flag. It's a readiness map, not a substitute for the audit itself.

There are two report types:

- **Type I** — assesses whether controls are suitably *designed* as of a single point in time. Faster to obtain, but says nothing about whether controls actually operated.
- **Type II** — assesses whether controls were suitably designed **and operated effectively** over an observation period (typically 3–12 months). This is what most enterprise customers actually mean when they ask for "a SOC 2 report," and it cannot be produced faster than the observation window itself, no matter how complete the documentation is on day one.

**Trust Services Categories in scope for this crosswalk**: **Security** (the "Common Criteria," CC1–CC9 — mandatory in every SOC 2 report, regardless of which other categories are selected), **Availability**, and **Confidentiality**. **Processing Integrity** is excluded: KejaApp doesn't process payments or complex transactions on-platform at all (rent, deposits, and fees are settled directly between users — see the [Payment Boundary](../../README.md#payment-boundary)), so there's no transaction-processing pipeline for that category to meaningfully assess. **Privacy** (P1–P8) is not separately rebuilt in SOC 2 vocabulary here, since [`data-protection-policy.md`](data-protection-policy.md), the [Records of Processing Activities](records-of-processing-activities.md), and the [Data Protection Impact Assessments](data-protection-impact-assessment.md) already cover the same substance in Kenya DPA 2019/GDPR terms — a real audit would most likely reuse those documents directly rather than requiring parallel SOC 2-flavored ones.

**Status key** (same convention as the ISO 27001 SoA): **Y** implemented, **P** partial/informal, **N** not implemented (a genuine gap), **N/A** out of scope for a codebase-level assessment.

## 2. Security (Common Criteria) crosswalk

| CC # | Category | KejaApp status | Source |
|---|---|---|---|
| CC1 | Control Environment | P | [ISO 27001 SoA](iso27001-statement-of-applicability.md), controls 5.1–5.4 — a policy framework exists (Code of Ethics, Data Protection Policy, this SoA); no formal org chart or board-level oversight, since this isn't yet a registered company with staff. An auditor would treat "management oversight structure" as underdeveloped for a solo/small-team operation — a maturity gap, not a documentation gap. |
| CC2 | Communication and Information | Y | Asset inventory (SoA 5.9, RoPA), Incident Response Plan, and this document set generally — internal and external communication channels for security-relevant information are documented. |
| CC3 | Risk Assessment | P | [DPIA](data-protection-impact-assessment.md) covers the three highest-risk *data-processing* activities; no broader enterprise risk assessment (e.g. a formal annual risk register covering business/operational risk beyond data protection) exists. |
| CC4 | Monitoring Activities | P | Health/liveness/readiness endpoints exist (SoA 8.16); no alerting/dashboarding layer pages a human when they fail, and no independent function monitors compliance with this document set itself (SoA 5.36). |
| CC5 | Control Activities | Y | RBAC (`protect`/`authorize` middleware) plus ownership checks enforce access boundaries in code, not just on paper (SoA 8.26–8.28). |
| CC6 | Logical and Physical Access Controls | Y | JWT + hashed refresh sessions, role/ownership guards, CSRF protection, TLS in production (SoA 8.2–8.5, 8.20–8.24). Physical access is delegated to hosting providers (MongoDB Atlas, Render/Kubernetes) — standard for a cloud-native architecture with no company-owned premises, and something an auditor would expect a SOC 2 report on those subprocessors to cover, not KejaApp directly. |
| CC7 | System Operations | P | Capacity management and malware scanning are real (SoA 8.6, 8.7). A manual, human-triggered database backup/restore procedure exists and has been drilled once, verified byte-for-byte (SoA 8.13, 5.30) — the remaining gap is automation (no scheduler wired up), not the absence of a procedure at all. |
| CC8 | Change Management | P | A PR-based workflow is the practiced convention, but it isn't enforced: the `main` branch ruleset requires a PR to exist, not an approval or a passing CI run — and the `CI` GitHub Actions workflow itself has been manually disabled since 2026-07-06 (SoA 8.4, 8.25, 8.32). An auditor would very likely treat "no enforced review, no automated test gate" as a material exception in this category, not a minor note. |
| CC9 | Risk Mitigation | P | Incident Response Plan covers internal incident handling; no signed vendor/processor risk-management agreements (DPAs with MongoDB Atlas, the storage provider, Expo) exist yet (SoA 5.19–5.22). |

## 3. Availability criteria

| A # | Category | KejaApp status | Source |
|---|---|---|---|
| A1.1 | Capacity monitoring and management | P | Kubernetes HPA scales the backend on CPU (SoA 8.6, Y); no alerting layer on top of the existing health endpoints (SoA 8.16, P). |
| A1.2 | Environmental protections, backup, and recovery | P | Same as CC7 above: a manual MongoDB backup/restore procedure exists (SoA 8.13, 5.29, 5.30); no *automated* schedule yet. Redundancy (multiple HPA-scaled replicas) exists and is real (SoA 8.14, Y), but redundancy against a process crash is a separate control from recoverability from data loss or corruption. |
| A1.3 | Recovery testing | P | One real restore drill has been performed and verified byte-for-byte (including BSON type fidelity) against a scratch database — genuine evidence the procedure works, not just documentation. Gap: a single drill, not a recurring testing cadence. |

## 4. Confidentiality criteria

| C # | Category | KejaApp status | Source |
|---|---|---|---|
| C1.1 | Identification and protection of confidential information | Y | The [RoPA](records-of-processing-activities.md#2-information-classification-scheme)'s four-level classification scheme (Public/Internal/Confidential/Restricted) gives confidentiality a concrete, applied definition rather than an abstract one. (A separate, PR-pending Database Access Policy document also classifies data at the connection/query layer — cross-reference once merged.) |
| C1.2 | Disposal of confidential information per policy | Y | The [Records Retention & Protection Policy](records-retention-and-protection-policy.md) and `DELETE /api/auth/me`'s cascading account-deletion path (see [Data Protection Policy §9](data-protection-policy.md#9-retention-and-deletion)) give this a real, tested mechanism, not just a stated intent. |

## 5. What a real SOC 2 audit would flag first

In rough order of how likely each is to become a formal exception, not by control number:

1. **CI disabled, no enforced code review gate.** This is now the standout Change Management finding (CC8) — a workflow that exists in the repo but has been off since 2026-07-06 reads worse to an auditor than one that was never built, since it demonstrates the control regressed rather than was simply never prioritized.
2. **Database backup/restore is manual, not automated.** A real procedure exists and has been drilled once (CC7/A1.2/A1.3) — a real improvement over having nothing, but an auditor would still note the lack of a recurring schedule and a single-drill testing history as short of a mature control.
3. **No independent/external audit of any kind has ever been performed** (ISO SoA 5.35). This is circular in a specific way worth naming honestly: engaging a SOC 2 auditor *is* the fix for this finding, but until that happens, "no independent review" remains true and would itself be listed as a prior-period gap in a Type I report's context.
4. **No alerting/paging on top of existing health endpoints** (CC4/A1.1) — the monitoring exists to be polled, but nothing currently notices or escalates a failure to a human.
5. **No signed vendor/processor agreements** (CC9) — reliance on MongoDB Atlas/Expo/the storage provider's standard terms of service, rather than negotiated DPAs, is a common finding for small teams but a real one.
6. **Team/organizational maturity** (CC1) — a solo or small AI-assisted engineering workflow doesn't yet have the segregation-of-duties or management-oversight structure a SOC 2 report typically documents for a company of any size; this isn't fixable by writing more documentation; it changes as the organization grows.

## 6. What it would actually take to engage an auditor

- **Type I is the realistic near-term target**, and even that would very likely need item 1 above closed first (the broken change-management gate) — a working backup/restore procedure now exists, but automating its schedule and building a recurring drill cadence would still strengthen a design opinion on System Operations and Availability.
- **Type II is not attainable quickly under any circumstances**, since it requires demonstrating controls operated correctly across a real observation window (commonly 6 or 12 months for a first report) — this is a scheduling reality, not a documentation gap, and shouldn't be estimated away.
- **Scope is negotiated with the auditor, not fixed in advance**: whether the eventual report covers Security only or also Availability/Confidentiality is typically driven by what enterprise customers or contracts actually require, and is worth deciding with the auditor rather than assuming this document's scope is final.
- **Recommendation**: engage a licensed CPA firm with SOC 2 experience in SaaS/marketplace platforms once items 1–2 in Section 5 are closed; use this document as the starting crosswalk in that engagement, not as a substitute for it.

## 7. Review

This assessment should be revisited whenever the underlying ISO 27001 SoA is revisited (a new control-relevant capability ships, a new processor is engaged, CI status changes), and at minimum whenever the business seriously considers engaging a SOC 2 auditor. Maintained in `docs/compliance/soc2-readiness-assessment.md`.

## 8. Scope and limitations

This is a **self-assessment**, produced by reading the actual codebase and existing policy documentation, cross-referencing the ISO/IEC 27001 Statement of Applicability. It is not a SOC 2 report, was not produced under AICPA attestation standards, and does not involve any CPA firm, auditor, or accredited third party. **KejaApp has no SOC 2 report, of either type, and none should be implied, quoted, or represented to any external party on the basis of this document.** Treat every entry here as "mapped as of this writing, per the cited mechanism" — verify against current code and engage an accredited CPA firm before making any SOC 2-related claim externally.
