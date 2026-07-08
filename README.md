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
 - Mover discovery
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
- Reviews and rating aggregation.
- Agency verification workflow.
- Admin approval and rejection of agency verifications.
- User notifications for important listing and account activity.
- Mover and relocation service discovery.
- Platform feedback from tenants, landlords, and agencies, with admin responses published as public testimonials on the landing page.
- Sign in with either your email or a username you choose at registration, for users who'd rather not type their email at login.

## Tech Stack

Frontend:
- Static web MVP
- Adaptive responsive UI for desktop, tablet, and phone screens
- Kenyan flag color palette (single, fixed theme) with a light/dark mode radio toggle in the header, present on every page including the landing page

Mobile:
- React Native (Expo), targeting iOS and Android from one codebase
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
- Notification model and service layer.
- Protected notification listing.
- Mark notification as read endpoint.
- Event-triggered notifications for inquiries, reviews, viewings, and agency verification decisions.

Trust and safety:
- Property image fingerprint records for uploaded listing images.
- Duplicate property image violation records when different owners reuse the same listing image.
- Admin violation listing and review status updates.
- Automatic user bans on the fourth active violation.

Platform feedback:
- Feedback model linked to the submitting user, with a `pending`/`responded` status and an embedded admin response (message, responder, timestamp).
- Protected endpoint for tenants, landlords, and agencies to submit feedback (admins cannot submit — they only respond).
- Protected endpoint for users to list their own submitted feedback.
- Admin-only endpoints to list all feedback and respond to a pending item.
- Responding marks the feedback `responded` and publishes it immediately — no separate publish/unpublish step.
- Public, unauthenticated, cached endpoint listing only responded/published feedback, consumed by the landing page as testimonials.
- Notification triggered for the submitter when an admin responds.
- Pending feedback count surfaced in the admin dashboard summary, alongside the existing agency-verification and violation counts.

Movers:
- Mover model.
- Public mover listing endpoint.
- Filters for service type, rating, base price, and service area.
- Demo mover seed data.

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
- React components in `src/pages/` (LandingPage, DashboardPage, DiscoverPage, SavedPage, WorkspacePage, PropertyEditPage, PropertyCreatePage, AdminPage, FeedbackPage), with the create/edit form fields factored into a shared `src/components/PropertyForm.jsx`.
- Manual `window.history.pushState` routing without react-router.
- Page-based layout with tabbed navigation for role-aware view access.
- Global `app-utils.js` for API helpers, formatting, and view logic.
- Light/dark mode toggle that persists locally.

Authentication and session:
- Sign-in/sign-up modal overlay in the header with login and register tabs.
- Role selection (tenant, landlord, agency) during registration.
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
- All requests include Authorization bearer token if signed in.
- `fetchProperties`, `fetchPropertyById`, `fetchFavorites`, `fetchMyProperties`, `fetchReceivedInquiries`, `fetchMyFeedback`, and `fetchAdminFeedback` are cached in-memory for 15 seconds to avoid redundant refetches on remount (`fetchPublicTestimonials` for 60 seconds); the favorites cache clears on save/remove, the property/my-properties caches clear on `updateProperty`, the feedback caches clear on `createFeedback`/`respondToFeedback`, and the whole cache clears on login, logout, register, and account deletion.

