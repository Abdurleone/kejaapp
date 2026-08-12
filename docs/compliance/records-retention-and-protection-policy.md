# KejaApp — Records Retention & Protection Policy

## 1. Purpose and scope

This covers **operational and business records** — audit logs, admin moderation/violation records, and incident-response documentation — as distinct from the **user-facing personal-data lifecycle** already covered in the [Data Protection Policy §9](data-protection-policy.md#9-retention-and-deletion). Read that document first if what you're looking for is "how a user's own data is deleted"; this one is about how KejaApp protects and retains its own records of what happened on the platform.

Written to address ISO/IEC 27001:2022 control **5.33 (Protection of records)** in the [Statement of Applicability](iso27001-statement-of-applicability.md), which this document is cross-referenced from.

## 2. What records this covers

| Record type | Where it lives | Current retention |
|---|---|---|
| HTTP/app logs | `backend/logs/access-YYYY-MM-DD.log`, `app-YYYY-MM-DD.log` | Accumulate on disk indefinitely — no automated expiry exists today (see [Section 4](#4-known-gaps)). |
| Admin moderation & violation records | `UserViolation` model | Tied to the associated account's lifecycle — deleted when the account is deleted, per the Data Protection Policy. |
| Image-fingerprint / duplicate-detection records | `PropertyImageFingerprint` model | Tied to the associated account/property's lifecycle — same as above. |
| Incident-response documentation | Wherever the response was written up (an issue, an internal doc) | No formalized minimum retention set. |

## 3. Protection measures

- **Access control**: database access is credentialed and role-restricted (JWT + RBAC at the application layer; direct database access is limited to whoever holds the connection credentials) — see [SoA controls 5.15, 8.3](iso27001-statement-of-applicability.md).
- **No ad hoc editing**: logs and the records above should never be edited in place to alter history — this is a stated convention (also relied on by the [Incident Response Plan §3.7](incident-response-plan.md#37-evidence-handling)), not a technically enforced one (see below).
- **Clock integrity**: all timestamps are standardized to `Africa/Nairobi` time (SoA control 8.17), so records from different sources line up consistently.

## 4. Known gaps

Documenting these honestly rather than implying a guarantee that doesn't exist:

- **No cryptographic immutability / WORM storage**. Anyone with sufficient database or filesystem access could technically alter a record or log file after the fact. Protection today rests entirely on access control and convention, not on a tamper-evident storage layer.
- **No automated log expiry**. Log files accumulate until someone manually cleans them up. A time-based rotation/deletion policy (e.g. 90 days) is a reasonable future target, not yet implemented.
- **Moderation/violation records don't outlive account deletion**. This is a real tension with trust-and-safety goals: a user who accumulates violations, deletes their account, and re-registers starts with a clean record today. This policy doesn't resolve that tension — it's flagged here so it's a known, deliberate trade-off (privacy-by-design favoring deletion) rather than an unnoticed gap.

## 5. Review

This policy should be revisited whenever a new record type with retention implications is introduced, and at minimum whenever the [Statement of Applicability](iso27001-statement-of-applicability.md) is reviewed. Maintained in `docs/records-retention-and-protection-policy.md`.

## 6. Scope and limitations

This is an engineering-team-authored policy reflecting KejaApp's actual current practice and its honestly-acknowledged gaps — not a substitute for a records-management or legal review of retention obligations for a specific operating entity or jurisdiction.
