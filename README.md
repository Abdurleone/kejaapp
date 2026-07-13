# KejaApp

KejaApp is a location-first rental platform for tenants, landlords, agencies, admins, and mover providers. The goal is to make rental discovery more transparent by combining property listings, trusted agency verification, clear pricing, reviews, notifications, and relocation services.

## Current Status

The backend API and first web frontend are under active MVP development. 
The backend currently includes:-
 - Authentication
 - Account management
 - Property management
 - Property image management
 - Saved properties
 - Transparent pricing
 - Property inquiries
 - Viewing requests
 - Reviews
 - Agency verification
 - Admin moderation
 - Notifications
 - Movers (accounts, verification, owner affiliates, and tenant service requests)
 - Seed data
 - Tests
 - Insomnia collection for manual API testing.

A static adaptive web app is available in `frontend/`. A React Native (Expo) mobile app MVP for iOS and Android is available in `mobile/`.

## Core Features

- Map-based and location-first property discovery.
- Account profile and password management.
- Property listings for landlords and agencies.
- Property image galleries.
- Saved properties for tenants.
- Advanced property search and filters.
- Radius-based nearby property search.
- Transparent rent, deposit, and agency fee calculations.
- Property inquiries between tenants and property owners.
- Viewing request flow between tenants and property owners.
- One-tap contact actions on a property's contact details — call, email, or WhatsApp the landlord/agency directly using their preferred method, on both web and mobile.
- Full property detail views (pricing, contact info, amenities) require signing in as a tenant; anonymous visitors and other roles can still browse and filter the Discover list, but are prompted to sign in before opening a listing.
- Reviews and rating aggregation.
- Agency verification workflow.
- Admin approval and rejection of agency verifications.
- A real notification inbox (web and mobile), plus proactive/scheduled nudges: stale inquiry/viewing-request reminders, upcoming-viewing reminders, post-viewing review prompts, and stale-listing nudges — delivered in-app and as mobile push notifications.
- Saved location + radius searches for tenants, with an alert when a new listing matches one.
- Movers are full accounts (a `mover` role, self-registered like tenant/landlord/agency), going through the same admin verification workflow as agencies. Landlords/agencies can mark specific movers as trusted affiliates; on a property page, tenants see the owner's affiliated movers plus general movers within a configurable radius of that property, and can send a service request directly to a mover, who sees it as a received request they can accept, decline, or complete.
- A "Verified agency" badge shown to tenants wherever a listing's owner is displayed (Discover cards, property detail), driven by the same admin-approval decision that already exists for agency verification — unverified agencies and all landlords keep listing normally, the badge just doesn't appear until approved.
- Platform feedback from tenants, landlords, agencies, and movers, with admin responses published as public testimonials on the landing page.
- Sign in with either your email or a username you choose at registration, for users who'd rather not type their email at login.

## Tech Stack

Frontend:
- Static web MVP
- Adaptive responsive UI for desktop, tablet, and phone screens
- Kenyan flag color palette (single, fixed theme) with a light/dark mode radio toggle in the header, present on every page including the landing page

Mobile:
- React Native (Expo), targeting iOS and Android from one codebase
- Light/dark mode toggle (icon-only, top-right of every screen), matching the web app's toggle and persisted locally
- See `mobile/README.md` for setup, running via Expo Go, and EAS build instructions

Backend:
- Node.js
- Express
- MongoDB Atlas
- Mongoose

Development and testing:
- Nodemon
- Node test runner (backend, frontend)
- Jest + React Native Testing Library (mobile)
- ESLint (backend, frontend, mobile — each with its own flat config)
- Insomnia

DevOps:
- GitHub Actions CI (lint + tests for backend/frontend/mobile, frontend build, Docker build, image publish to GHCR on `main`) — `.github/workflows/ci.yml`
- Dependabot for weekly dependency updates across all three `package.json`s and GitHub Actions — `.github/dependabot.yml`
- Docker + docker-compose for a local/staging stack (backend, frontend, MongoDB, Redis)
- Two independent deployment paths, both using S3-compatible object storage for uploads — see `docs/devops.md`:
  - Render Blueprint (`render.yaml`): backend web service (Docker), frontend static site, managed Redis.
  - Kubernetes manifests (`k8s/`): backend + frontend Deployments (HPA on the backend), in-cluster Redis StatefulSet, Ingress — cluster-agnostic, images published by CI to GHCR.

## Implemented Backend

Application foundation:
- Express app split into `backend/app.js` and `backend/server.js`.
- Centralized environment loading and validation in `backend/config/env.js`.
- MongoDB Atlas connection helper with retry support and local degraded startup support in `backend/config/db.js`.
- Health endpoint with database status and configured database path.
- Load-balancer liveness and readiness endpoints.
- CORS, Helmet, Morgan logging, centralized async handling, and error middleware.
- Daily-rotated log files in `backend/logs/` (`access-YYYY-MM-DD.log` for HTTP requests, `app-YYYY-MM-DD.log` for connection/cache/rate-limit warnings and 5xx errors with stack traces), in addition to console output. Disabled during tests. Configurable via `LOG_DIR`. Timestamps (and the daily file rollover boundary) are in Nairobi time (`Africa/Nairobi`, a stable UTC+3 with no daylight saving), not UTC.
- Nodemon watch configuration for backend auto-refresh.
- Configurable API and auth rate limiting, backed by Redis when `REDIS_URL` is set (falls back to per-process in-memory limits otherwise).
- Response caching for public property and mover listings, with immediate invalidation on writes; long-lived immutable `Cache-Control` headers on uploaded property images.
- OpenAPI JSON exposed for API tooling.
- Protected role-aware dashboard summary endpoint.
- Admin user account status moderation for active, suspended, and banned accounts.
- Admin user account status history for moderation audit trails.
- User notifications when account status changes.

Authentication and authorization:
- User registration and login.
- Login accepts either the account's email or its username; registration always requires a real email plus a free-text username the user chooses (no character restrictions, just non-blank after trimming).
- If the requested username is already taken, registration is rejected with a `409` and up to 3 available alternatives (the requested name plus different random number suffixes, e.g. `johnkamau284`) for the user to pick from instead. Immutable after registration in v1 — no user-facing "change username" flow yet. A one-off `backend/seeders/backfillUsernames.js` script assigns an opaque, auto-generated username (e.g. `swiftcheetah284`) to accounts created before this feature existed, since there's no one to ask.
- JWT generation and validation.
- Refresh-token session records with hashed tokens at rest.
- Bearer token support for API clients.
- HTTP-only auth cookie support.
- Logout endpoint that clears the auth cookie.
- Current-user lookup and profile update endpoints.
- Password change endpoint with current-password verification.
- Password hashing and comparison utilities.
- Role-based authorization for tenant/user, landlord, agency, and admin workflows.

Properties and pricing:
- Property model with owner, location, price, amenities, images, listing contact details, lifecycle status, availability, and rating summary fields.
- Anonymous property listing search with protected contact actions and property detail endpoints.
- Protected owner property management list across lifecycle statuses.
- Protected property create, update, and delete endpoints for landlords, agencies, and admins.
- Property lifecycle statuses for `draft`, `available`, `taken`, and `archived` listings.
- Rent, deposit, and agency fee fields.
- Cost summary enrichment on property responses.
- Protected image URL and alt text management for property galleries.
- Protected property image upload storage with file metadata, backed by local disk or an S3-compatible bucket (`STORAGE_DRIVER`).
- Property image fingerprinting for duplicate image detection.
- Admin violation review for suspicious duplicate property images.
- Listing-specific contact method, contact hours, and contact notes for landlords and agencies.
- Public read-only cost calculator endpoint.
- Filters for rent range, location text, listing type, viewing type, availability, text search, and radius search.
- GeoJSON coordinate support using `[longitude, latitude]` order.

