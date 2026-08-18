# JakezApp — Records of Processing Activities (RoPA)

## 1. Purpose

This register itemizes each distinct personal-data processing activity carried out by JakezApp, in the format expected by **Article 30 of the GDPR** and the equivalent record-keeping expected of a data controller under the **Kenya Data Protection Act, 2019**. It is the granular, tabular companion to the narrative [Data Protection Policy](data-protection-policy.md) — read that document first for definitions and general commitments.

Every processing activity below is carried out by JakezApp acting as **data controller**. Security measures common to all activities are described once in the [Data Protection Policy §11](data-protection-policy.md#11-security-measures) rather than repeated per row.

## 2. Information classification scheme

Each activity below is labelled with one of four classification levels, applied to the data it processes:

- **Public** — already shown to anonymous visitors or published by design (an available listing, a submitted review, a responded-to feedback testimonial).
- **Internal** — ordinary platform data, visible to the acting user and scoped counterparties, but not published (saved favorites, notification metadata, saved searches, affiliate links, device tokens).
- **Confidential** — personal data restricted to the specific parties directly involved in an interaction (auth credentials, private messages/requests between a tenant and an owner or mover).
- **Restricted** — the platform's most sensitive holdings: verification documents and trust-and-safety/fraud records, visible only to reviewing admins.

This is an informal scheme (ISO/IEC 27001 controls 5.12/5.13), not a formal DLP-enforced label attached to the data itself — it documents the intended sensitivity tier per activity so a reader (or a future access-control review) has a starting point, rather than inferring it from scratch.

## 3. Register

| # | Activity | Purpose | Data subjects | Personal data categories | Legal basis | Recipients | Retention | Cross-border transfer | Classification |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Account registration & authentication | Create and secure a user account | All roles | Name, email, username, phone, hashed password, role, hashed session tokens | Contract performance | None (internal only) | Until account deletion | Per [§8](data-protection-policy.md#8-international-data-transfers) if hosting infra is non-Kenyan | Confidential |
| 2 | Property listing management | Let landlords/agencies publish and manage listings | Landlords, agencies | Property location/coordinates, pricing, amenities, images, listing contact details | Contract performance | Public (available listings), other users via search | Until listing/account deletion | Same as above (image storage may be a non-Kenyan bucket region) | Public |
| 3 | Property search & discovery | Let tenants/visitors find matching listings | Tenants, anonymous visitors | Search filters entered (not stored beyond the request) | Legitimate interest (core service) | None | Not persisted per search | N/A | Public |
| 4 | Saved favorites | Let tenants bookmark listings | Tenants | User ID, property ID | Contract performance | None | Until removed or account deletion | N/A | Internal |
| 5 | Property inquiries | Let tenants message an owner about a listing | Tenants, landlords, agencies | Message content, contact preference, sender/owner identity | Contract performance | The property owner | Until account deletion | N/A | Confidential |
| 6 | Viewing requests | Let tenants request/schedule a viewing | Tenants, landlords, agencies | Requested date, message, status history | Contract performance | The property owner | Until account deletion | N/A | Confidential |
| 7 | Reviews & ratings | Let tenants rate a property after interacting with it | Tenants, landlords, agencies | Rating, comment, owner response | Legitimate interest (trust & safety) | Public (attached to the listing) | Until account deletion (review is not independently deletable by any party) | N/A | Public |
| 8 | Agency verification | Assess and badge agency trustworthiness | Agencies | Business name, registration number, business contact details, submitted documents | Consent (submission) + legitimate interest (platform trust) | Reviewing admin only | Until account deletion | Document storage may be a non-Kenyan bucket region | Restricted |
| 9 | Mover profile & verification | Assess and badge mover trustworthiness, publish a directory listing | Movers | Business name, phone, service types, base location/coordinates, base price, submitted verification documents | Consent (submission) + legitimate interest | Public (directory), reviewing admin (documents only) | Until account deletion | Document storage may be a non-Kenyan bucket region | Public (profile) / Restricted (documents) |
| 10 | Mover affiliate management | Let owners endorse trusted movers | Landlords, agencies, movers | Owner ID ↔ mover ID linkage | Legitimate interest | The affiliated mover, tenants viewing that owner's listings | Until unaffiliated or either account is deleted | N/A | Internal |
| 11 | Mover service requests | Let tenants request and track a moving service | Tenants, movers | Request message, preferred date, status, response, one-time device geolocation (pickup point) | Consent (geolocation) + contract performance (the rest) | The requested mover | Until account deletion. Pickup coordinates are computed into a distance at read time and never stored | N/A | Confidential |
| 12 | Notifications (in-app + push) | Alert users to relevant activity | All roles | Notification content, read/unread state, device push token | Contract performance / consent (push registration) | Expo push service (token + notification payload only) | Until account deletion or device token removal | Expo's push infrastructure (see [§7](data-protection-policy.md#7-third-party-processors)) | Internal |
| 13 | Saved searches & match alerts | Notify tenants of new matching listings | Tenants | Location, radius, and optional price/type/bedroom filters | Consent | None | Until removed or account deletion | N/A | Internal |
| 14 | Platform feedback & testimonials | Collect and (once responded to) publish user feedback | Tenants, landlords, agencies, movers | Feedback message, admin response | Consent (submission), legitimate interest (publishing as testimonial once responded) | Public, once responded to | Until account deletion | N/A | Internal (submission) / Public (once published) |
| 15 | Admin user moderation | Investigate and act on account status/violations | All roles | Violation records, account status history, moderating admin's identity | Legitimate interest (trust & safety) | Reviewing admins only | Until account deletion | N/A | Restricted |
| 16 | Image fingerprinting / duplicate detection | Detect fraudulent reuse of listing images across accounts | Landlords, agencies | Image fingerprint hash, uploader identity | Legitimate interest (fraud prevention) | Reviewing admins (on flagged match) | Until account/property deletion | N/A | Restricted |
| 17 | Scheduled nudge jobs | Proactively remind users about stale inquiries/viewings/listings | Tenants, landlords, agencies | Reuses existing inquiry/viewing/listing records — no new data collected | Legitimate interest | None (generates notifications from #12) | N/A — no independent storage | N/A | Inherits from the reused record (#5/#6/#2) |
| 18 | Device token registration | Enable mobile push delivery | All roles (mobile app users) | Push token, platform (iOS/Android) | Consent | Expo push service | Until token removed, sign-out, or account deletion | Expo's push infrastructure | Internal |

## 4. Review

This register should be updated whenever a new processing activity, data category, or third-party recipient is introduced — most recently compiled alongside the mover role, mover request/verification workflows, and the notification bell. Maintained in `docs/records-of-processing-activities.md`.

## 5. Scope and limitations

This is a working, product-grounded RoPA maintained by the engineering team, not a substitute for formal ODPC registration filings or a legal/compliance review of the register's completeness for a specific operating entity — see [Data Protection Policy §14](data-protection-policy.md#14-scope-and-limitations).
