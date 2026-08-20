# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

KejaApp also ships an equally primary Expo/React Native mobile app (`mobile/`) for iOS and Android. It is not "adaptive" in the native-per-OS-design-language sense — both platforms share one consistent in-app theme (`ThemeContext`, light/dark) rather than deferring to iOS HIG or Material per OS. Treat web and mobile as co-primary surfaces of one product, not a primary/secondary pair, when scoping design work.

## Users

**Primary: tenants** — people searching for a rental in Kenya (Nairobi-centric, expanding to other counties), doing the job of discovering verified listings, comparing price/amenities/location, contacting the owner, and tracking a viewing through to move-in. Confirmed as the priority audience when a surface can't equally serve every role.

Other confirmed, first-class audiences (each with their own dashboard, not an afterthought of the tenant experience):
- **Landlords/agencies** — the supply side; list properties, respond to inquiries, manage viewing requests, submit agency verification.
- **Movers** — relocation/transport service providers; a full self-registering role (not a directory of unverified contacts), receive and act on service requests.
- **Admins** — moderate user accounts and agency/mover verification only; explicitly excluded from all listing-management actions (they moderate people, not listings).

## Product Purpose

KejaApp is a location-first rental discovery and move-coordination platform: property discovery, verification workflows, transparent pricing, notifications, and move coordination in one product. Success is a tenant finding and securing a verified rental with minimal friction and low fraud risk, a landlord/agency getting qualified inquiries instead of noise, and a mover getting real service requests instead of cold outreach.

## Positioning

KejaApp is explicitly **not a party to any tenancy or payment** — it does not own, manage, or lease listed property, and does not process, hold, or mediate rent, deposits, agency fees, or mover charges (those are settled directly between users; see the Terms of Service's Payment Boundary). The mechanism a copycat listing site couldn't truthfully replicate without doing the same work: agency/mover business-verification review, property-image fingerprinting to catch duplicate/fraudulent listings across accounts, and strict role-scoped access — all layered on top of staying out of the money and legal relationship entirely.

## Operating Context

- Backend: Express/MongoDB API. Web: React 19 + Vite, manual routing (no react-router). Mobile: Expo/React Native, React Navigation.
- Core workflows: search/filter (rent range, location, type, radius), save favorites, per-property inquiries (tenant → owner), viewing requests (scheduled or auto-approved "open" type), post-viewing reviews, saved searches with match notifications on new listings, agency/mover verification submitted by the business and approved/rejected by admins.
- Automation: scheduled jobs for stale-inquiry/viewing-request nudges, upcoming-viewing reminders, post-viewing review prompts, and stale-listing nudges; push notifications via Expo (mobile) and Web Push (browser).
- Market: Kenya — county/town-based location model, KES pricing, currently English-language UI with growing Swahili/Sheng usage in casual and marketing copy (not a full i18n system; no locale-switching mechanism exists).

## Capabilities and Constraints

- Role-based access (tenant/landlord/agency/mover/admin) enforced on both frontend and backend, including ownership scoping (a landlord only manages their own listings).
- No on-platform payment processing, by design — not a missing feature, a firm product boundary.
- A "Verified" badge (agency or mover) is a business-identity trust signal from admin document review — not a guarantee, endorsement, or warranty of listing accuracy or service quality.
- Automatic account ban after repeated (4th) detected duplicate-listing-image violations.
- No full internationalization system exists — English is the functional UI language; Swahili/Sheng appears as flavor in copy, not a translated locale.

## Brand Commitments

- Product name **KejaApp** — "keja" is Sheng/Swahili slang for house/pad, a deliberate, confirmed naming choice, not an accident to smooth over.
- One existing committed visual asset: a circular badge-style logo (`mobile/assets/keja-logo.png`, mirrored at `frontend/assets/keja-logo.png`) — a red-splatter background, bold black hand-lettered "KEJA APP" wordmark, and a crown icon. This is the only locked visual-identity asset today; palette, typography, and the rest of the visual world are open and under active exploration elsewhere (not recorded here — see DESIGN.md once a direction is confirmed).

## Evidence on Hand

- Real testimonials are sourced from an actual moderated feedback system (tenants/landlords/agencies/movers submit feedback; only an admin response publishes it as a public testimonial) — future design work should pull real published testimonials or use clearly-labeled placeholder copy, never invented named quotes presented as real.
- Real seed/demo data exists (`backend/seeders/seedDemoData.js`) covering 9 Kenyan counties and 11 available properties, with matching mover coverage.
- No curated brand photography exists beyond the logo — property images are user-submitted listing photos, not art-directed brand imagery. Any hero/marketing imagery today is illustrated/stylized, not photographic, and should stay labeled as such rather than presented as real property photography.

## Product Principles

1. Discovery and coordination layer, never a party to tenancy or payment — every feature decision respects this boundary rather than quietly eroding it.
2. Trust is earned through verification (agency/mover business review) and fraud detection (duplicate-image fingerprinting), not by obscuring roles from each other.
3. Role-scoped by design: each role sees only what's relevant to its job — landlords never see admin tools, movers are excluded from the general listing directory, admins never edit listings.
4. Kenya-market-first, not a localized afterthought of a global template — county/town location model, KES pricing, and a Kenya-flag-derived visual identity already in place.
5. Tenant experience is the tiebreaker when a surface genuinely can't serve every role equally well, though landlord/agency/mover workflows are still first-class, not stripped-down.

## Accessibility & Inclusion

WCAG 2.1 AA is the stated target (`docs/accessibility-statement.md`), honestly tracked as partial, not certified. Implemented: 44px+ touch targets, reduced-motion support, a keyboard-accessible admin table, the auth modal's dialog semantics/focus trap, the main nav's ARIA tablist pattern, and alt text on images. Not yet a full audit against the standard.
