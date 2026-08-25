# KejaApp Anti-Bribery and Anti-Corruption Policy

## 1. Purpose and scope

This policy states KejaApp's zero-tolerance position on bribery and corruption, in any form, by anyone acting for or on behalf of KejaApp. It is written to align with Kenya's **Anti-Bribery Act, No. 47 of 2016** (Cap. 79B) — in particular the **Section 9** duty on private entities to put in place bribery-prevention procedures "appropriate to its size and the scale and to the nature of its operation." KejaApp is a small, solo/small-team-operated platform (see [`risk.md`](risk.md)'s organizational-risk item), not a large enterprise with a dedicated compliance function — this policy is scoped honestly to that reality, not padded out to look like a bigger company's program. It applies to:

- The KejaApp team (anyone with administrative, financial, or vendor-facing authority on the platform's behalf).
- Anyone performing services for or on behalf of KejaApp "as an agent, employee, or in any other capacity" — the Act's own definition of an **associated person** (Section 11), whose conduct in obtaining or retaining business or an advantage for KejaApp can expose KejaApp itself to liability (Section 10), not just the individual.

It does not govern the conduct of tenants, landlords, agencies, or movers toward *each other* — that's covered by the [Code of Ethics](code-of-ethics.md) and [Acceptable Use Policy](acceptable-use-policy.md). This policy is specifically about bribery/corruption risk in how KejaApp itself is operated: verification decisions, vendor relationships, and any future dealings with public officials.

## 2. Zero-tolerance statement

KejaApp does not offer, promise, give, solicit, or accept a bribe — a financial or other advantage intended to induce or reward improper performance of a function or activity — to or from anyone, for any reason, including to speed up a legitimate process, win business, or influence a decision. This applies regardless of local custom, whether the counterparty is a private individual or a public official, and regardless of transaction size.

## 3. Where this risk actually shows up in KejaApp today

Being specific rather than abstract, since a policy that only speaks in generalities is easy to ignore in practice:

- **Agency and mover verification review** (admin approve/reject on submitted business documents, see [Architecture — Trust & safety](https://github.com/Abdurleone/kejaapp/wiki/Architecture)) is the platform's one recurring point of discretionary human judgment that could be a bribery target — e.g. a business paying to get verified without genuine supporting documents. This is mitigated by the same logged, auditable admin-action trail already required by the [Code of Ethics §2.6](code-of-ethics.md#26-conflict-of-interest) for conflicts of interest generally; the two concerns (bribery and self-dealing) are handled by the same control.
- **Vendor and infrastructure relationships** (Render, MongoDB Atlas, Backblaze B2, ngrok, and similar) are standard commercial subscriptions at published rates — not the kind of large-value procurement or tendering relationship where bribery risk typically concentrates. This should be re-assessed if KejaApp ever enters a materially different kind of commercial relationship (a large enterprise contract, a government partnership, a physical office lease).
- **Any future interaction with a public official or government body** (e.g. county-level engagement, regulatory approval, a business-registration matter) is the highest-risk category the Act specifically contemplates and the one this team has the least current experience with — see [Section 6](#6-gifts-hospitality-and-facilitation-payments) below.

## 4. Duty to report

Kenya's Anti-Bribery Act (Section 14) requires **anyone** in a private entity — not just management — to report to the Ethics and Anti-Corruption Commission (EACC) **within 24 hours** any knowledge or suspicion of bribery. Failure to report within that window is itself an offence. Practically, for a team this size:

1. Report internally first (or simultaneously) via the same channel as any other ethics concern — see [Code of Ethics §4](code-of-ethics.md#4-reporting-a-concern) — so it can be acted on immediately, not just filed.
2. The 24-hour EACC reporting duty is personal, not something an internal report discharges on your behalf — see the EACC's own reporting channels at [eacc.go.ke](https://eacc.go.ke) if you have direct knowledge or suspicion of an actual instance of bribery.
3. This duty applies to suspicion, not just proof — the Act does not require certainty before the reporting clock starts.

## 5. Whistleblower protection

Per Section 21 of the Act, no one who reports a genuine concern in good faith may be intimidated, harassed, demoted, dismissed, or otherwise retaliated against for doing so — retaliation is itself a separate offence under the Act (fines up to KES 1,000,000 or imprisonment up to one year), independent of whatever the original report concerned. A report made in good faith is protected even if it later turns out to be mistaken; only a report made maliciously or knowingly false loses this protection.

## 6. Gifts, hospitality, and facilitation payments

- A modest, transparent gift or hospitality that isn't tied to influencing a specific decision (a holiday card, a shared meal in the normal course of a business relationship) is not what this policy targets.
- A **facilitation payment** — a small payment to speed up a routine government action someone is already entitled to — is treated the same as any other bribe under this policy and under the Act itself. "Everyone does it" or "it's the only way to get this done" is not an exception.
- Anyone unsure whether something crosses the line should ask before proceeding, not after — see [Section 4](#4-duty-to-report) for who to ask.

## 7. Consequences

Beyond the criminal penalties the Act itself sets out for individuals (up to 10 years' imprisonment or a KES 5,000,000 fine, plus a mandatory additional fine of five times any quantifiable benefit, and up to 10 years' disqualification from directorship — Section 18) and for the entity (a court-determined fine), a substantiated internal violation of this policy is treated as a serious breach of trust in how someone represents KejaApp, handled through the same enforcement transparency already described in [Code of Ethics §3](code-of-ethics.md#3-enforcement) — logged, reasoned, and reviewable.

## 8. Relationship to formal certification

This policy states KejaApp's anti-bribery principles and its honest reading of what Kenya's Anti-Bribery Act requires of an entity this size. It is **not** a certified anti-bribery management system (e.g. ISO 37001, already referenced as an aligned framework in the [Code of Ethics](code-of-ethics.md#1-purpose-and-scope)) and has not been reviewed by a qualified compliance professional or lawyer. Nothing here is legal advice; anyone facing an actual bribery-adjacent situation involving KejaApp should seek qualified legal counsel and use the EACC's own reporting channels directly.

## 9. Ownership and review

This policy should be revisited whenever KejaApp's operations materially change in a way that raises bribery/corruption exposure (a government-facing feature, a large commercial partnership, a physical office, hired staff beyond the current small team) and reviewed at least annually otherwise. Maintained in `docs/compliance/anti-bribery-and-anti-corruption-policy.md`.
