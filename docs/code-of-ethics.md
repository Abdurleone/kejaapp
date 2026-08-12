# KejaApp Code of Ethics

## 1. Purpose and scope

This Code of Ethics sets out the principles that govern how KejaApp is built, operated, and used. It applies to:

- The KejaApp team (engineering, product, support, and anyone with administrative access to the platform).
- Every user role the platform serves — tenants, landlords, agencies, movers, and admins.

It is a **platform and business ethics policy** — how KejaApp treats the people who use it and the decisions its operators make. It is distinct from [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md), which governs behavior of permitted contributors to the codebase itself (based on the Contributor Covenant).

The principles here are made enforceable in the [Terms of Service](terms-of-service.md) and the [Acceptable Use Policy](acceptable-use-policy.md); how KejaApp handles disagreements — between users, or about an enforcement decision — is covered in the [Dispute Resolution & Complaints Policy](dispute-resolution-policy.md).

This document is written to align with the themes of Kenya's **Constitution of Kenya, 2010** (notably Article 27, equality and freedom from discrimination, and Article 31, privacy), the **Kenya Data Protection Act, 2019**, the **Consumer Protection Act, 2012**, and internationally recognized frameworks including the **UN Guiding Principles on Business and Human Rights**, **ISO 26000** (guidance on social responsibility), and **ISO 37001** (anti-bribery management systems). It is an operational statement of intent, not a substitute for formal legal or compliance certification — see [Section 6](#6-relationship-to-formal-certification).

## 2. Core principles

### 2.1 Honesty and transparency

- Property listings must accurately represent the home being advertised — description, location, pricing, amenities, and images. Landlords and agencies are responsible for the accuracy of what they publish.
- Pricing must be transparent: rent, deposit, and agency fees are disclosed up front (see the cost-summary feature), not revealed only after a tenant has committed time to an inquiry or viewing.
- KejaApp does not manipulate search results, ratings, or reviews for commercial advantage. Ranking and filtering logic is applied uniformly to every listing that matches a search.

### 2.2 Non-discrimination and fair access

- KejaApp does not permit discrimination in housing access on the basis of ethnicity, tribe, race, religion, sex, marital or family status, disability, health status (including HIV status), or any other ground prohibited under Article 27 of the Constitution of Kenya.
- Role-based access controls (tenant, landlord, agency, mover, admin) exist to route the right workflow to the right user — they are functional boundaries, not a mechanism for excluding any group of people from using the platform in their chosen role.
- Verification (agency and mover) is a trust signal earned through a documented, consistent review process — it is never used to gatekeep participation based on identity.

### 2.3 Privacy and data protection

- Personal data is collected only for the purposes described in the [Data Protection Policy](data-protection-policy.md), never sold to third parties, and shared with other users only to the extent needed to complete a rental, viewing, review, or moving transaction they initiated.
- Every user has the right to know what data KejaApp holds about them, to correct it, and to request its deletion. See the Data Protection Policy for the full detail.

### 2.4 Safety and trust

- KejaApp actively guards against fraud and abuse: duplicate-listing-image detection, a violation-tracking system, and automatic suspension after repeated violations exist to protect tenants from fake or misleading listings.
- Reviews are tenant-authored and cannot be deleted by the property owner or an admin — owners may respond publicly, but they cannot suppress a legitimate review. This preserves reviews as an honest trust signal for future tenants.
- Admins moderate **accounts**, not listing content or commercial terms — this separation of powers means no single admin decision can both police a dispute and profit from its outcome.

### 2.5 Fair dealing between roles

- KejaApp is a discovery and coordination platform. It does not mediate, hold, or process rent, deposits, or agency fees between parties (see [Payment Boundary](../README.md#payment-boundary) in the README) — financial arrangements remain a direct matter between tenant and landlord/agency, and between tenant and mover.
- Contact details a landlord or agency provides on a listing must be accurate and functional; tenants are entitled to reach an owner through the channel the owner themselves designated as preferred.
- Movers accepting a service request are expected to honor the terms (service type, approximate distance, availability) under which the request was accepted, or decline/communicate a change promptly through the platform's status workflow rather than leaving a request unanswered.

### 2.6 Conflict of interest

- Anyone with admin access must not use that access to inspect, moderate, or influence outcomes for an account in which they have a personal or financial interest (their own account, a family member's, or a business associate's). Admin actions on user status are logged and auditable specifically so this can be checked.
- Staff and contributors with database or infrastructure access must not access personal data for any purpose other than debugging, support, or a request the data subject themselves initiated.

### 2.7 Respectful conduct

- Communication between users (inquiries, viewing coordination, mover requests, reviews, platform feedback) is expected to be civil. Abusive, threatening, or harassing messages reported through the platform are treated as violations subject to the same escalation path as fraudulent listings.

## 3. Enforcement

Ethical violations are handled through the same trust-and-safety mechanism already built into the platform. The specific list of prohibited content and conduct these principles translate into is the [Acceptable Use Policy](acceptable-use-policy.md).

1. A violation is recorded against the offending account (currently automated for duplicate-listing-image fraud; other violation types are recorded by an admin on review).
2. Accumulating active violations leads to account suspension, and a fourth active violation triggers an automatic ban, per the existing trust-and-safety design (see [Architecture — Trust & safety](https://github.com/Abdurleone/kejaapp/wiki/Architecture)).
3. Every account status change is logged with a reason and is visible to the affected user and to admins reviewing the account's history.
4. A user who believes an enforcement action was made in error can appeal through the Feedback channel; an admin response is required before feedback is closed.

## 4. Reporting a concern

- **Users**: use the in-app Feedback tab, or email `privacy@kejaapp.com` for anything involving personal data or account security.
- **Contributors**: see [SECURITY.md](../SECURITY.md) for reporting a security vulnerability, and [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) for interpersonal conduct concerns in the project community.

## 5. Ownership and review

This document is maintained alongside the codebase in `docs/code-of-ethics.md` and should be reviewed whenever a new user role, verification workflow, or moderation mechanism is added — most recently updated for the mover role, mover verification, and role-scoped property access.

## 6. Relationship to formal certification

This Code of Ethics states the principles KejaApp is built to follow today, referencing recognized frameworks (Kenya's Constitution and Data Protection Act, and ISO guidance standards) as the vocabulary and structure to align with. It is **not** itself a certification, and KejaApp has not undergone external audit against ISO 37001 or any other standard. Pursuing formal certification, or a legal compliance review by a qualified professional, is a separate undertaking from maintaining this document.
