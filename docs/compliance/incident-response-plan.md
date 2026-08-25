# KejaApp Incident Response Plan

## 1. Purpose and scope

This is the internal runbook for **handling** a security or data-protection incident once it's known about — distinct from [SECURITY.md](../SECURITY.md), which covers how an outsider **reports** a vulnerability to KejaApp in the first place. It applies to any incident involving KejaApp's systems or user data: a reported vulnerability, a detected breach, unauthorized access, or a significant service compromise. It operationalizes the breach-notification commitments in the [Data Protection Policy §12](data-protection-policy.md#12-breach-notification), aligned with ISO/IEC 27001 Annex A's incident-management control theme (A.5.24–A.5.28).

## 2. Severity levels

| Level | Definition | Example |
|---|---|---|
| **Critical** | Active exploitation, confirmed personal-data exposure, or full loss of service | Database credentials leaked and in active use; mass unauthorized account access |
| **High** | Confirmed vulnerability with a credible path to data exposure, not yet known to be exploited | An auth-bypass bug found in code review before it reaches production, or reported by a researcher |
| **Medium** | Vulnerability or misconfiguration with limited blast radius | A single endpoint missing a role check that only exposes non-sensitive data |
| **Low** | Hardening opportunity, no direct exposure | An outdated dependency with a low-severity advisory and no known exploit path |

## 3. Response phases

### 3.1 Detection & triage (target: within hours of discovery)

- Incidents surface via: a [SECURITY.md](../SECURITY.md) report, automated monitoring/error logs (`backend/logs/app-YYYY-MM-DD.log`), an admin noticing anomalous account activity, or a dependency-vulnerability alert (Dependabot).
- Whoever receives the report assigns a severity level (Section 2) and a single incident owner responsible for coordinating the response.

### 3.2 Containment (target: as fast as safely possible)

Depending on the incident:

- Revoke/rotate the affected credential(s) — JWT signing secret, database credentials, S3/storage keys, or a specific compromised session (`AuthSession` records can be revoked server-side).
- Suspend the specific affected account(s) via the existing admin account-status workflow, if the incident is account-specific rather than systemic.
- Roll back or hotfix the vulnerable code path; deploy through the normal CI pipeline unless the severity justifies an expedited out-of-band deploy.
- Take a system offline (health-check-based load balancer removal, or a full outage) only if containment genuinely requires it — weigh this against the cost of downtime to users mid-transaction.

### 3.3 Assessment

- Determine what data, if any, was actually accessed or exposed — cross-reference the [Records of Processing Activities](records-of-processing-activities.md) to scope exactly which personal-data categories are implicated.
- Determine the number of affected users and whether any are in a jurisdiction with a specific mandatory-notification threshold.

### 3.4 Notification (only where personal data is implicated)

Per the [Data Protection Policy §12](data-protection-policy.md#12-breach-notification):

1. Notify the **Office of the Data Protection Commissioner (ODPC)** within 72 hours of becoming aware of a breach likely to result in risk to data subjects.
2. Notify **affected users directly**, without undue delay, if the breach is likely to result in high risk to their rights (e.g. exposed passwords, verification documents, or contact details usable for targeted fraud).
3. Notification content: what happened, what data was involved, what KejaApp has done/is doing about it, and what the affected user can do (e.g. change their password, watch for suspicious contact).

### 3.5 Remediation & recovery

- Confirm the vulnerability is closed (patched, dependency upgraded, misconfiguration fixed) before restoring any service taken offline.
- Force password resets or session invalidation for affected accounts where credentials may have been exposed.

### 3.6 Post-incident review

- Document: what happened, when it was detected, the response timeline, root cause, and what's changing to prevent recurrence (a code fix, a new automated check, a process change).
- Feed any process gap discovered back into this plan, the [Data Protection Impact Assessment](data-protection-impact-assessment.md) (if it reveals a risk not previously assessed), or the [ISO/IEC 27001 Statement of Applicability](iso27001-statement-of-applicability.md) (if it reveals a missing control).

### 3.7 Evidence handling

Applies throughout 3.1–3.6, not just at the end — evidence is easiest to lose in the first hours of an incident, before anyone's thought to write anything down.

- **What counts as evidence**: the app/access logs implicated (`backend/logs/app-YYYY-MM-DD.log`, `access-YYYY-MM-DD.log`), the specific database records involved (a `UserViolation`, `AuthSession`, or account document), and any screenshot/export a reporter or admin captured.
- **Preserve before you act**: where practical, copy the relevant log lines and export the relevant database record(s) to a dated file *before* containment steps that might change them (revoking a session, suspending an account, patching the code path) — containment can proceed without waiting for this, but do it as close to immediately-after as possible.
- **Don't overwrite the source**: never edit a log file or database record in place to "clean up" evidence, even after the incident is resolved — work from the preserved copy.
- **Record who touched it**: note, in the incident's own post-incident review (3.6), who accessed which evidence and when — this project's normal DB/log access controls (5.15, 8.15) are the access-control mechanism; this is just the log of who actually looked, kept alongside the incident write-up rather than in a separate system.

This is an informal, engineering-team-authored procedure appropriate to this project's current scale — not a substitute for a forensic specialist or legal counsel's evidence-handling standards if an incident ever escalates to a legal or regulatory proceeding.

## 4. Roles

| Role | Responsibility |
|---|---|
| Incident owner | Coordinates the response end-to-end for a given incident; the first person to triage it unless explicitly handed off |
| Anyone with admin/infrastructure access | Executes containment actions (account suspension, credential rotation) as directed by the incident owner |
| Data protection contact (`privacy@kejaapp.com`) | Owns user-facing and ODPC notification content and timing |

For a small team, one person may hold multiple roles above — the point is that every incident has a named owner, not that these are necessarily different people.

## 5. Related documents

- [SECURITY.md](../SECURITY.md) — how vulnerabilities are reported to KejaApp.
- [Data Protection Policy §12](data-protection-policy.md#12-breach-notification) — the notification commitments this plan operationalizes.
- [Data Protection Impact Assessment](data-protection-impact-assessment.md) — pre-identified risk areas most likely to be the subject of a future incident.

## 6. Review

This plan should be reviewed after every incident it's invoked for, and at least whenever a new category of personal data or third-party processor is introduced. Maintained in `docs/compliance/incident-response-plan.md`.

## 7. Scope and limitations

This is an operational runbook reflecting KejaApp's actual system architecture (logging, session model, admin tooling) — not a substitute for a breach-response review by legal counsel or a qualified incident-response professional at the time of an actual incident.
