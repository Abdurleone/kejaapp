# Deleting Your Account

The full walkthrough for closing your KejaApp account, for any role. See the [General Guide](general-manual.md) for everything else common to every role, and your own role's manual (linked there) for what you can do while your account is still open.

## Before you start

**This is permanent and immediate.** There's no grace period, no "recover within 30 days," and no soft-delete — the moment you confirm, your account and everything listed below is gone from KejaApp's database in that same request. If you're not certain, consider it carefully first; nothing here can be undone by KejaApp support after the fact.

If you're an **admin** looking to remove *someone else's* account rather than your own, that's a different action — see the [Admin Manual §2](admin-manual.md#2-managing-user-accounts) instead. Everything on this page is about closing your own account.

## How to delete it

### If you can sign in

**Web**: open **Account**, scroll to **Delete account**, type `DELETE` into the confirmation field, then click **Delete my account**. That single confirmation is the only step — there's no second pop-up.

**Mobile**: open **More → Account**, scroll to **Delete account**, type `DELETE` into the confirmation field, then tap **Delete my account**. Mobile adds one extra step web doesn't: a native "Are you sure?" dialog appears after you tap the button, and you must confirm that too before anything actually happens.

Either way, you're signed out immediately once deletion completes — there's no account left to be signed into.

### If you can't sign in

Email **privacy@kejaapp.com** from the address linked to your KejaApp account, requesting deletion. Include your account email, your phone number if you have one on file, and which role you registered as (tenant, landlord, agency, or mover) so the request can be matched to the right account without you needing to prove access to it first.

## What actually gets deleted

Everything below is deleted in the same operation, regardless of role:

- Your profile and login credentials.
- Every sign-in session you have anywhere — this is a global sign-out, not just the device you're deleting from.
- Saved/favorited properties, notifications, and any registered push notification devices (mobile) or browser subscriptions (web).
- Feedback you submitted (an admin's *response* to it, if any, goes with it).
- Saved searches (tenants).

**Depending on what you've actually done on KejaApp**, deletion also removes:

- **Inquiries and viewing requests** you sent as a tenant, *and* any sent to you as a landlord/agency about your own properties.
- **Reviews you wrote** — deleting your account also deletes your own reviews. (This is different from what happens to your review while your account is still open: as covered in the [Tenant Manual §5](tenant-manual.md#5-leaving-a-review), no one else can delete it or change its rating while you're still around — closing the account yourself is the one way it goes away.)
- **Every property you own** (landlord/agency), including its images, and every inquiry/viewing request/review tied to those properties — even ones from tenants who aren't deleting *their* accounts.
- **Your agency or mover verification submission**, if you made one.
- **Your mover business profile** and any mover-service requests you sent (as a tenant) or received (as a mover).
- **Mover affiliate links**: if you're a landlord/agency who'd marked a mover as an affiliate, that link is removed — the mover's own account is untouched. If you're the mover being un-affiliated this way, same thing in reverse: you're not notified individually, since it's a side effect of the other party's deletion, not an action about you.

## What survives, on purpose

A few things you were involved in **don't** disappear, because deleting them would destroy someone else's real, still-valid record just because you happened to be the one who acted on it:

- If you're an **admin**, moderation actions you took on other users' accounts — status-change log entries, agency/mover verification decisions, a review you hid or a report you dismissed, a feedback response you gave — all stay in place on those other users' records. Only the "who did this" attribution is cleared; the record itself, and the fact that *some* admin took that action, is preserved for their audit trail.
- A **review someone else reported on your property**, or one you reported on someone else's, keeps existing after either of you deletes your account — only the "reported by" reference is cleared if you're the reporter.

None of this is optional or configurable per request — it's the same cascade whether you delete your own account or an admin deletes it on your behalf via the separate admin-initiated path.

## Related reading

- [Data Protection Policy §9](../compliance/data-protection-policy.md#9-retention-and-deletion) — the formal policy this behavior implements.
- [General Guide §6](general-manual.md#6-your-data-and-privacy) — your data/privacy rights more broadly, including how to request deletion without deleting your entire account (data-subject rights requests).