Included flows:
- Brand-gradient landing hero (built from the app's own theme colors, not a stock photo) with a visible header (logo, mode toggle, sign in) and a single call-to-action, plus anonymous listing search before authentication.
- Testimonials section on the landing page, populated from admin-responded platform feedback (`GET /api/feedback/public`) — hidden entirely when there are none yet, so it never shows an empty/error state to signed-out visitors.
- Role-aware Dashboard (`/dashboard`) — the default landing view for every signed-in role right after sign-in, showing unread notifications for everyone plus role-specific sections (tenant activity; owner listings for landlord/agency; agency verification status; admin platform-moderation counts). Admins do not get an owner listings section, since admins manage users, not listings. Backed by `GET /api/dashboard/summary`.
- Anonymous property discovery with radius search and gated save actions.
- Property detail page (`/property/:id`) reached via "Details" from Discover or Saved — full description, cost summary, contact info, amenities, and inline forms to send an inquiry or request a viewing (matching the mobile app's flow).
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
- Light and dark mode toggle that persists locally.

Frontend access model:
- Anonymous visitors can search available listings without leaving the search page.
- Tenants can search homes, save listings after signing in, and manage saved listings.
- Landlords and agencies can access the owner workspace placeholder.
- Admins can access the admin console to manage user accounts. Admins cannot access the owner workspace and have no listing creation, editing, or viewing capability anywhere in the app or API.
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
- Given I open a property, when the details load, then I can view the title, description, location, images, amenities, owner or agency type, listing contact details, reviews, and pricing.
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

### Admin Moderation

As an admin, I want to review agency verification requests, so that only trusted agencies are marked as verified.

Acceptance criteria:
- Given I am logged in as an admin, when I list agency verification requests, then I can view pending, approved, and rejected requests.
- Given I approve a request, when the action succeeds, then the agency is marked approved and receives a notification.
- Given I reject a request, when I provide a reason, then the agency is marked rejected and receives the reason in a notification.

### Notifications

As a user, I want to receive notifications for important account and listing activity, so that I do not miss updates that need my attention.

Acceptance criteria:
- Given I am logged in, when I request my notifications, then I only see notifications that belong to me.
- Given I mark a notification as read, when the action succeeds, then it no longer appears as unread.
- Given a relevant event happens, such as agency verification or a property review, then a notification is created.

### Mover Discovery

As a tenant, I want to browse mover and relocation services, so that I can plan my move after finding a home.

Acceptance criteria:
- Given I view movers, when I filter by service type, price, or rating, then I only see matching mover providers.
- Given movers are returned, when I inspect the list, then I can see provider details, service areas, rating, and base price.

### Platform Feedback

As a tenant, landlord, or agency, I want to tell KejaApp how the platform helped me, and have an admin respond, so that my experience can be shared as a testimonial for future users.

Acceptance criteria:
- Given I am a signed-in tenant, landlord, or agency, when I submit feedback, then it is saved as pending and I can see it in my own feedback list.
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

Agencies:

```text
POST   /api/agencies/verify
GET    /api/agencies/status
```

Feedback:

```text
POST   /api/feedback                                        tenant, landlord, agency
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
GET    /api/admin/violations
PUT    /api/admin/violations/:id/status
GET    /api/admin/feedback
PUT    /api/admin/feedback/:id/respond
```

Movers:

```text
GET    /api/movers
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
- Role-aware dashboard summary counts for tenants, owners, agencies, and admins.
- Admin account moderation notifications for restored, suspended, and banned users.
- Automatic violation threshold enforcement for repeated suspicious listing behavior.
- Saved property list enrichment with property cost summaries.
- Property inquiry and owner response workflow.
- Review aggregation for property ratings.
- Scheduled and open viewing request workflow.
- Notification triggers for inquiries, reviews, viewings, and agency verification decisions.
- Agency verification approval and rejection workflow.
- MongoDB connection health reporting.
- TTL response caching for public property and mover listings (in-memory by default, Redis-backed across instances when `REDIS_URL` is set), invalidated on property writes.
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

Seeded movers now also cover Mombasa and Kisumu, alongside the existing Nairobi and Nakuru-based movers, matching the wider property coverage.

Demo login accounts all use `password123`. Each can also sign in with its username instead of its email — these were assigned by the opaque-username generator (the same one the seeder and `backfillUsernames.js` use for accounts with no one to ask), not hand-picked, and are stable across reseeds (the seeder only assigns one the first time an account is created). New registrations through the actual UI instead let the user choose their own.

```text
tenant@example.com          -> smartdelta3452
grace.tenant@example.com    -> quietstream8312
landlord@example.com        -> mightyeagle9957
mary.landlord@example.com   -> tidystream8373
agency@example.com          -> crimsonsavanna9698
urban.agency@example.com    -> fairjungle5360
rejected.agency@example.com -> nimblelagoon9265
admin@example.com           -> primeprairie2890
```

Seeded agency verification records:

```text
agency@example.com -> pending
urban.agency@example.com -> approved
rejected.agency@example.com -> rejected
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

Completed:
- Backend POC.
- Auth, account management, property listings, property image management, saved properties, pricing, property inquiries, viewing requests, reviews, notifications, agency verification, admin moderation, movers, static web frontend, tests, seeding, and Insomnia collection.
- React Native (Expo) mobile app MVP for iOS and Android covering auth, discover/search, property detail, saved favorites, inquiries, and viewing requests — see `mobile/README.md`. Verified end-to-end on a real Android emulator, not just the Expo web preview.
- CI (GitHub Actions), Docker images for backend/frontend, docker-compose for local/staging, and health check endpoints — see `docs/devops.md`.
- ESLint across backend/frontend/mobile (each with its own flat config) wired into CI, Dependabot for weekly dependency updates, a Jest + React Native Testing Library test setup for mobile, and a fix for 11 moderate mobile dependency vulnerabilities.
- Seeded demo data expanded from 2 to 9 counties (11 available properties) with matching mover coverage, and a property detail page + inquiry/viewing-request forms added to the web frontend (previously mobile-only), closing the gap where the Discover page's "Details" button had no handler at all.
- Fixed the Discover/Saved property cards hiding the star-rating summary behind the description text (it was only ever shown when a property had no description, so it almost never rendered), and seeded 15 reviews across 9 properties (2 more tenant demo users added for reviewer variety) so ratings actually have real, non-zero data to display. Also fixed the seeder's rating-recompute step, which was passing a stringified property ID into a raw Mongoose aggregation `$match` — since aggregate pipelines aren't auto-cast, this silently zeroed out every property's rating on each reseed.
- Web owner workspace replaced its hardcoded placeholder numbers with real, server-scoped data — a new `GET /api/inquiries/received` endpoint plus the existing `GET /api/properties/mine` now drive a real "your listings + inquiries about them" view, verified against two different landlord/agency accounts to confirm correct per-owner scoping.
- Skeleton loading UI (pulse animation) on all card/list-shaped loading states on both web and mobile, replacing plain "Loading..." text.
- Backend/HTTP log timestamps now use Nairobi (`Africa/Nairobi`, UTC+3) time instead of UTC, including the app log file's day-rollover boundary.
- Dependency upgrades via Dependabot: frontend to React 19 + Vite 8 (resolving the `vite@5` dev-server CVEs) and mobile to Expo 57.0.2/React Native 0.86, `@react-native-async-storage/async-storage` 3.x, and other patch bumps — `eslint`/`jest` were deliberately held back on frontend/mobile because `eslint-plugin-react`/`eslint-config-expo`/`jest-expo` don't yet support `eslint@10`/`jest@30` (verified via a broken `npm ci`/crashing lint run before pinning back).
- Fixed a bug in the landing page's header "Sign in" button: the auth modal was nested inside the non-splash branch of a ternary, so it never rendered while the landing page itself was showing.
- Added Calibri as the primary body font (falls back to the existing Inter/system stack on platforms without it, since Calibri can't be legally bundled as a web font).
- Automated API testing: migrated `tests/app.test.js` from a homemade in-process request helper to [supertest](https://github.com/ladjs/supertest), and added a real-database end-to-end API flow test (`tests/integration/apiFlows.integration.test.js`) covering register/login, property CRUD, inquiries, viewing requests, reviews, and favorites — opt-in via `TEST_MONGODB_URI`, same as the existing MongoDB integration test. Building it surfaced three real bugs, now fixed: (1) `tests/helpers/nodeTestCompat.js`'s `after()` ran its callbacks after the *first* test in a suite instead of the last, masked until now because the only prior multi-`before`/`after` consumer had just one test; (2) `Review.updatePropertyRating` matched on a raw (non-auto-cast) aggregation `$match`, so `respondToReview`'s populated `review.property` (instead of a plain ObjectId) silently zeroed out a property's rating whenever an owner responded to a review; (3) `reviewController.js` never invalidated the `properties` response cache on review create/response, so a property's rating could appear stale for up to the cache TTL after a review was submitted.
- Built a Dashboard on both web and mobile that actually consumes the previously backend-only, role-aware `GET /api/dashboard/summary` endpoint — the User Stories documented what each role sees, but nothing in either app ever called it. Now it's the default landing view for every signed-in role right after sign-in (a new nav tab on web at `/dashboard`, a new first bottom tab on mobile), showing unread notifications plus role-specific sections. This is also the first landlord/agency/admin-facing screen on mobile, which previously had none.
- Fixed the web owner workspace's "Your listings" cards, which rendered as static, non-interactive `<article>`s with no click handler at all — landlords/agencies had no way to open or edit a listing once created, even though the backend's `PUT /api/properties/:id` had existed all along. Added an Edit action per card that opens a new `PropertyEditPage` (`/owner/properties/:id/edit`, gated by `canManageListings`) covering title/description/type/status, price, location, bedrooms/bathrooms/amenities, viewing type/instructions, and contact details; carries forward the existing `location.coordinates` on save since the update endpoint replaces the whole `location` subdocument and the edit form has no map picker to re-supply it.
- Added a "New listing" creation flow for landlords/agencies on both web and mobile, backed by the existing `POST /api/properties` endpoint (previously only reachable via seeding/direct API calls — neither app had any UI to create a listing at all). Web: a `PropertyCreatePage` sharing its form fields with `PropertyEditPage` via a new `PropertyForm` component, reached from a "New listing" button in the workspace header, gated by `canManageListings`. Mobile: a first-ever Workspace tab (role-gated: sign-in and landlord/agency/admin required, shown as a message otherwise) listing the signed-in owner's properties via the newly added `fetchMyProperties`, with a "New listing" header action opening a create form (`WorkspaceStack` → `PropertyCreateScreen`). Tenants retain read-only access everywhere (Discover/Saved/property detail) and cannot reach either creation path.
- Consolidated the app's two-shade green palette (web's `--green`/`--green-dark` CSS variables, mobile's `colors.green`/`colors.greenDark`) down to a single dark shade everywhere, at the user's request. Previously `--green-dark` was deliberately re-lightened in dark mode (to `#4fbf7a`) to fix a text-contrast bug against the dark background (~1.4:1 contrast otherwise); collapsing to one literal color per the request reintroduces that low-contrast text in dark mode for elements that use the shared green (nav links, prices, stat numbers) — a known, explicitly-accepted tradeoff, not an oversight.
- Removed the web frontend's default-vs-Kenya-flag theme toggle, at the user's request — the Kenyan flag palette (previously the `data-theme="kenya"` variant) is now the only look, merged directly into `:root`. The separate light/dark mode toggle is untouched (mobile never had a theme toggle to begin with, only the one fixed palette).
- Replaced the web frontend's single cycling "Mode" button with an explicit two-option Light/Dark radio toggle (`role="radiogroup"`, native radio inputs under the hood) in the header's top-right corner, at the user's request. It's the same shared header on every page, including the landing page, and — unlike the old button — is no longer hidden on narrow phone widths.
- Corrected the admin role to match its user story: admins moderate users, not listings. Previously admins were quietly included in `listingManagers`/`propertyOwners`-style role checks across the property, inquiry, and viewing-request routes and controllers, plus the dashboard and user-summary "owner" sections — meaning an admin account could in principle create, edit, or delete any property, and view/manage inquiries and viewing requests, none of which matched the documented user stories. Removed admin from every listing-management role check on the backend (routes, `ensurePropertyOwner`/`ensureInquiryManager`/`ensurePropertyManager`, `listMyProperties`/`listReceivedInquiries`/`listPropertyInquiries`, dashboard and admin-user-summary "owner" blocks) and from the frontend/mobile's `canManageListings`/`listingManagerRoles` equivalents, and replaced the web `AdminPage` placeholder with a real user-management console (search/filter users, view a user's account summary and status history, change account status to active/suspended/banned with a reason) built on the admin API endpoints that already existed but had no UI.
- A general UI/UX audit pass across web and mobile: added missing error/success styling and Retry actions to pages and screens that previously only showed a dead end on failure (Saved/Workspace/Dashboard/Discover/Admin on web; Dashboard/Saved/Requests/Workspace/Discover/property-detail on mobile), fixed several 44px-minimum touch-target violations (mobile save/chip buttons), added `KeyboardAvoidingView` to the remaining mobile forms that lacked it, added a sign-out confirmation dialog on mobile, made the admin users table keyboard-accessible, replaced plain loading text with skeleton placeholders where it was still missing, shrunk an oversized 477KB logo asset down to 31KB for its actual 44×44 display size, and fixed a real bug where two mobile screens referenced an undefined `colors.green` (should have been `colors.greenDark`), making the primary "Create listing" button invisible.
- Platform feedback and testimonials: tenants, landlords, and agencies can submit general feedback about their experience; only admins can respond, and responding immediately publishes the feedback as a testimonial on the signed-out landing page. New `Feedback` model/controller/routes on the backend, a `Feedback` tab on both web (`/feedback`) and mobile (a 7th always-visible bottom tab), and a pending-feedback count added to the existing admin dashboard "platform moderation" panel. Building this surfaced a real caching bug: the admin-response endpoint wasn't invalidating the public feedback response cache, so a newly-published testimonial could take up to the cache TTL to actually appear.
- Username login: registration now also assigns every account an opaque, backend-generated username (e.g. `swiftcheetah284` — an adjective, a noun, and a number, never derived from the person's real name, specifically so it doesn't leak identity the way a name-based handle would), and login accepts either the account's email or this username. A one-off `backend/seeders/backfillUsernames.js` script assigns usernames to accounts that predate this feature. Verified against a real database: registered a new account, logged in with the generated username, with the email, and with a mixed-case version of the username (case-insensitive match), confirmed a wrong password still fails, and confirmed the backfill script only touches accounts actually missing a username.
- Small alignment fixes on the Discover radius/location filters: the web "Radius" control (a stacked label + select) was vertically floating against its shorter neighboring buttons because the shared `.header-actions` row centered items instead of aligning their bottoms; and the mobile "Near me" button didn't share the 44px touch-target height of the radius chips beside it, making it look shorter than its row.
- Follow-up to username login: users now choose their own username at registration (free text, no character restrictions) instead of receiving an auto-generated one. If the requested username is already taken, registration is rejected with a `409` and up to 3 available alternatives (the requested name plus different random-number suffixes) to pick from instead — both web and mobile show these as clickable/tappable suggestions under the username field. The opaque generator didn't go away: `backend/seeders/backfillUsernames.js` and the demo seeder still use it for accounts with no human to ask. Generalized the backend's `ApiError`/central error handler to carry structured extra data (like `suggestions`) through to the JSON response, and fixed both web and mobile's `apiFetch` helpers, which previously discarded every field but `message` from error responses.

Next:
- Keep payments off-platform unless the product scope changes later.
- Username is currently immutable (assigned once at registration, no "change username" flow on web, mobile, or the API) — revisit if users ask to customize it.
- Mobile: owner workspace now covers listing + creating properties; editing an existing listing, image management, and the received-inquiries view are still web-only. The web admin console now covers user management, but mobile still has no admin console screen at all, and review moderation UI is still missing on both web and mobile.
- Mobile: verify on an actual iOS device/simulator (Android now verified via emulator).
- Mobile: expand test coverage beyond the initial API-client/formatter/component tests (screens, navigation, context providers).
- DevOps: pick a real hosting target and wire up an actual deploy step (currently CI builds images but doesn't push/deploy anywhere).
- Revisit the `eslint`/`jest` version holds above once `eslint-config-expo`/`eslint-plugin-react`/`jest-expo` publish compatible releases.
- Clarify whether `README_CLOUD.md`'s GCP Cloud Run/Cloud Storage setup is live or aspirational, and whether the incomplete FCM push-notification endpoint (`POST /api/auth/fcm-token`, no `firebase-admin` wired up) should be finished.

## License

[MIT License](./LICENSE)