Saved properties:
- Favorite model linked to users and properties.
- Protected endpoint for users to save properties.
- Protected endpoint for users to list saved properties.
- Protected endpoint for users to remove saved properties.
- Duplicate saved properties are blocked.
- Saved property responses include populated property details and cost summaries.

Property inquiries:
- Inquiry model linked to a property, sender, and property owner.
- Protected endpoint for users to send inquiries about properties.
- Protected endpoint for users to list their own inquiries.
- Protected property-level endpoint for landlords, agencies, and admins to view incoming inquiries.
- Response workflow for open, responded, and closed inquiries.
- Notification triggers when inquiries are created or responded to.

Viewing requests:
- Property viewing type support for `scheduled` and `open` viewings.
- Viewing request model linked to a property, requester, and property owner.
- Protected endpoint for tenants/users to request a property viewing.
- Protected endpoint for users to list their own viewing requests.
- Protected property-level endpoint for landlords, agencies, and admins to view incoming requests.
- Status workflow for pending, approved, rejected, cancelled, and completed requests.
- Scheduled viewing requests require a future requested date.
- Open viewing requests can be created without a requested date and are approved automatically.
- Notification triggers when a viewing is requested or its status changes.

Reviews and ratings:
- Review model linked to users and properties.
- Protected review creation.
- Public property review listing.
- Rating aggregation on property records.
- Guardrail preventing owners from reviewing their own listings.
- Owner review inbox for landlords and agencies to see ratings across their listings.
- Owner response endpoint for landlords and agencies; reviews and ratings are not deletable by tenants, owners, or admins.
- Admin read-only review listing for moderation visibility.
- Review notifications for property owners.

Agency verification and admin moderation:
- Agency verification submission.
- Verification status lookup.
- Admin verification list endpoint.
- Admin approve and reject endpoints.
- Rejection reason support.
- Notification triggers for approval and rejection decisions.

Notifications:
- Notification model and service layer, funneling every notification (direct-event and scheduled) through one `createNotification` chokepoint.
- Protected notification listing, with an `unread=true` filter.
- Mark notification as read endpoint.
- Event-triggered notifications for inquiries, reviews, viewings, agency verification decisions, feedback responses, and saved-search matches.
- Scheduled sweeps (`backend/jobs/`, run via `npm run jobs` or the `k8s/backend-cronjob.yaml` CronJob every 15 minutes) for: nudging owners about inquiries/viewing requests unanswered for 48+ hours, reminding both sides of a viewing happening within 24 hours, prompting a review once a viewing's date has passed (and marking it `completed`), and nudging owners about listings live 14+ days with zero inquiries. Each sweep is idempotent (marks what it's already acted on) and safe to run from multiple/overlapping invocations.
- Device token registration (`DeviceToken` model, upsert/delete endpoints) and best-effort push delivery via Expo's push service (`expo-server-sdk`) for every notification above, for any user with a registered mobile device.

Saved searches:
- SavedSearch model (location + radius + optional price/type/bedroom/county/town filters) linked to the user who saved it.
- Protected create, list-mine, and delete endpoints.
- New-listing matching reuses the same filter-building logic (`backend/utils/propertyFilters.js`) the property list endpoint already used for its own radius/filter query, evaluated against every saved search whenever a property is published.

Trust and safety:
- Property image fingerprint records for uploaded listing images.
- Duplicate property image violation records when different owners reuse the same listing image.
- Admin violation listing and review status updates.
- Automatic user bans on the fourth active violation.

Platform feedback:
- Feedback model linked to the submitting user, with a `pending`/`responded` status and an embedded admin response (message, responder, timestamp).
- Protected endpoint for tenants, landlords, agencies, and movers to submit feedback (admins cannot submit — they only respond).
- Protected endpoint for users to list their own submitted feedback.
- Admin-only endpoints to list all feedback and respond to a pending item.
- Responding marks the feedback `responded` and publishes it immediately — no separate publish/unpublish step.
- Public, unauthenticated, cached endpoint listing only responded/published feedback, consumed by the landing page as testimonials.
- Notification triggered for the submitter when an admin responds.
- Pending feedback count surfaced in the admin dashboard summary, alongside the existing agency-verification and violation counts.

Movers:
- `mover` is a full user role (self-registers like tenant/landlord/agency); a `Mover` business-directory document links to that account via `Mover.user`, plus a GeoJSON `location.coordinates` (2dsphere-indexed, mirroring `Property`) for proximity search.
- `MoverVerification` model and admin approve/reject endpoints, an exact structural mirror of the existing agency verification workflow — approval/rejection also syncs the denormalized `Mover.verified` flag so the existing public listing/filter/sort logic needed no changes.
- Mover profile self-service: signed-in movers upsert their own business listing (name, phone, service types, location, base price, availability) via `GET/POST /api/movers/profile`.
- Affiliate management: landlords/agencies can add or remove a mover as a trusted affiliate (`Mover.affiliatedOwners`) via `PUT/DELETE /api/movers/:id/affiliate`.
- `GET /api/properties/:id/movers` — a composite endpoint returning the property owner's affiliated movers plus verified movers within a radius of the property's coordinates (deduplicated, reusing the same `$geoWithin`/`$centerSphere` proximity logic as property search), driving the "movers for this move" section on a property page.
- `MoverRequest` model and workflow (modeled on `Inquiry`): a tenant requests a specific mover (optionally scoped to a property), the mover receives it and can accept/decline/complete, the tenant can cancel; notifications fire on creation and on every status change.
- Public mover listing/detail endpoints (`GET /api/movers`, `GET /api/movers/:id`) with filters for service type, county, rating, base price, and proximity (`lat`/`lng`/`radiusKm`).
- A `verified` flag added to `User` itself (distinct from `Mover.verified`), synced by the existing agency-verification approve/reject endpoints, backing the public "Verified agency" badge shown on listings.
- Demo mover seed data: 6 movers, each with a real login account, realistic coordinates, and verification records across all three statuses (approved/pending/rejected), plus affiliate relationships with seeded landlord/agency accounts.

Developer workflow:
- Insomnia collection at `docs/kejaapp-insomnia.json`.
- Scaling and load-balancing notes at `docs/scaling-load-balancing.md`.
- Demo seed script at `backend/seeders/seedDemoData.js`.
- Root package scripts for backend, frontend, seeding, and tests.
- Test coverage for app routes, validators, middleware, models, services, password hashing, cookies, admin workflows, frontend utilities, and responsive CSS guardrails.
- Opt-in MongoDB integration testing with `TEST_MONGODB_URI`.

## Implemented Frontend

The web frontend in `frontend/` is a React 19 + Vite single-page app (SPA) with manual routing and real backend API integration.

Frontend architecture:
- React components in `src/pages/` (LandingPage, DashboardPage, DiscoverPage, SavedPage, WorkspacePage, PropertyEditPage, PropertyCreatePage, AdminPage, NotificationsPage, FeedbackPage, MoversPage), with the create/edit form fields factored into a shared `src/components/PropertyForm.jsx`.
- Manual `window.history.pushState` routing without react-router.
- Page-based layout with tabbed navigation for role-aware view access.
- Global `app-utils.js` for API helpers, formatting, and view logic.
- Light/dark mode toggle that persists locally.

Authentication and session:
- Sign-in/sign-up modal overlay in the header with login and register tabs.
- Role selection (tenant, landlord, agency, mover) during registration.
- Backend JWT bearer token stored in localStorage and sent with all API requests.
- Backend cookie-based refresh tokens for session management.
- Sign-out clears token and redirects to discover page.
- Current user fetched on app initialization and after login.
- Protected routes check user role and display access-denied messages for unauthorized views.

