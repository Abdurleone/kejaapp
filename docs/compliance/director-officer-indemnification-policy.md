# KejaApp Director and Officer Indemnification Policy

## 1. Purpose and current applicability

This policy states what KejaApp would — and legally could not — indemnify a director or officer against under Kenya's **Companies Act, 2015 (No. 17 of 2015)**, and how that indemnity would need to be structured. Being honest about its current applicability rather than overstating it: as recorded in the [SOC 2 Readiness Assessment (CC1)](soc2-readiness-assessment.md) and the [ISO/IEC 27001 Statement of Applicability (5.2)](iso27001-statement-of-applicability.md), **KejaApp is not yet a registered company** — it is currently a solo/small-team operation (see [`risk.md`](risk.md)'s organizational-risk item), not an incorporated legal entity with directors in the Companies Act sense. The provisions below accordingly don't yet operate on anyone today; this document exists so the framework is already understood and ready to apply correctly the moment KejaApp is incorporated, rather than being worked out for the first time under pressure later.

## 2. The statutory default: indemnifying a director against the company itself is void

Section 194 of the Companies Act, 2015 sets the default position, and it is a strict one:

- **Section 194(2)**: any provision that "purports to exempt a director of a company, to any extent, from any liability that would otherwise attach to the director in connection with any negligence, default, breach of duty or breach of trust in relation to the company" is **void**.
- **Section 194(3)**: any provision by which a company indemnifies a director "(directly or indirectly)… against a liability attaching to the director in connection with any negligence, default, breach of duty or breach of trust in relation to the company concerned" is likewise **void, except as permitted under this Act**.

In plain terms: a company cannot, by its constitution or by any side agreement, let a director off the hook for wronging the company itself, or promise to cover that liability for them. This is a mandatory rule of Kenyan company law, not something KejaApp (once incorporated) could contract around by choice.

## 3. What is actually permitted: third-party indemnity, insurance, and their limits

The Act carves out two things Section 194 does not prevent:

- **Section 195 — insurance is not prevented.** A company may purchase and maintain insurance for a director (or a director of an associated company) against any liability specified in section 194(3). KejaApp holds no director's & officers' (D&O) insurance today — a genuine gap given there is no incorporated entity or director yet, tracked here rather than left silent, to be addressed as part of incorporation rather than assumed to already exist.
- **Section 196 — a "qualifying third party indemnity provision" is not void.** This is an indemnity against liability the director incurs **to someone other than the company or an associated company** — a third party, such as a user or another business KejaApp deals with. Once incorporated, KejaApp could lawfully indemnify a director against, for example, a personal claim by an outside party arising from something done in good faith in the course of their duties.

That third-party indemnity is itself limited. Under **section 196(3)**, it is void to the extent it purports to cover:

- a fine imposed on the director in **criminal proceedings**;
- an amount payable to a regulatory authority as a **penalty for non-compliance** with a regulatory requirement;
- the director's costs in **defending criminal proceedings in which they are convicted**; or
- the director's costs in **defending civil proceedings brought by the company itself** (or an associated company), where judgment is given against the director.

So a lawful director indemnity, once one exists, protects a director who is sued by an outsider for something done honestly in the role — it is not a way to insulate a director from the consequences of their own crime, regulatory penalty, or a case the company itself brings and wins.

## 4. Disclosure, once this applies

If KejaApp ever does grant a qualifying indemnity provision to a director, **sections 197 and 198** require it to be disclosed, not kept private: the directors' report for the relevant financial year must state that the provision has (or had) effect, and a copy of the provision must be available for a member to inspect. This isn't optional paperwork — it's the statutory quid pro quo for the indemnity being lawful in the first place.

## 5. Relationship to formal legal advice

This policy is KejaApp's honest, forward-looking reading of the Companies Act, 2015's director-indemnification framework — written before it has a live audience, so it's understood correctly once it does. It is **not** legal advice, and has not been reviewed by a lawyer licensed in Kenya. Before KejaApp is incorporated and before any indemnity provision for a director or officer is actually adopted, that step should go through qualified Kenyan legal counsel — this document is preparation for that conversation, not a substitute for it.

## 6. Ownership and review

Maintained in `docs/compliance/director-officer-indemnification-policy.md`. Revisit this document — and actually adopt an operative version of it — as part of KejaApp's incorporation process, whenever that happens; reviewed at least annually until then in case the Companies Act's provisions change.
