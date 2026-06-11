# KejaApp

KejaApp is a location-first rental platform for tenants, landlords, agencies, admins, and mover providers. The goal is to make rental discovery more transparent by combining property listings, trusted agency verification, clear pricing, reviews, notifications, and relocation services.

## Current Status

The backend API and first web frontend are under active MVP development. The backend currently includes authentication, account management, property management, property image management, saved properties, transparent pricing, property inquiries, viewing requests, reviews, agency verification, admin moderation, notifications, mover discovery, seed data, tests, and an Insomnia collection for manual API testing.

A static adaptive web app is available in `frontend/`. React Native is planned.

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

## Tech Stack

Frontend:
- Static web MVP
- Adaptive responsive UI for desktop, tablet, and phone screens
- Kenyan flag color theme toggle
- React Native planned

Backend:
- Node.js
- Express
- MongoDB Atlas
- Mongoose

Development and testing:
- Nodemon
- Node test runner
- Insomnia

Deployment targets:
- Backend: Render or Railway
- Frontend: Vercel

## Implemented Backend

Application foundation:
- Express app split into `backend/app.js` and `backend/server.js`.
- Centralized environment loading and validation in `backend/config/env.js`.
- MongoDB Atlas connection helper with retry support and local degraded startup support in `backend/config/db.js`.
- Health endpoint with database status and configured database path.
- Load-balancer liveness and readiness endpoints.
- CORS, Helmet, Morgan logging, centralized async handling, and error middleware.
- Nodemon watch configuration for backend auto-refresh.
- Configurable API and auth rate limiting.
- OpenAPI JSON exposed for API tooling.
- Protected role-aware dashboard summary endpoint.
- Admin user account status moderation for active, suspended, and banned accounts.
- Admin user account status history for moderation audit trails.
- User notifications when account status changes.

Authentication and authorization:
- User registration and login.
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
- Public property listing and property detail endpoints.
- Protected owner property management list across lifecycle statuses.
- Protected property create, update, and delete endpoints for landlords, agencies, and admins.
- Property lifecycle statuses for `draft`, `available`, `taken`, and `archived` listings.
- Rent, deposit, and agency fee fields.
- Cost summary enrichment on property responses.
- Protected image URL and alt text management for property galleries.
- Protected local property image upload storage with file metadata.
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

The first web frontend is in `frontend/` and runs without a build step.

Included flows:
- Public property discovery with filters.
- Adaptive property cards, insights, sorting, and loading states.
- Login with demo account shortcuts.
- Role-aware dashboard summary.
- Saved property actions.
- Inquiry and viewing request actions.
- Owner property creation and listing management.
- Admin user list and account status moderation.
- Theme toggle between the standard palette and Kenyan flag colors.

Responsive behavior:
- Header, connection controls, filters, dashboard panels, and workspace tabs reflow across desktop, tablet, and phone widths.
- Property grids use container-safe card sizing so listings do not overflow narrow screens.
- Owner tools and admin moderation tables adapt for smaller screens.
- Dialogs, toast messages, form controls, and action buttons include narrow-screen overflow protection.

Run the frontend:

```bash
npm run frontend
```

Or from inside `frontend/`:

```bash
npm run dev
```

If port `5173` is busy, the frontend dev server automatically uses the next open port and prints the URL.

Then open:

```text
http://localhost:5173
```

Keep the backend running separately:

```bash
npm run dev
```

Run frontend tests:

```bash
npm run test:frontend
```

## User Stories

### Account Management

As a user, I want to manage my profile and password, so that my account information stays current and secure.

Acceptance criteria:
- Given I am logged in, when I update my name or phone number, then my profile is saved.
- Given I try to update protected fields like email or role through the profile endpoint, then those fields are ignored.
- Given I change my password with the correct current password, then the new password is saved securely.
- Given I change my password with the wrong current password, then the API rejects the request.

### Tenant Property Discovery

As a tenant, I want to browse and filter available rental properties by location, price, and property type, so that I can quickly find homes that match my needs and budget.