Frontend API helpers in `app-utils.js`:
- `fetchDashboardSummary()` → `GET /api/dashboard/summary`
- `fetchProperties({ page, limit, ...filters })` → `GET /api/properties`
- `fetchPropertyById(propertyId)` → `GET /api/properties/:id`
- `fetchCurrentUser()` → `GET /api/auth/me`
- `fetchFavorites()` → `GET /api/favorites`
- `saveFavorite(propertyId)` → `POST /api/favorites/:propertyId`
- `removeFavorite(propertyId)` → `DELETE /api/favorites/:propertyId`
- `createInquiry({ property, subject, message, contactPreference })` → `POST /api/inquiries`
- `createViewingRequest({ property, requestedDate, message })` → `POST /api/viewings`
- `fetchMyProperties({ page, limit, status })` → `GET /api/properties/mine` (landlord/agency/admin only)
- `createProperty(payload)` → `POST /api/properties` (landlord/agency/admin only)
- `updateProperty(propertyId, payload)` → `PUT /api/properties/:id` (landlord/agency/admin only, and only for listings they own)
- `fetchReceivedInquiries({ status })` → `GET /api/inquiries/received` (landlord/agency/admin only)
- `loginUser({ identifier, password })` → `POST /api/auth/login` (`identifier` accepts either the account's email or its username)
- `registerUser({ name, email, password, phone, role })` → `POST /api/auth/register`
- `logoutUser()` → `POST /api/auth/logout`
- `createFeedback({ message })` → `POST /api/feedback` (tenant/landlord/agency only)
- `fetchMyFeedback()` → `GET /api/feedback/mine`
- `fetchPublicTestimonials()` → `GET /api/feedback/public` (no auth required — used on the landing page)
- `fetchAdminFeedback(query)` → `GET /api/admin/feedback` (admin only)
- `respondToFeedback(feedbackId, { message })` → `PUT /api/admin/feedback/:id/respond` (admin only)
- `fetchNotifications(query)` → `GET /api/notifications` (`unread: "true"` to filter)
- `markNotificationAsRead(notificationId)` → `PUT /api/notifications/:id/read`
- `createSavedSearch(payload)` → `POST /api/saved-searches`
- `fetchSavedSearches()` → `GET /api/saved-searches`
- `deleteSavedSearch(savedSearchId)` → `DELETE /api/saved-searches/:id`
- `fetchMovers(filters)` → `GET /api/movers`
- `fetchMoverById(moverId)` → `GET /api/movers/:id`
- `fetchPropertyMovers(propertyId, query)` → `GET /api/properties/:id/movers`
- `submitMoverProfile(payload)` → `POST /api/movers/profile` (mover only)
- `fetchMoverProfileStatus()` → `GET /api/movers/profile` (mover only)
- `affiliateMover(moverId)` / `unaffiliateMover(moverId)` → `PUT`/`DELETE /api/movers/:id/affiliate` (landlord/agency only)
- `createMoverRequest({ mover, property, message, preferredDate })` → `POST /api/mover-requests` (tenant only)
- `fetchMyMoverRequests()` / `fetchReceivedMoverRequests()` → `GET /api/mover-requests` (tenant) / `GET /api/mover-requests/received` (mover)
- `updateMoverRequestStatus(moverRequestId, { status, response })` → `PUT /api/mover-requests/:id/status`
- All requests include Authorization bearer token if signed in.
- `fetchProperties`, `fetchPropertyById`, `fetchFavorites`, `fetchMyProperties`, `fetchReceivedInquiries`, `fetchMyFeedback`, `fetchAdminFeedback`, `fetchNotifications`, `fetchSavedSearches`, `fetchMovers`, `fetchPropertyMovers`, `fetchMoverProfileStatus`, `fetchMyMoverRequests`, and `fetchReceivedMoverRequests` are cached in-memory for 15 seconds to avoid redundant refetches on remount (`fetchPublicTestimonials` for 60 seconds); the favorites cache clears on save/remove, the property/my-properties caches clear on `updateProperty`, the feedback caches clear on `createFeedback`/`respondToFeedback`, the notifications cache clears on `markNotificationAsRead`, the saved-searches cache clears on `createSavedSearch`/`deleteSavedSearch`, the movers/property-movers caches clear on `affiliateMover`/`unaffiliateMover`, the mover-profile cache clears on `submitMoverProfile`, the mover-request caches clear on `createMoverRequest`/`updateMoverRequestStatus`, and the whole cache clears on login, logout, register, and account deletion.

Included flows:
- Brand-gradient landing hero (built from the app's own theme colors, not a stock photo) with a visible header (logo, mode toggle, sign in) and a single call-to-action, plus anonymous listing search before authentication.
- Testimonials section on the landing page, populated from admin-responded platform feedback (`GET /api/feedback/public`) — hidden entirely when there are none yet, so it never shows an empty/error state to signed-out visitors.
- Role-aware Dashboard (`/dashboard`) — the default landing view for every signed-in role right after sign-in, showing unread notifications for everyone plus role-specific sections (tenant activity; owner listings for landlord/agency; agency verification status; mover verification status and received-request counts; admin platform-moderation counts, now including mover verifications). Admins do not get an owner listings section, since admins manage users, not listings. Backed by `GET /api/dashboard/summary`.
- Anonymous property discovery with radius search and gated save actions.
- Property detail page (`/property/:id`) reached via "Details" from Discover or Saved — full description, cost summary, contact info, amenities, a "Movers for this move" section (the owner's affiliated movers plus verified movers nearby, each with an inline "Request service" form), and inline forms to send an inquiry or request a viewing (matching the mobile app's flow). Also shows the listing owner's name and, for agencies, a "Verified agency" badge once approved.
- Discover property cards show the same "Verified agency" badge next to an agency-owned listing, once that agency's verification is approved.
- Movers tab (`/movers`) — for tenants/landlords/agencies/anonymous visitors, a filterable directory of mover businesses (service type, county, rating) with a "Request service" action per card (tenants) and an "Add/remove affiliate" action (landlords/agencies); for signed-in movers, their own profile-status panel (edit business details, see verification status) plus a list of received tenant requests with accept/decline/complete actions.
- Adaptive property cards, listing insights, skeleton loading states (shape-matching placeholders for Discover/Saved/Workspace/Dashboard/property detail, not spinners or "Loading..." text; respects `prefers-reduced-motion`), error states, and empty states.
- Login and registration with form validation.
- Role-aware navigation so tenants, owners, agencies, and admins only see the views they can access.
- Polished responsive web UI with a splash landing page, centered workspace, sticky header actions, richer listing cards, account deletion flow, and a light/dark mode toggle.
- Landing hero background is rendered from CSS theme tokens (a fixed Kenyan flag palette) instead of a fixed image.
- Saved property actions with favorite/unfavorite buttons.
- Saved properties list loading from real `/api/favorites` endpoint, with a Details link into the same property detail page as Discover.
- Owner workspace showing the signed-in landlord/agency's own listings and the real inquiries tenants have sent about them (scoped server-side by `owner`, not filtered client-side), with an Edit action on each listing card opening a full edit form (`/owner/properties/:id/edit`) backed by `PUT /api/properties/:id`, plus a "New listing" action (`/owner/properties/new`) backed by `POST /api/properties` for creating new properties. Tenants only ever get read access to listings (Discover/Saved/property detail) — creation and editing are gated behind `canManageListings` (landlord, agency). Admins cannot create, edit, or view the owner workspace at all — admins moderate accounts, not listings.
- Admin console (`/admin`) for managing user accounts: search and filter users by role, open a user's account summary (violations, and role-specific activity counts) and status change history, and change an account's status to active, suspended, or banned with a reason, backed by the existing `GET/PUT /api/admin/users*` endpoints.
- Feedback tab (`/feedback`), visible to every signed-in role: tenants/landlords/agencies get a submit form plus a list of their own past submissions and any admin response; admins instead see every submission and can respond inline, which immediately publishes it as a landing-page testimonial.
- Notifications tab (`/notifications`), visible to every signed-in role: lists all notifications with an "Unread only" filter and a mark-as-read action per item that persists across reloads.
- "Save this search" action next to Discover's radius/location controls (tenants only, shown once a location is set), plus a "Saved searches" panel on the Account page to review and remove them.
- Light and dark mode toggle that persists locally.

Frontend access model:
- Anonymous visitors can search available listings without leaving the search page.
- Tenants can search homes, save listings after signing in, and manage saved listings.
- Landlords and agencies can access the owner workspace placeholder.
- Admins can access the admin console to manage user accounts. Admins cannot access the owner workspace and have no listing creation, editing, or viewing capability anywhere in the app or API.
- Movers see their own profile/received-requests dashboard on the Movers tab instead of the directory everyone else sees there.
- Visitors must sign in or sign up before accessing saved listings or saving homes.
- Tenants do not see owner workspace navigation.
- Non-admin users do not see admin console navigation.

Responsive behavior:
- The landing page adapts from desktop split layout to a single-column phone layout; the light/dark mode toggle stays visible (wrapping alongside Sign in) at every width, on the landing page and every other page.
- Header actions, location radius controls, stat panels, and workspace tabs reflow across desktop, tablet, and phone widths.
- Property grids and listing actions use container-safe sizing so listings do not overflow narrow screens.
- Owner workspace and admin console panels adapt for smaller screens.
- Auth dialogs, form controls, and action buttons include narrow-screen overflow protection.

Backend connection:
- The web UI hides backend connection controls from regular users.
- The frontend uses `http://localhost:5000` as its local development API base URL by default.
- Developers can still override the API base URL through the existing `keja_base_url` localStorage key if needed.
- Browser requests include bearer tokens and cookies, so the app works with API tokens and HTTP-only auth cookies.
- In development, the backend accepts local frontend origins such as `http://localhost:5173` and fallback ports like `http://localhost:5174`.
- All API requests are made via `apiFetch()` helper which handles token injection and error responses.

Run the frontend:

```bash
npm run frontend
```

Or from inside `frontend/`:

```bash
npm run dev
```

Build the frontend for production:

```bash
cd frontend && npm run build
```

Run frontend tests:

```bash
npm run test:frontend
```

## Testing

### Frontend tests

Frontend tests cover:
- API helper utilities (apiFetch, token management, URL building)
- Frontend utilities (formatting, role checks, view routing, property filters)
- Page component integration (DiscoverPage, SavedPage, App auth flow)
- Responsive CSS guardrails
- **End-to-end auth flow**: register, login, save/remove favorites, error handling

Run frontend tests:

```bash
npm run test:frontend
```

### Backend tests

Backend tests cover:
- Route handlers and middleware, driven through the real Express app over real HTTP via [supertest](https://github.com/ladjs/supertest) (`tests/app.test.js`) — auth/validation guard-rail cases without a live database
- A real-database end-to-end API flow test (`tests/integration/apiFlows.integration.test.js`, opt-in via `TEST_MONGODB_URI`) — register/login, property CRUD, inquiries, viewing requests, reviews/ratings, and favorites, all through real HTTP requests against a real MongoDB
- Controllers (auth, properties, favorites, inquiries, viewing requests, reviews)
- Models and data validation
- Services (notifications, cost calculations, image fingerprints)
- Password hashing and token utilities
- Admin moderation workflows
- Agency verification workflows

Run backend tests:

```bash
npm run test:backend
```

### Mobile tests

Mobile tests (Jest + `jest-expo` + React Native Testing Library) cover:
- API client logic (query string building, auth token and base URL storage, `apiFetch` success/error paths)
- Formatting utilities (currency, rating summary, status labels)
- A shared component (`MessageView`) — rendering and interaction

Run mobile tests:

```bash
npm run test:mobile
```

### All tests

Run all backend, frontend, and mobile tests:

```bash
npm test
```

### Linting

Each package has its own ESLint flat config. Run all three, or one at a time:

```bash
npm run lint
npm run lint:backend
npm run lint:frontend
npm run lint:mobile
```

### Integration testing

For integration tests with a real MongoDB instance, set the `TEST_MONGODB_URI` environment variable (this also runs the real-database API flow test above; it's skipped otherwise):

```bash
TEST_MONGODB_URI="mongodb+srv://..." npm run test:backend
```

### Manual API testing

There's also an [Insomnia](https://insomnia.rest/) collection at `docs/kejaapp-insomnia.json` for exploratory/manual testing against a running backend — see [API Testing With Insomnia](#api-testing-with-insomnia) below.

## Authentication

The app implements complete JWT-based authentication with role-based access control.

**See [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) for detailed auth documentation including:**
- Frontend auth modal and form submission flow
- API helper functions (register, login, logout, fetchCurrentUser)
- Token management and bearer token injection
- Backend auth endpoints and role validation
- Protected routes and access guards
- Integration test examples
- Security considerations

**Quick Reference:**
- Register: Collect name, email, a free-text username, password, phone, and role (tenant/landlord/agency); if the username is taken, the API responds with a `409` and up to 3 available alternatives to choose from instead
- Login: Enter either your email or your assigned username, plus your password
- Protected API calls: Automatically inject `Authorization: Bearer <token>` header
- Role-based views: Navigation filters and page guards based on user role
- Logout: Clear token from localStorage and reset auth state

## User Stories


### Account Management

As a user, I want to manage my profile and password, so that my account information stays current and secure.

Acceptance criteria:
- Given I am logged in, when I update my name or phone number, then my profile is saved.
- Given I try to update protected fields like email or role through the profile endpoint, then those fields are ignored.
- Given I change my password with the correct current password, then the new password is saved securely.
- Given I change my password with the wrong current password, then the API rejects the request.

### Role-Aware Dashboard

As a signed-in user of any role, I want a dashboard summary tailored to what I actually do on KejaApp, so that I see relevant counts instead of a generic, one-size-fits-all view.

Acceptance criteria:
- Given I am signed in as any role, when I load my dashboard summary, then I see my unread notification count.
- Given I am signed in as a tenant, when I load my dashboard summary, then I additionally see my saved-properties count, my inquiries grouped by status (open, responded, closed), and my viewing requests grouped by status (pending, approved, rejected, cancelled, completed) — I do not see owner, agency, or admin data.
- Given I am signed in as a landlord or agency, when I load my dashboard summary, then I additionally see my own properties grouped by lifecycle status (draft, available, taken, archived), plus incoming inquiries and incoming viewing requests for my properties, each grouped by status.
- Given I am signed in as an agency, when I load my dashboard summary, then I additionally see my agency verification status and rejection reason (if rejected) — landlords and tenants never see agency verification data.
- Given I am signed in as an admin, when I load my dashboard summary, then I additionally see platform-wide agency verification counts by status and user violation counts by status — I do not see an owner listings section, since admins do not manage listings.

### Tenant Property Discovery

As a visitor or tenant, I want to browse and filter available rental properties by location, price, and property type, so that I can quickly find homes that match my needs and budget.

Acceptance criteria:
- Given I am on the property list, when I filter by rent, location, type, or availability, then I only see matching properties.
- Given I browse listings without a status filter, then I only see properties marked as available.
- Given I search near a latitude and longitude with a radius, then I only see properties with coordinates inside that area.
- Given I am signed in as a tenant, when I open a property, then I can view the title, description, location, images, amenities, owner or agency type, listing contact details, reviews, and pricing.
- Given I am not signed in, or signed in as a non-tenant role, when I try to open a property's full details, then I am prompted to sign in with a tenant account instead — the property list itself stays visible either way.
- Given a property has rent, deposit, or agency fees, when I view it, then I can see the total upfront cost and recurring monthly cost.
- Given I am signed in as a tenant, when I use the frontend, then I cannot access the owner listing creation tools.
- Given I am not signed in, when I try to save a listing, then the frontend prompts me to sign in or sign up.

### Property Lifecycle

As a landlord or agency, I want to mark a property as draft, available, taken, or archived, so that tenants only see listings that are actually open.

Acceptance criteria:
- Given I create a property without a status, then it defaults to available.
- Given I mark a property as taken, draft, or archived, then it is hidden from the default public property list.
- Given a property is not available, when a tenant requests a viewing, then the API rejects the viewing request.
- Given older clients send `isAvailable=false`, then the API maps that listing to taken for compatibility.

### Owner Property Management

As a landlord or agency, I want to view all my listings including draft, taken, and archived properties, so that I can manage my inventory without exposing inactive homes to tenants.

Acceptance criteria:
- Given I am authenticated as a landlord or agency, when I open my properties, then I can see my own listings across all statuses.
- Given I filter my properties by status, then I only see my own listings matching that lifecycle state.
- Given I am not authenticated, when I request my properties, then the API rejects the request.

### Admin User Management

As an admin, I want to search, review, and change the status of user accounts, so that I can moderate the platform's users without needing any access to listings.

Acceptance criteria:
- Given I am authenticated as an admin, when I list users, then I can search by name, email, or phone and filter by role.
- Given I am authenticated as an admin, when I open a user's account, then I can see their profile, violation counts, and role-specific activity counts (tenant, owner, or agency), and their full account status change history.
- Given I am authenticated as an admin, when I change a user's account status to active, suspended, or banned with a reason, then the account is updated, the change is logged for audit, and the user receives a notification.
- Given I am authenticated as an admin, when I try to change my own account status to suspended or banned, then the API rejects the request.
- Given I am not an admin, when I try to list users or change a user's account status, then the API rejects the request.
- Given I am authenticated as an admin, when I try to create, edit, delete, or view listings, or manage inquiries or viewing requests for any property, then the API rejects the request — admins have no listing-management capability anywhere in the API.

### Transparent Pricing

As a landlord or agency, I want to add rent, deposit, and agency fee values to my property listings, so that tenants can understand the full cost before contacting me.

Acceptance criteria:
- Given I am logged in as a landlord or agency, when I create or update a property, then I can save valid pricing fields.
- Given I am not authenticated, or I have a tenant or admin role, when I try to create or update property pricing, then the API rejects the request.
- Given I am any user, when I submit price values to the cost calculator, then I receive calculated first-month, upfront, and recurring monthly totals without creating or changing a property.

### Listing Contact Details

As a landlord or agency, I want to define the best contact method and available contact hours on each listing, so that tenants know how to reach me without KejaApp handling payments or private negotiations.

Acceptance criteria:
- Given I am authenticated as a landlord or agency, when I create or update a property, then I can add a preferred contact method, phone, email, WhatsApp number, contact hours, and notes.
- Given a tenant views a property, when contact details are present, then they can read those contact details but cannot edit them.
- Given contact details include a phone, email, or WhatsApp number, when a tenant taps one, then the app opens the device's dialer, mail client, or WhatsApp directly (a "Contact via {method}" shortcut is also shown for the owner's preferred method).
- Given I submit invalid contact details, when validation runs, then the API rejects unsupported contact methods and invalid emails.

### Property Image Management

As a landlord or agency, I want to add and remove images for my property listings, so that tenants can inspect the home before requesting a viewing.

Acceptance criteria:
- Given I am logged in as the property owner or agency owner, when I add a valid image URL and optional alt text, then the image appears on the property.
- Given I am not authorized to manage the property, when I try to add or remove an image, then the API rejects the request.
- Given I remove an existing image from my property, when the property is returned, then that image is no longer present.
- Given I add image alt text, when tenants view the property, then the alt text is available for accessibility and context.

### Saved Properties

As a tenant, I want to save properties I like, so that I can compare and revisit them later.

Acceptance criteria:
- Given I am logged in, when I save a property, then it appears in my saved properties list.
- Given I already saved a property, when I try to save it again, then the API rejects the duplicate.
- Given I remove a saved property, when I view my saved properties again, then it no longer appears.
- Given I list my saved properties, when the response loads, then each property includes its pricing and cost summary.

### Property Reviews

As a tenant, I want to review a property after interacting with it, so that future tenants can make more informed decisions.

Acceptance criteria:
- Given I am logged in, when I submit a valid rating and comment for a property I do not own, then the review is saved.
- Given a property has reviews, when I view the property reviews, then I can see the review list and aggregated rating.
- Given I am logged in as the landlord or agency that owns the reviewed property, when I respond to a review, then my response is attached to the review.
- Given I am a tenant, landlord, agency, or admin, when I view reviews, then I cannot delete a review or rating.
- Given I am logged in as an admin, when I open review moderation, then I can see reviews and ratings in read-only mode.
- Given a new review is created, when the property owner has an account, then they receive a notification.

### Property Inquiries

As a tenant, I want to send an inquiry about a property, so that I can ask questions before requesting a viewing or contacting the owner directly.

Acceptance criteria:
- Given I am logged in and the property exists, when I submit a message and optional contact preference, then an open inquiry is created.
- Given I own the property, when a tenant sends an inquiry, then I receive a notification.
- Given I am the property owner, when I respond to an inquiry, then the tenant receives a notification.
- Given I list my inquiries, when the response loads, then I only see inquiries I sent.
- Given I own a property, when I list property inquiries, then I only see inquiry records for that property.
- Given I am a landlord or agency, when I list received inquiries, then I see inquiries across all of my properties in one call, scoped server-side by owner. Admins cannot view or respond to inquiries for any property, since admins do not manage listings.

### Viewing Requests

As a tenant, I want to request a viewing for a property, so that I can arrange a visit before deciding whether to rent it.

Acceptance criteria:
- Given a landlord or agency creates a property, when they choose a viewing type, then the listing can be marked as `scheduled` or `open`.
- Given I am logged in and the property has scheduled viewing, when I submit a future requested date and optional message, then a pending viewing request is created.
- Given I am logged in and the property has open viewing, when I submit an optional message without a requested date, then an approved viewing request is created.
- Given I own the property, when a tenant requests a viewing, then I receive a notification.
- Given I already have a pending or approved request for the same property, when I request another viewing, then the API rejects the duplicate request.
- Given I am the property owner, when I approve, reject, cancel, or complete a viewing request, then the requester receives a notification. Admins cannot view or manage viewing requests for any property, since admins do not manage listings.

### Agency Verification

As an agency, I want to submit business verification details, so that tenants can trust that my listings are legitimate.

Acceptance criteria:
- Given I am logged in as an agency, when I submit valid verification details and documents, then my verification request is saved for admin review.
- Given I already have a pending or approved verification, when I submit again, then the API prevents duplicate active requests.
- Given an admin approves or rejects my request, when I check my verification status, then I can see the latest decision and reason if rejected.
- Given my verification is approved, when a tenant views one of my listings (Discover card or property detail), then they see a "Verified agency" badge next to my name. Given I'm not yet verified (or I'm a landlord, who doesn't go through this workflow), then no badge appears and my listings otherwise work exactly the same — verification is a trust signal, not a listing gate.

### Admin Moderation

As an admin, I want to review agency and mover verification requests, so that only trusted businesses are marked as verified.

Acceptance criteria:
- Given I am logged in as an admin, when I list agency or mover verification requests, then I can view pending, approved, and rejected requests for each.
- Given I approve a request, when the action succeeds, then the agency/mover is marked approved and receives a notification.
- Given I reject a request, when I provide a reason, then the agency/mover is marked rejected and receives the reason in a notification.

### Notifications

As a user, I want to receive notifications for important account and listing activity — both things that just happened and things I might otherwise miss — so that I do not miss updates that need my attention.

Acceptance criteria:
- Given I am logged in, when I request my notifications, then I only see notifications that belong to me, with a real inbox to browse them (web: a `Notifications` tab; mobile: a `Notifications` bottom tab), not just an unread count.
- Given I mark a notification as read, when the action succeeds, then it no longer appears as unread, and this persists across reloads/app restarts.
- Given I only want to see what's new, when I toggle "Unread only" (web) / the "Unread" filter (mobile), then read notifications are hidden.
- Given a relevant event happens directly (agency verification, a property review, an inquiry/viewing request/response, a feedback response), then a notification is created immediately.
- Given a landlord or agency hasn't responded to an inquiry or viewing request within 48 hours, when the scheduled sweep runs, then they get a one-time nudge (no repeat nudges for the same item).
- Given an approved viewing is happening within the next 24 hours, when the scheduled sweep runs, then both the tenant and the owner get a one-time reminder.
- Given an approved viewing's date has passed, when the scheduled sweep runs, then the viewing is marked `completed` and the tenant gets a one-time prompt to leave a review — unless they already reviewed that property, in which case the viewing is still marked completed but no prompt is sent.
- Given a listing has been available for 14+ days with zero inquiries, when the scheduled sweep runs, then its owner gets a one-time nudge to refresh photos or price.
- Given I've registered a mobile device and I'm signed in, when any of the above create a notification for me, then I also receive it as a push notification (best-effort — a failed push never blocks the underlying action, e.g. submitting an inquiry still succeeds even if my push token is stale).

### Saved Searches

As a tenant, I want to save a Discover search (location + radius today), so that I'm notified when a new listing matches it instead of having to keep re-checking manually.

Acceptance criteria:
- Given I've set a location and radius on Discover, when I save the search, then it appears in my saved searches (Account page on web, Account tab on mobile).
- Given I have a saved search, when a landlord/agency publishes a new listing matching it, then I get a notification (and a push notification, if I have a device registered).
- Given I no longer want a saved search, when I remove it, then it stops matching future listings.
- Given I am not signed in, when I try to save a search, then I'm prompted to sign in first.

### Mover Discovery

As a tenant, I want to browse mover and relocation services, so that I can plan my move after finding a home.

Acceptance criteria:
- Given I view movers, when I filter by service type, county, or rating, then I only see matching mover providers.
- Given movers are returned, when I inspect the list, then I can see provider details, service areas, rating, verification status, and base price.
- Given I open a property's detail page, when it has an owner-affiliated mover or verified movers within its proximity radius, then I see them grouped as "Recommended by the owner" and "Movers nearby" without duplicates between the two lists.

### Mover Accounts, Affiliates, and Service Requests

As a moving company, I want to create an account, get verified, and hear from tenants who need my services, so that I can run my business through the platform instead of just being listed in it.

Acceptance criteria:
- Given I register with the `mover` role, when I submit my business profile (name, phone, service types, location, base price), then it's saved to my account and immediately visible in the public mover directory, whether or not I'm verified yet.
- Given I submit verification details as a mover, when an admin reviews them, the workflow matches agency verification exactly: pending until reviewed, approved/rejected with a reason, and a notification either way. My listing keeps working the whole time — verification adds a badge, it doesn't gate my ability to operate.
- Given I am a landlord or agency, when I mark a mover as an affiliate (or remove one), then that mover shows up (or stops showing up) under "Recommended by the owner" on my properties' detail pages for every tenant who views them.
- Given I am a tenant, when I send a service request to a mover (optionally from a specific property page), then the mover receives it and I can see it pending.
- Given I am the mover who received a request, when I accept, decline, or complete it (optionally with a response message), then the tenant is notified of the new status. Given I am the tenant, I can also cancel my own pending request.
- Given I am a mover, when I check my Dashboard, then I see my verification status and a breakdown of received requests by status.

### Platform Feedback

As a tenant, landlord, agency, or mover, I want to tell KejaApp how the platform helped me, and have an admin respond, so that my experience can be shared as a testimonial for future users.

Acceptance criteria:
- Given I am a signed-in tenant, landlord, agency, or mover, when I submit feedback, then it is saved as pending and I can see it in my own feedback list.
- Given I am an admin, when I try to submit feedback, then the API rejects the request — admins only respond to feedback, they don't submit it.
- Given I am an admin, when I list all feedback, then I can see every submission regardless of who sent it.
- Given I am an admin, when I respond to a pending item, then it becomes `responded`, the submitter is notified, and it becomes publicly visible as a testimonial.
- Given feedback has not yet received an admin response, when I (or anyone signed out) view the public testimonials list, then it does not appear there.
- Given I am a signed-out visitor, when I load the landing page, then I see published testimonials, if any exist, with no sign-in required.

### Username Login

As a user who would rather not type my email at login, I want to choose my own username at registration, so that I can sign in without exposing my email on the login screen.

Acceptance criteria:
- Given I register a new account, when I choose a username that's available, then my account is created with that username, shown to me right away and visible afterward on my Account page.
- Given I choose a username that's already taken, then registration is rejected with a clear error and a few available alternatives I can pick from instead.
- Given I sign in with either my email or my chosen username plus my correct password, then I am logged in.
- Given I sign in with the correct identifier but the wrong password, then the API rejects the request with a generic invalid-credentials message that doesn't reveal which part was wrong.
- Given my account was created before this feature existed, then a one-off backfill assigns me an auto-generated username the next time it runs, without requiring me to do anything.

## API Reference

Base URL for local development:

```text
http://localhost:5000
```

Authentication supports both:

```text
Authorization: Bearer <token>
Cookie: keja_token=<token>
```

Health:

```text
GET    /
GET    /api/health
GET    /api/health/database
GET    /api/health/live
GET    /api/health/ready
GET    /api/docs/openapi.json
```

Dashboard:

```text
GET    /api/dashboard/summary
```

Auth:

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
PUT    /api/auth/me
PUT    /api/auth/password
```

Properties:

```text
GET    /api/properties
GET    /api/properties?lat=-1.2921&lng=36.782&radiusKm=5
GET    /api/properties/mine                                 landlord, agency
POST   /api/properties
GET    /api/properties/:id
PUT    /api/properties/:id
DELETE /api/properties/:id
POST   /api/properties/costs/calculate
POST   /api/properties/:id/images
POST   /api/properties/:id/images/upload
DELETE /api/properties/:id/images/:imageId
```

Favorites:

```text
GET    /api/favorites
POST   /api/favorites/:propertyId
DELETE /api/favorites/:propertyId
```

Reviews:

```text
POST   /api/reviews
GET    /api/reviews/mine                                  landlord, agency
PUT    /api/reviews/:id/response                          landlord, agency property owner only
GET    /api/properties/:id/reviews
```

Inquiries:

```text
GET    /api/inquiries                                        tenant (their own sent inquiries)
POST   /api/inquiries                                         tenant
PUT    /api/inquiries/:id
GET    /api/properties/:id/inquiries                          landlord, agency (per property)
GET    /api/inquiries/received                                landlord, agency (across all their properties)
```

Viewings:

```text
GET    /api/viewings
POST   /api/viewings
PUT    /api/viewings/:id/status
GET    /api/properties/:id/viewings
```

Notifications:

```text
GET    /api/notifications
PUT    /api/notifications/:id/read
```

Saved searches:

```text
POST   /api/saved-searches
GET    /api/saved-searches
DELETE /api/saved-searches/:id
```

Device tokens (push notifications):

```text
POST   /api/device-tokens                                    upsert by token
DELETE /api/device-tokens                                    body: { token }
```

Agencies:

```text
POST   /api/agencies/verify
GET    /api/agencies/status
```

Feedback:

```text
POST   /api/feedback                                        tenant, landlord, agency, mover
GET    /api/feedback/mine
GET    /api/feedback/public                                  no auth required
```

Admin:

```text
GET    /api/admin/users
GET    /api/admin/users/:id
GET    /api/admin/users/:id/summary
GET    /api/admin/users/:id/status-history
PUT    /api/admin/users/:id/status
GET    /api/admin/reviews
GET    /api/admin/agencies/verifications
PUT    /api/admin/agencies/verifications/:id/approve
PUT    /api/admin/agencies/verifications/:id/reject
GET    /api/admin/movers/verifications
PUT    /api/admin/movers/verifications/:id/approve
PUT    /api/admin/movers/verifications/:id/reject
GET    /api/admin/violations
PUT    /api/admin/violations/:id/status
GET    /api/admin/feedback
PUT    /api/admin/feedback/:id/respond
```

Movers:

```text
GET    /api/movers
GET    /api/movers?lat=-1.2921&lng=36.782&radiusKm=10
GET    /api/movers/profile                                   mover (own profile)
POST   /api/movers/profile                                    mover (upsert own profile)
GET    /api/movers/:id
PUT    /api/movers/:id/affiliate                               landlord, agency
DELETE /api/movers/:id/affiliate                               landlord, agency
GET    /api/properties/:id/movers                              affiliates + nearby, no auth required
```

Mover requests:

```text
GET    /api/mover-requests                                     tenant (their own sent requests)
POST   /api/mover-requests                                     tenant
GET    /api/mover-requests/received                            mover (across all requests to them)
PUT    /api/mover-requests/:id/status                          tenant (cancel only) or the receiving mover
```

## Business Logic

- Cost calculation for rent, deposit, and agency fees.
- Account profile update and password change workflow.
- Property response enrichment with first-month, upfront, and recurring monthly totals.
- Property lifecycle status and compatibility syncing with legacy availability flags.
- GeoJSON coordinate validation and radius-based property filtering.
- Property image URL and alt text management.
- Property image fingerprinting and duplicate image violation creation.
- Listing-specific owner and agency contact preferences.
- Role-aware dashboard summary counts for tenants, owners, agencies, movers, and admins.
- Admin account moderation notifications for restored, suspended, and banned users.
- Automatic violation threshold enforcement for repeated suspicious listing behavior.
- Saved property list enrichment with property cost summaries.
- Property inquiry and owner response workflow.
- Review aggregation for property ratings.
- Scheduled and open viewing request workflow.
- Notification triggers for inquiries, reviews, viewings, agency/mover verification decisions, and mover service requests.
- Agency and mover verification approval and rejection workflow, syncing a public-facing `verified` flag on the account/listing.
- Mover-affiliate management and property-proximity mover matching, reusing the same geo-radius filtering as property search.
- Mover service request workflow (create, accept/decline/complete, cancel) between tenants and movers.
- MongoDB connection health reporting.
- TTL response caching for public property and mover listings (in-memory by default, Redis-backed across instances when `REDIS_URL` is set), invalidated on property/mover writes.
- Platform feedback becomes a public testimonial the moment an admin responds — the public feedback list's response cache is invalidated on that same write so it appears immediately rather than waiting out the cache TTL.
- User-chosen usernames at registration, with availability checking and up to 3 collision-safe alternative suggestions on conflict; the same opaque-username generator is reused by the one-off backfill script for pre-existing accounts.

## Payment Boundary

KejaApp does not process, track, or mediate payments in the current product scope. The app is designed to connect tenants with landlords and agencies; any rent, deposit, agency fee, or other payment arrangement happens directly between those parties outside the platform.

## Security

- JWT authentication.
- HTTP-only auth cookies.
- Password hashing.
- Role-based authorization.
- Request validation middleware.
- Centralized error handling.
- Environment variable validation.

See the [Data Protection Policy](docs/data-protection-policy.md) for how personal data is collected, protected, retained, and deleted, aligned with the Kenya Data Protection Act 2019, GDPR, and ISO/IEC 27001/27701 control themes; the [ISO/IEC 27001 Statement of Applicability](docs/iso27001-statement-of-applicability.md) for a control-by-control self-assessment (gaps included); and the [Incident Response Plan](docs/incident-response-plan.md) for how a security/data incident is actually handled.

## Governance & Policies

Platform ethics and terms:
- [Code of Ethics](docs/code-of-ethics.md) — the principles governing how KejaApp is built and operated, and how every role is expected to treat other users.
- [Terms of Service](docs/terms-of-service.md) — the agreement governing account use, listing content, disclaimers, and dispute resolution.
- [Acceptable Use Policy](docs/acceptable-use-policy.md) — the enforceable list of prohibited content and conduct behind the Code of Ethics.
- [Dispute Resolution & Complaints Policy](docs/dispute-resolution-policy.md) — what KejaApp does and doesn't mediate, and how to complain about an enforcement decision.

Data protection and privacy:
- [Data Protection Policy](docs/data-protection-policy.md) — what data is collected, why, how it's secured, and user rights over it.
- [Cookie Policy](docs/cookie-policy.md) — cookies and local storage used by the web frontend.
- [Records of Processing Activities](docs/records-of-processing-activities.md) — a GDPR/Kenya-DPA-style register of every processing activity.
- [Data Protection Impact Assessments](docs/data-protection-impact-assessment.md) — risk assessments for the higher-risk processing activities (mover geolocation, image fingerprinting, admin moderation).

Security and operations:
- [Incident Response Plan](docs/incident-response-plan.md) — the internal runbook for handling a security/data incident, distinct from [SECURITY.md](SECURITY.md)'s vulnerability-reporting instructions.
- [ISO/IEC 27001 Statement of Applicability](docs/iso27001-statement-of-applicability.md) — a self-assessment mapping KejaApp's real security controls to the ISO/IEC 27001 Annex A control set, gaps included.
- [Accessibility Statement](docs/accessibility-statement.md) — what's implemented against WCAG 2.1 AA today, and what isn't yet.

User documentation:
- [User Manual](docs/user-manual/general-manual.md) — a general guide plus role-specific manuals for [tenants](docs/user-manual/tenant-manual.md), [landlords & agencies](docs/user-manual/landlord-agency-manual.md), [movers](docs/user-manual/mover-manual.md), and [admins](docs/user-manual/admin-manual.md).

Contributor documentation:
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — conduct standard for contributors to this codebase (Contributor Covenant), distinct from the platform-facing Code of Ethics above.
- [SECURITY.md](SECURITY.md) — how to report a security vulnerability.

## Project Structure

```text
.github/
├── workflows/
│   └── ci.yml
└── dependabot.yml

backend/
├── config/
├── constants/
├── controllers/
├── middlewares/
├── models/
├── routes/
├── seeders/
├── services/
├── tests/
├── utils/
├── validators/
├── app.js
├── Dockerfile
├── eslint.config.js
└── server.js

frontend/
├── src/
├── tests/
├── Dockerfile
├── eslint.config.js
├── nginx.conf
├── index.html
├── package.json
└── styles.css

mobile/
├── src/
│   ├── api/            # + client.test.js
│   ├── components/     # + MessageView.test.js
│   ├── context/
│   ├── navigation/
│   ├── screens/
│   ├── theme/
│   └── utils/          # + format.test.js
├── App.js
├── app.json
├── eslint.config.js
├── jest.setup.js
└── README.md

docs/
├── code-of-ethics.md
├── terms-of-service.md
├── acceptable-use-policy.md
├── dispute-resolution-policy.md
├── data-protection-policy.md
├── cookie-policy.md
├── records-of-processing-activities.md
├── data-protection-impact-assessment.md
├── incident-response-plan.md
├── iso27001-statement-of-applicability.md
├── accessibility-statement.md
├── user-manual/
│   ├── general-manual.md
│   ├── tenant-manual.md
│   ├── landlord-agency-manual.md
│   ├── mover-manual.md
│   └── admin-manual.md
├── devops.md
└── kejaapp-insomnia.json

docker-compose.yml
```

## Getting Started

Install dependencies from the repo root:

```bash
npm install
```

Create backend environment variables:

```bash
cp backend/.env.example backend/.env
```

Update `backend/.env` with your MongoDB URI and JWT secret.

For local development, `DB_REQUIRED=false` lets the API start even when Atlas temporarily rejects the connection. Database-backed routes still need MongoDB, but health checks and non-DB routes remain available while you fix the connection.

Run the backend from the repo root:

```bash
npm run dev
```

Or run backend commands directly:

```bash
cd backend
npm install
npm run dev
```

The API should be available at:

```text
http://localhost:5000
```

Run the frontend from the repo root:

```bash
npm run frontend
```

The frontend dev server starts on `http://localhost:5173` when available. If that port is already in use, it automatically tries the next open port and prints the URL. The backend development CORS config allows these local frontend ports.

Run the mobile app from the repo root:

```bash
npm run mobile
```

This starts the Expo/Metro bundler. See `mobile/README.md` for how to open it in Expo Go on a phone, a simulator/emulator, or a browser preview, and how to point it at the backend from a physical device.

### Running with Docker

Alternatively, run the whole stack (backend, frontend, MongoDB, Redis) in containers:

```bash
cp .env.example .env   # set JWT_SECRET
docker compose up --build
```

Frontend at `http://localhost:8080`, backend at `http://localhost:5000`. See `docs/devops.md` for details on the CI pipeline, container images, and health checks.

## MongoDB Troubleshooting

If startup shows an SSL error like `tlsv1 alert internal error` or `SSL alert number 80`, the app reached MongoDB Atlas but the TLS connection was rejected before Mongoose could authenticate. Check:

- Atlas Network Access includes your current public IP address.
- `MONGODB_URI` has the correct username, password, cluster host, and database path.
- Your VPN, firewall, DNS, or network is not interrupting Atlas connections.
- `DB_REQUIRED=false` is set in `backend/.env` while developing locally, then restart `npm run dev`.

Use `GET /api/health` in Insomnia to confirm whether the API is running with `database.status` as `connected` or `disconnected`.

Use `GET /api/health/database` to actively ping MongoDB. A `200` response means the API and database are linked; a `503` response means the API is running but MongoDB is not reachable.

## Testing

Run the full test suite from the repo root:

```bash
npm test
```

Run backend, frontend, or mobile tests separately:

```bash
npm run test:backend
npm run test:frontend
npm run test:mobile
```

Lint everything (or one package at a time):

```bash
npm run lint
```

Seed demo data:

```bash
cd backend
npm run seed
```

Seeded properties span 9 counties — Nairobi (Kilimani, Westlands, Kileleshwa, Lavington), Nakuru (Milimani, Naivasha), Mombasa (Nyali), Kisumu (Milimani), Uasin Gishu (Eldoret), Kiambu (Thika), Nyeri, Machakos, and Kakamega — useful for exercising radius/"near me" search across realistic real-world distances rather than just Nairobi-local ones.

Seeded movers now also cover Mombasa, Kisumu, Uasin Gishu, and Kiambu, alongside the existing Nairobi and Nakuru-based movers, matching the wider property coverage — each is a full account (not just a directory listing), with a mix of verification statuses and two affiliated with a seeded landlord/agency.

Demo login accounts all use `password123`. Each can also sign in with its username instead of its email — these were assigned by the opaque-username generator (the same one the seeder and `backfillUsernames.js` use for accounts with no one to ask), not hand-picked, and are stable across reseeds (the seeder only assigns one the first time an account is created). New registrations through the actual UI instead let the user choose their own.

```text
tenant@example.com          -> smartdelta3452
grace.tenant@example.com    -> quietstream8312
landlord@example.com        -> mightyeagle9957
mary.landlord@example.com   -> tidystream8373
agency@example.com          -> crimsonsavanna9698
urban.agency@example.com    -> fairjungle5360
rejected.agency@example.com -> nimblelagoon9265
mover1@example.com          -> sleekpeak1396
mover2@example.com          -> tidyember8957
mover3@example.com          -> luckyjasper3361
mover4@example.com          -> goldenivory1225
mover5@example.com          -> boldcanyon8855
mover6@example.com          -> brightmeadow6139
admin@example.com           -> primeprairie2890
```

Seeded agency verification records:

```text
agency@example.com -> pending
urban.agency@example.com -> approved
rejected.agency@example.com -> rejected
```

Seeded mover verification records:

```text
mover1@example.com -> SwiftMove Nairobi (Nairobi)              -> approved, affiliated with agency@example.com
mover2@example.com -> Rift Relocations (Nakuru)                -> approved, affiliated with landlord@example.com
mover3@example.com -> Coastal Movers Mombasa (Mombasa)          -> approved
mover4@example.com -> Lakeview Relocations Kisumu (Kisumu)      -> pending
mover5@example.com -> Highlands Movers Eldoret (Uasin Gishu)    -> approved
mover6@example.com -> Metro Movers Thika (Kiambu)               -> rejected
```

Seeded tenant workflow records:

```text
tenant@example.com -> open inquiry and pending scheduled viewing for Modern Kilimani Apartment
grace.tenant@example.com -> responded inquiry for Spacious Nakuru Maisonette and approved open viewing for Cozy Westlands Studio
```

Seeded violation review fixture:

```text
Modern Kilimani Apartment and Draft Kileleshwa Duplex intentionally share one image URL, which creates an open duplicate-property-image violation for admin review.
```

## API Testing With Insomnia

1. Import `docs/kejaapp-insomnia.json` into Insomnia.
2. Select the `Base Environment`.
3. Confirm `base_url` is set to `http://localhost:5000`.
4. Register or log in.
5. Copy the returned token into the `token` environment variable.
6. After creating resources, copy returned ids into the matching environment variables such as `property_id`, `image_id`, `inquiry_id`, `viewing_id`, `notification_id`, and `verification_id`.
7. Use the grouped requests for Auth, Properties, Favorites, Reviews, Inquiries, Viewings, Notifications, Agencies, Admin, and Movers.

Run MongoDB integration tests against a disposable test database:

```bash
TEST_MONGODB_URI="mongodb://localhost:27017" TEST_MONGODB_DB_NAME=kejaapp_test npm test
```

## Roadmap

See [CHANGELOG.md](./CHANGELOG.md) for a detailed, chronological history of what has been built so far.

Next:
- Keep payments off-platform unless the product scope changes later.
- Username is currently immutable (assigned once at registration, no "change username" flow on web, mobile, or the API) — revisit if users ask to customize it.
- Mobile: verify on an actual iOS device/simulator (Android now verified via emulator).
- Mobile: test coverage still doesn't cover every screen — Discover's sub-screens (`PropertyDetailScreen`, `InquiryFormScreen`, `ViewingRequestFormScreen`, `MoverRequestFormScreen`), the auth screens (`LoginScreen`/`RegisterScreen`), and `LandingView`/`AdminUserDetailScreen` remain untested.
- DevOps: pick a real hosting target and wire up an actual deploy step (currently CI builds images but doesn't push/deploy anywhere).
- Revisit the `eslint`/`jest` version holds above once compatible releases publish: `eslint-config-expo`/`jest-expo` are already at their latest versions (57.0.0/57.0.1), so there's nothing to bump today. The real blockers are upstream — `eslint-plugin-react@7.37.5` (its latest release) still calls a `context.getFilename()` API that ESLint 9+'s flat config removed, and `jest-expo`'s `@react-native/jest-preset` (tied to RN 0.86) pins `babel-jest`/`jest-environment-node` to `^29.7.0`, incompatible with `jest@30`.
- Push notifications only cover mobile (Expo) — web browser push (Web Push/VAPID + service worker) is a different mechanism and out of scope so far.

## License

[MIT License](./LICENSE)
