# KejaApp User Manual — Admins

See the [General Guide](general-manual.md) first for account creation, sign-in, notifications, and data/privacy basics common to every role. Admin accounts are not self-registered through the public sign-up form — they're provisioned directly.

## 1. What admins do (and don't do)

Admins moderate **users**, not **listings**. There is no admin path anywhere in KejaApp — web, mobile, or API — to create, edit, delete, or view a landlord/agency's property inventory, respond to an inquiry, or manage a viewing request on someone else's behalf. This separation is deliberate: see [Code of Ethics §2.4](../code-of-ethics.md#24-safety-and-trust) on why moderation and listing control are kept apart.

What admins do have:

- User account search, review, and status moderation.
- Agency and mover verification review.
- Violation review (duplicate-listing-image detections and any other flagged issue).
- Platform feedback review and response.
- A read-only view of reviews across the platform, for moderation visibility (not deletion — no one can delete a review, including admins).

## 2. Managing user accounts

From the Admin console:

1. **Search/filter** users by name, email, phone, or role.
2. Open a user's **account summary** — profile, violation counts, and role-specific activity counts (tenant/owner/agency/mover), plus their full **status change history**.
3. Change status to `active`, `suspended`, or `banned`, with a required reason. The user is notified, and the change is permanently logged (actor, reason, timestamp) for audit — you cannot change your own account's status to suspended or banned.

Treat every status change as auditable: it will show up in that user's history, visible to any admin who later reviews the account, and to the user themself.

A separate, irreversible capability exists at the API level (`DELETE /api/admin/users/:id`, not yet exposed as a button in the Admin console) that fully deletes an account and everything it owns — the same cascade the self-service "delete my account" flow uses, not just a status change. Unlike a status change, this leaves no audit trail for the deleted account itself (its own status history is deleted along with it) — reserve it for clear administrative cleanup (e.g. spam or test accounts), not as an escalation of the suspend/ban workflow, which is deliberately the reversible, logged path for actual moderation decisions. You cannot delete your own account this way — use Account settings instead.

## 3. Reviewing verification requests

Agency and mover verification requests both list `pending`/`approved`/`rejected` requests and use identical actions:

- **Approve** — marks the business `verified` (surfaces the "Verified agency"/mover badge to tenants) and notifies the submitter.
- **Reject** — requires a reason, notifies the submitter with that reason, and does not block the business from continuing to operate or resubmitting.

Base your decision only on the submitted business details/documents — verification is a trust signal for other users, not a mechanism to control who may participate on the platform (see [Code of Ethics §2.2](../code-of-ethics.md#22-non-discrimination-and-fair-access)).

## 4. Violation review

Duplicate-listing-image violations are currently detected automatically (image fingerprinting flags reused images across different owners). Review flagged violations and update their status as needed. Four **active** violations on one account trigger an automatic suspension — this happens without manual action, so your review role here is about catching and correcting false positives, not triggering the enforcement itself.

## 5. Platform feedback

List all submitted feedback (from tenants, landlords, agencies, and movers — admins themselves cannot submit feedback, only respond). Responding to a pending item:

- Marks it `responded`.
- Notifies the submitter.
- **Immediately publishes it** as a public testimonial on the landing page — there is no separate publish/unpublish step, so write your response as if it will be shown publicly right away.

Some feedback submissions are appeals of an enforcement action rather than general comments — handle those per the [Dispute Resolution & Complaints Policy](../dispute-resolution-policy.md#3-complaints-about-kejaapp-or-its-enforcement-decisions), which expects a real re-examination of the underlying record, not a form response.

## 6. Handling personal data responsibly

As an admin, you have visibility into other users' account details, violation history, and verification documents that other roles cannot see. This access exists for moderation purposes only:

- Don't look up or act on an account you have a personal or financial connection to — recuse yourself and note the conflict, per [Code of Ethics §2.6](../code-of-ethics.md#26-conflict-of-interest).
- Don't share what you see in a user's account outside the moderation action it's needed for.
- Direct any data-subject rights request you receive (access, correction, deletion) that comes to you directly rather than through `privacy@kejaapp.com` to that address, so it's handled and logged consistently — see the [Data Protection Policy](../data-protection-policy.md#10-data-subject-rights).
- If you suspect a security or data-protection incident (not a routine violation) — unauthorized access, a suspected breach, anomalous account activity you can't attribute to a normal moderation action — follow the [Incident Response Plan](../incident-response-plan.md) rather than handling it ad hoc.

## 7. What admins can't do

- Create, edit, delete, or view any property listing, or manage inquiries/viewing requests for any property.
- Submit platform feedback.
- Delete or alter a review or its rating.
- Change their own account's status.