Acceptance criteria:
- Given I am on the property list, when I filter by rent, location, type, or availability, then I only see matching properties.
- Given I browse public listings without a status filter, then I only see properties marked as available.
- Given I search near a latitude and longitude with a radius, then I only see properties with coordinates inside that area.
- Given I open a property, when the details load, then I can view the title, description, location, images, amenities, owner or agency type, listing contact details, reviews, and pricing.
- Given a property has rent, deposit, or agency fees, when I view it, then I can see the total upfront cost and recurring monthly cost.

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

### Transparent Pricing

As a landlord or agency, I want to add rent, deposit, and agency fee values to my property listings, so that tenants can understand the full cost before contacting me.

Acceptance criteria:
- Given I am logged in as a landlord, agency, or admin, when I create or update a property, then I can save valid pricing fields.
- Given I am not authenticated or I have a tenant role, when I try to create or update property pricing, then the API rejects the request.
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
- Given I am logged in as the property owner, agency owner, or admin, when I add a valid image URL and optional alt text, then the image appears on the property.
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
- Given a new review is created, when the property owner has an account, then they receive a notification.

### Property Inquiries

As a tenant, I want to send an inquiry about a property, so that I can ask questions before requesting a viewing or contacting the owner directly.

Acceptance criteria:
- Given I am logged in and the property exists, when I submit a message and optional contact preference, then an open inquiry is created.
- Given I own the property, when a tenant sends an inquiry, then I receive a notification.
- Given I am the property owner or admin, when I respond to an inquiry, then the tenant receives a notification.
- Given I list my inquiries, when the response loads, then I only see inquiries I sent.
- Given I own a property, when I list property inquiries, then I only see inquiry records for that property.

### Viewing Requests

As a tenant, I want to request a viewing for a property, so that I can arrange a visit before deciding whether to rent it.

Acceptance criteria:
- Given a landlord or agency creates a property, when they choose a viewing type, then the listing can be marked as `scheduled` or `open`.
- Given I am logged in and the property has scheduled viewing, when I submit a future requested date and optional message, then a pending viewing request is created.
- Given I am logged in and the property has open viewing, when I submit an optional message without a requested date, then an approved viewing request is created.
- Given I own the property, when a tenant requests a viewing, then I receive a notification.
- Given I already have a pending or approved request for the same property, when I request another viewing, then the API rejects the duplicate request.
- Given I am the property owner or an admin, when I approve, reject, cancel, or complete a viewing request, then the requester receives a notification.

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
GET    /api/properties/mine
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
GET    /api/properties/:id/reviews
```

Inquiries:

```text
GET    /api/inquiries
POST   /api/inquiries
PUT    /api/inquiries/:id
GET    /api/properties/:id/inquiries
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

Admin:

```text
GET    /api/admin/users
GET    /api/admin/users/:id
GET    /api/admin/users/:id/summary
GET    /api/admin/users/:id/status-history
PUT    /api/admin/users/:id/status
GET    /api/admin/agencies/verifications
PUT    /api/admin/agencies/verifications/:id/approve
PUT    /api/admin/agencies/verifications/:id/reject
GET    /api/admin/violations
PUT    /api/admin/violations/:id/status
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
└── server.js

frontend/
├── tests/
├── app.js
├── dev-server.js
├── index.html
├── package.json
└── styles.css

docs/
└── kejaapp-insomnia.json
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

The frontend dev server starts on `http://localhost:5173` when available. If that port is already in use, it automatically tries the next open port and prints the URL.

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

Run backend or frontend tests separately:

```bash
npm run test:backend
npm run test:frontend
```

Seed demo data:

```bash
cd backend
npm run seed
```

Demo login accounts all use `password123`:

```text
tenant@example.com
grace.tenant@example.com
landlord@example.com
mary.landlord@example.com
agency@example.com
urban.agency@example.com
rejected.agency@example.com
admin@example.com
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

Next:
- Keep payments off-platform unless the product scope changes later.
- Expand the web frontend from the static MVP into a richer app experience.
- React Native mobile app.

## License

MIT License
