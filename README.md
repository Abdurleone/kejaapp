# KejaApp

KejaApp is a location-first rental platform for tenants, landlords, agencies, admins, and mover providers. The goal is to make rental discovery more transparent by combining property listings, trusted agency verification, clear pricing, reviews, notifications, and relocation services.

## Current Status

The backend API is under active MVP development. It currently includes authentication, property management, transparent pricing, viewing requests, reviews, agency verification, admin moderation, notifications, mover discovery, seed data, tests, and an Insomnia collection for manual API testing.

Frontend clients are planned for React Web and React Native.

## Core Features

- Map-based and location-first property discovery.
- Property listings for landlords and agencies.
- Advanced property search and filters.
- Transparent rent, deposit, and agency fee calculations.
- Viewing request flow between tenants and property owners.
- Reviews and rating aggregation.
- Agency verification workflow.
- Admin approval and rejection of agency verifications.
- User notifications for important listing and account activity.
- Mover and relocation service discovery.

## Tech Stack

Frontend:
- React Web
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
- MongoDB Atlas connection helper with retry support in `backend/config/db.js`.
- Health endpoint with database status and configured database path.
- CORS, Helmet, Morgan logging, centralized async handling, and error middleware.
- Nodemon watch configuration for backend auto-refresh.

Authentication and authorization:
- User registration and login.
- JWT generation and validation.
- Bearer token support for API clients.
- HTTP-only auth cookie support.
- Logout endpoint that clears the auth cookie.
- Password hashing and comparison utilities.
- Role-based authorization for tenant/user, landlord, agency, and admin workflows.

Properties and pricing:
- Property model with owner, location, price, amenities, images, availability, and rating summary fields.
- Public property listing and property detail endpoints.
- Protected property create, update, and delete endpoints for landlords, agencies, and admins.
- Rent, deposit, and agency fee fields.
- Cost summary enrichment on property responses.
- Public read-only cost calculator endpoint.
- Filters for rent range, location, listing type, availability, and text search.

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
- Event-triggered notifications for reviews, viewings, and agency verification decisions.

Movers:
- Mover model.
- Public mover listing endpoint.
- Filters for service type, rating, base price, and service area.
- Demo mover seed data.

Developer workflow:
- Insomnia collection at `docs/kejaapp-insomnia.json`.
- Demo seed script at `backend/seeders/seedDemoData.js`.
- Root package scripts that proxy common backend commands.
- Test coverage for app routes, validators, middleware, models, services, password hashing, cookies, and admin workflows.

## User Stories

### Tenant Property Discovery

As a tenant, I want to browse and filter available rental properties by location, price, and property type, so that I can quickly find homes that match my needs and budget.

Acceptance criteria:
- Given I am on the property list, when I filter by rent, location, type, or availability, then I only see matching properties.
- Given I open a property, when the details load, then I can view the title, description, location, images, amenities, owner or agency type, reviews, and pricing.
- Given a property has rent, deposit, or agency fees, when I view it, then I can see the total upfront cost and recurring monthly cost.

### Transparent Pricing

As a landlord or agency, I want to add rent, deposit, and agency fee values to my property listings, so that tenants can understand the full cost before contacting me.

Acceptance criteria:
- Given I am logged in as a landlord, agency, or admin, when I create or update a property, then I can save valid pricing fields.
- Given I am not authenticated or I have a tenant role, when I try to create or update property pricing, then the API rejects the request.
- Given I am any user, when I submit price values to the cost calculator, then I receive calculated first-month, upfront, and recurring monthly totals without creating or changing a property.

### Property Reviews

As a tenant, I want to review a property after interacting with it, so that future tenants can make more informed decisions.

Acceptance criteria:
- Given I am logged in, when I submit a valid rating and comment for a property I do not own, then the review is saved.
- Given a property has reviews, when I view the property reviews, then I can see the review list and aggregated rating.
- Given a new review is created, when the property owner has an account, then they receive a notification.

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
```

Auth:

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

Properties:

```text
GET    /api/properties
POST   /api/properties
GET    /api/properties/:id
PUT    /api/properties/:id
DELETE /api/properties/:id
POST   /api/properties/costs/calculate
```

Reviews:

```text
POST   /api/reviews
GET    /api/properties/:id/reviews
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
GET    /api/admin/agencies/verifications
PUT    /api/admin/agencies/verifications/:id/approve
PUT    /api/admin/agencies/verifications/:id/reject
```

Movers:

```text
GET    /api/movers
```

## Business Logic

- Cost calculation for rent, deposit, and agency fees.
- Property response enrichment with first-month, upfront, and recurring monthly totals.
- Review aggregation for property ratings.
- Scheduled and open viewing request workflow.
- Notification triggers for reviews, viewings, and agency verification decisions.
- Agency verification approval and rejection workflow.
- MongoDB connection health reporting.

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

## Testing

Run the backend test suite:

```bash
cd backend
npm test
```

Seed demo data:

```bash
cd backend
npm run seed
```

## API Testing With Insomnia

1. Import `docs/kejaapp-insomnia.json` into Insomnia.
2. Select the `Base Environment`.
3. Confirm `base_url` is set to `http://localhost:5000`.
4. Register or log in.
5. Copy the returned token into the `token` environment variable.
6. Use the grouped requests for Auth, Properties, Reviews, Viewings, Notifications, Agencies, Admin, and Movers.

## Roadmap

Completed:
- Backend POC.
- Auth, property listings, pricing, viewing requests, reviews, notifications, agency verification, admin moderation, movers, tests, seeding, and Insomnia collection.

Next:
- Saved properties or favorites.
- Property image upload flow.
- Payment workflow.
- React web frontend.
- React Native mobile app.

## License

MIT License
