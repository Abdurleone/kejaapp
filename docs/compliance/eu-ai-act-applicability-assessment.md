# EU Artificial Intelligence Act — Applicability Assessment

## 1. Purpose

The EU Artificial Intelligence Act (Regulation (EU) 2024/1689) is a risk-based regulatory framework for "AI systems," with obligations scaled to risk tier (unacceptable/banned, high-risk, limited-risk transparency duties, minimal-risk). This document is a self-assessment of whether it applies to JakezApp today, done as a point-in-time review rather than a legal opinion, in the same honest-self-disclosure spirit as the other documents in this folder.

## 2. Does JakezApp operate an "AI system"?

The Act defines an AI system in Article 3(1) as a machine-based system that, for explicit or implicit objectives, **infers from the input it receives how to generate outputs** such as predictions, content, recommendations, or decisions — and Recital 12 explicitly excludes "simpler traditional software systems" whose behavior follows **rules defined solely by natural persons** to automatically execute operations, i.e. no inference or learning involved.

A review of JakezApp's algorithmic components against that line:

| Component | What it does | Inference/learning involved? |
|---|---|---|
| Property duplicate-image detection (`backend/services/fileStorageService.js`'s `createBytePerceptualHash`) | Splits image bytes into 64 fixed buckets, averages each, thresholds against the global average to produce a hash; compared for exact/near matches | No — fixed arithmetic, no model, no training data |
| Saved-search property matching (`backend/services/savedSearchMatchingService.js`) | Runs each saved search's explicit filter criteria (county, price range, radius, etc.) as a MongoDB query against a new listing | No — deterministic query evaluation of user-authored filters |
| Account-lockout / timing-safe login (`backend/controllers/authController.js`, `backend/utils/passwords.js`) | Fixed-threshold counters and a constant-time dummy-hash comparison | No — fixed rules |
| Automatic account ban on violations (`backend/services/accountModerationService.js`) | Bans once an admin-adjudicated violation count crosses a hardcoded threshold (4) | No — a simple counter, and every violation behind it is entered by a human admin, not an automated classifier |

No component anywhere in the codebase infers, predicts, or learns from data — every user-facing "smart" behavior is explicit, human-authored, deterministic logic. This was already confirmed by a repo-wide grep for AI/LLM SDK usage during an earlier security pass (`openai|anthropic|gpt-|claude-|llm|@anthropic-ai`, zero matches) — there is no model of any kind, trained or pretrained, anywhere in JakezApp.

**Conclusion: JakezApp does not currently operate an AI system as defined by Article 3(1), so the Act's obligations (for any risk tier) do not apply.**

## 3. Territorial scope (secondary point)

Even setting aside §2, the Act's territorial scope (Article 2) reaches providers/deployers placing an AI system on the EU market, or a third-country provider/deployer whose AI system's *output* is used in the EU. JakezApp is a Kenya-market discovery platform — its data-protection basis is Kenya's Data Protection Act 2019 (see [Data Protection Policy](data-protection-policy.md)), and no EU deployment, EU user base, or EU-directed output currently exists. This is a secondary, less load-bearing point than §2 — it would stop mattering the moment JakezApp acquired real EU users, whereas §2 is a structural fact about the codebase.

## 4. What would change this assessment

This finding should be revisited, not assumed to still hold, if JakezApp ever adds:

- Any ML-based or generative feature — a chatbot, AI-written listing descriptions, automated content moderation via a trained classifier, or any third-party AI API integration.
- **Automated tenant screening or scoring** in particular deserves its own flag: the Act's Annex III high-risk category for "access to essential private services" already covers automated creditworthiness/credit-scoring systems, and an algorithmic tenant-scoring or approval feature would plausibly be evaluated the same way if JakezApp ever moved beyond today's human-mediated landlord/tenant coordination model. This is the single most likely path to a future high-risk classification, given the app's domain.
- An EU user base or EU-directed marketing, which would reopen §3 regardless of §2.

## 5. Scope and limitations

This is a self-assessment against the Act's plain text, not a legal opinion — JakezApp has not engaged outside counsel on this question. It should be re-reviewed whenever an AI/ML-adjacent feature is proposed, and treated as a gating question at that point (assess before building, not after).
