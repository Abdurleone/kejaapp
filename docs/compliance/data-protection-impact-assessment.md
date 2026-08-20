# KejaApp — Data Protection Impact Assessments (DPIA)

## 1. Purpose

A Data Protection Impact Assessment identifies and mitigates privacy risk **before** a processing activity ships, for activities that are novel, involve location/behavioral data, or could otherwise pose meaningful risk to users — the threshold GDPR Art. 35 and good Kenya DPA practice both point to. This document assesses the KejaApp processing activities that meet that bar. Lower-risk activities are already covered adequately by the [Data Protection Policy](data-protection-policy.md) and the [Records of Processing Activities](records-of-processing-activities.md) without a dedicated DPIA.

## 2. DPIA — Mover request pickup geolocation

**Processing activity**: capturing a tenant's device location at the moment they submit a mover service request, to compute a pickup-to-drop-off distance for the receiving mover (RoPA #11).

| Item | Assessment |
|---|---|
| Necessity | A mover benefits from knowing the approximate distance of a job before accepting. Without it, movers would have to ask manually, adding friction the feature is meant to remove. |
| Proportionality | Only a single coordinate pair is requested, only at the moment of request submission, only from tenants who choose to submit a mover request — not collected passively or continuously, and not requested from any other role or flow. |
| Data minimization design | The coordinate is used to compute a distance **at read time** and is never persisted independently — see `attachDistanceKm` in `backend/controllers/moverRequestController.js`. If the underlying property's location changes, the distance recalculates rather than going stale, and there is no historical location trail to secure or later delete. The same computed distance also feeds a price estimate (`attachPriceEstimate`, weighed against the tenant's home-size selection) — same computed-on-read, never-persisted pattern, so this doesn't change the assessment below. |
| Consent | A native browser/device geolocation permission prompt is shown at the moment of request; declining it does not block the request — it's simply submitted without a distance estimate. No location is requested for any purpose other than this one flow. |
| Risk to individuals | A tenant's approximate home/pickup location is disclosed to the specific mover they chose to contact — a party they've already decided to trust with moving their belongings. Risk of secondary use is low given the point-in-time, non-persisted design; residual risk is a mover inferring a tenant's current address, which is inherent to arranging a physical pickup at all. |
| Mitigations in place | No persistence (above); location shared only with the one mover selected, never broadcast to other movers or shown publicly; permission is a standard OS-level prompt the user controls. |
| Residual risk after mitigation | Low. |
| Outcome | Proceed as implemented. Revisit if the feature is ever extended to store location history or share it with parties beyond the selected mover. |

## 3. DPIA — Property image fingerprinting / duplicate detection

**Processing activity**: computing a fingerprint (perceptual hash) of every uploaded listing image and comparing it against fingerprints from other accounts to detect reused/fraudulent images (RoPA #16).

| Item | Assessment |
|---|---|
| Necessity | Directly supports a named trust-and-safety goal — detecting landlords/agencies who reuse another owner's listing photos to misrepresent a property, which is a form of fraud tenants have no other way to detect. |
| Proportionality | The fingerprint is derived only from images voluntarily uploaded as part of a public listing — not from any private photo, and not compared against any source outside KejaApp's own uploaded-image set. |
| Data minimization design | The fingerprint is a hash of image content, not of any person depicted in an image, and is not personal data about a data subject beyond identifying which account uploaded it. |
| Consent / legal basis | Legitimate interest in fraud prevention — a landlord/agency uploading a public listing image should reasonably expect it to be checked for reuse, given this is disclosed in the [Data Protection Policy](data-protection-policy.md#5-purpose-and-legal-basis-for-processing) and [Acceptable Use Policy](acceptable-use-policy.md#1-listings-landlords-agencies). |
| Risk to individuals | A false-positive match could incorrectly flag a legitimate owner's account. This is the primary identified risk given the automatic-suspension consequence after repeated violations. |
| Mitigations in place | Violations are individually reviewable by an admin (`GET/PUT /api/admin/violations*`), suspension only triggers after **four active** violations (not a single flagged match), and an affected user can appeal via the Feedback tab (see [Code of Ethics §3](code-of-ethics.md#3-enforcement)). |
| Residual risk after mitigation | Low-to-moderate, concentrated in the false-positive scenario above — mitigated by human review before any permanent consequence, but not eliminated, since suspension itself (before appeal) is an automatic consequence of the fourth flagged match. |
| Outcome | Proceed as implemented. Recommended follow-up (not yet built): surface the specific matched image/account pair to the flagged user at the time of the violation, so an appeal can address the actual claim rather than a generic notice. |

## 4. DPIA — Admin account moderation (status, violations, verification review)

**Processing activity**: admins reviewing account status history, violation records, and verification documents to moderate the platform (RoPA #15).

| Item | Assessment |
|---|---|
| Necessity | Required to operate any trust-and-safety enforcement at all — someone has to be able to review a flagged account and decide/confirm an outcome. |
| Proportionality | Scoped to admin-role accounts only, via role-based authorization enforced on every admin endpoint; no other role can view another user's violation history or verification documents. |
| Risk to individuals | Concentration of visibility in a small number of admin accounts creates a conflict-of-interest and data-misuse risk if not governed. |
| Mitigations in place | Every status-changing action is logged with actor, reason, and timestamp (audit trail); an admin cannot change their own account's status; [Code of Ethics §2.6](code-of-ethics.md#26-conflict-of-interest) and the [Admin Manual §6](../user-manual/admin-manual.md#6-handling-personal-data-responsibly) require admins to recuse themselves from any account they have a personal/financial connection to. |
| Residual risk after mitigation | Low, contingent on the conflict-of-interest rule actually being followed — this is a governance control, not a technical one, so it depends on admin conduct rather than something the software can fully enforce. |
| Outcome | Proceed as implemented. If KejaApp scales to multiple admins, consider adding a technical control (e.g. flagging when an admin's own name/email/phone matches the account they're viewing) as a defense-in-depth backstop to the governance rule. |

## 5. Review

Each assessment above should be revisited whenever its underlying feature changes materially (e.g. if mover location were ever persisted, or if image fingerprinting were extended beyond perceptual hashing). Maintained in `docs/data-protection-impact-assessment.md`.

## 6. Scope and limitations

These are engineering-team-authored risk assessments grounded in the actual implementation, intended to demonstrate the kind of privacy-by-design thinking GDPR Art. 35 and good Kenya DPA practice expect — not a substitute for a DPIA conducted or reviewed by a qualified data-protection professional before relying on it for formal compliance purposes.
