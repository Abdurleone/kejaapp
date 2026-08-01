# Governance and Policies

KejaApp maintains a full set of governance, legal, and data-protection documentation alongside the code, in [`docs/`](https://github.com/Abdurleone/kejaapp/tree/main/docs). It's written to align with Kenya's Constitution and Data Protection Act 2019, the GDPR, and ISO/IEC 27001-family control themes — as operational, product-grounded documentation, not a certified compliance filing. Every document says so explicitly in its own "scope and limitations" section.

For the canonical, most up-to-date version of each document, follow the links below into the repo — if anything here looks out of date, trust the linked file over this page.

## Platform ethics and terms

- **[Code of Ethics](https://github.com/Abdurleone/kejaapp/blob/main/docs/code-of-ethics.md)** — the principles governing how KejaApp is built and operated: honesty in listings, non-discrimination, privacy, safety/trust, fair dealing between roles, and admin conflict-of-interest rules. Distinct from [`CODE_OF_CONDUCT.md`](https://github.com/Abdurleone/kejaapp/blob/main/CODE_OF_CONDUCT.md), which governs contributor conduct in this repo, not platform use.
- **[Terms of Service](https://github.com/Abdurleone/kejaapp/blob/main/docs/terms-of-service.md)** — the agreement formed at registration: what KejaApp is and isn't (a discovery/coordination layer, not a party to any tenancy or payment), account rules, listing-content licensing, disclaimers, liability limits, and Kenya as the governing law.
- **[Acceptable Use Policy](https://github.com/Abdurleone/kejaapp/blob/main/docs/acceptable-use-policy.md)** — the enforceable list of prohibited listing content and conduct behind the Code of Ethics, tied to the same violation/suspension/ban mechanism already built into the platform.
- **[Dispute Resolution & Complaints Policy](https://github.com/Abdurleone/kejaapp/blob/main/docs/dispute-resolution-policy.md)** — draws the line between disputes *between users* (which KejaApp doesn't mediate) and complaints *about KejaApp itself or an enforcement decision* (which it commits to a defined review process for).

## Data protection and privacy

- **[Data Protection Policy](https://github.com/Abdurleone/kejaapp/blob/main/docs/data-protection-policy.md)** — what personal data is collected, the legal basis for each category, third-party processors, retention/deletion, subject rights, security measures, breach notification, and a formal Data Protection Officer designation. Summarized in-app as a combined "Privacy & data protection" page (linked as "Privacy" from the public landing page and signed-in app footers), downloadable as a watermarked PDF via the browser's print dialog — not only reachable by reading this repo doc.
- **[Cookie Policy](https://github.com/Abdurleone/kejaapp/blob/main/docs/cookie-policy.md)** — the actual cookies and `localStorage` keys the web frontend uses (`keja_token`, `keja_refresh`, theme preference, dev API override) and why none currently require a consent banner.
- **[Records of Processing Activities](https://github.com/Abdurleone/kejaapp/blob/main/docs/records-of-processing-activities.md)** — an 18-row GDPR Art. 30-style register mapping every KejaApp feature to the personal data it touches, its legal basis, recipients, and retention.
- **[Data Protection Impact Assessments](https://github.com/Abdurleone/kejaapp/blob/main/docs/data-protection-impact-assessment.md)** — risk assessments for the three highest-risk processing activities: mover request pickup geolocation, property image fingerprinting, and admin account moderation.

## Security and operations

- **[Incident Response Plan](https://github.com/Abdurleone/kejaapp/blob/main/docs/incident-response-plan.md)** — the internal runbook for *handling* a security/data incident (severity levels, containment, ODPC/user notification, post-incident review) — distinct from [`SECURITY.md`](https://github.com/Abdurleone/kejaapp/blob/main/SECURITY.md), which covers how an outsider *reports* a vulnerability.
- **[ISO/IEC 27001 Statement of Applicability](https://github.com/Abdurleone/kejaapp/blob/main/docs/iso27001-statement-of-applicability.md)** — a self-assessment against all 93 Annex A:2022 controls (organizational, people, physical, technological), honestly marking each as implemented, partial, or a genuine gap — including a prioritized gap list (database backup/restore tops it).
- **[Accessibility Statement](https://github.com/Abdurleone/kejaapp/blob/main/docs/accessibility-statement.md)** — what's implemented against WCAG 2.1 AA today (touch targets, reduced-motion support, keyboard-accessible admin table, the auth modal's dialog semantics/focus trap, the main nav's ARIA tablist pattern, alt text) versus what hasn't been audited yet.

## User documentation

- **[User Manual](user-manual/general-manual.md)** — a general guide (account creation, sign-in, notifications, data/privacy basics) plus one manual per role: [tenant](user-manual/tenant-manual.md), [landlord & agency](user-manual/landlord-agency-manual.md), [mover](user-manual/mover-manual.md), and [admin](user-manual/admin-manual.md). The canonical source for these pages lives in [`docs/user-manual/`](https://github.com/Abdurleone/kejaapp/tree/main/docs/user-manual).

## In-app

The web app surfaces a condensed **Privacy** page and a new **Terms** page (both linked from the footer on every screen), plus a public **Delete Account** page — each a short summary pointing back to the full documents above.
