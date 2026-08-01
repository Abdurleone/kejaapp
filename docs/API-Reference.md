# API Reference

Base URL for local development: `http://localhost:5000`

Authentication supports both:

```text
Authorization: Bearer <token>
Cookie: keja_token=<token>
```

See **[Authentication](Authentication)** for the full register/login flow, including the email-or-username login and username-conflict-with-suggestions behavior.

## Health

```text
GET    /
GET    /api/health
GET    /api/health/database
GET    /api/health/live
GET    /api/health/ready
GET    /api/docs/openapi.json
```

## Dashboard

```text
GET    /api/dashboard/summary
```

Role-aware: returns different fields depending on whether the signed-in user is a tenant, landlord/agency, or admin. See [Role-Aware Dashboard](Features-and-User-Stories#role-aware-dashboard).

## Auth

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
PUT    /api/auth/me
PUT    /api/auth/password
```

## Properties

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

## Favorites

```text
GET    /api/favorites
POST   /api/favorites/:propertyId
DELETE /api/favorites/:propertyId
```

## Reviews

```text
POST   /api/reviews
GET    /api/reviews/mine                                  landlord, agency
PUT    /api/reviews/:id/response                          landlord, agency property owner only
GET    /api/properties/:id/reviews
```

## Inquiries

```text
GET    /api/inquiries                                        tenant (their own sent inquiries)
POST   /api/inquiries                                         tenant
PUT    /api/inquiries/:id
GET    /api/properties/:id/inquiries                          landlord, agency (per property)
GET    /api/inquiries/received                                landlord, agency (across all their properties)
```

## Viewings

```text
GET    /api/viewings
POST   /api/viewings
GET    /api/viewings/received                                landlord, agency (across all their properties)
PUT    /api/viewings/:id/status
GET    /api/properties/:id/viewings                          landlord, agency (per property)
```

## Notifications

```text
GET    /api/notifications
PUT    /api/notifications/read-all
PUT    /api/notifications/:id/read
```

## Saved searches

```text
POST   /api/saved-searches
GET    /api/saved-searches
DELETE /api/saved-searches/:id
```

## Device tokens (push notifications)

```text
POST   /api/device-tokens                                    upsert by token
DELETE /api/device-tokens                                    body: { token }
```

## Agencies

```text
POST   /api/agencies/verify
GET    /api/agencies/status
```

## Feedback

```text
POST   /api/feedback                                        tenant, landlord, agency, mover
GET    /api/feedback/mine
GET    /api/feedback/public                                  no auth required
```

## Admin

```text
GET    /api/admin/users
GET    /api/admin/users/:id
GET    /api/admin/users/:id/summary
GET    /api/admin/users/:id/status-history
PUT    /api/admin/users/:id/status
DELETE /api/admin/users/:id                                  full cascade delete; admin cannot target their own account
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

Admins have **no** listing-management capability anywhere in this API — no property, inquiry, or viewing-request routes are reachable by the admin role. See [Admin User Management](Features-and-User-Stories#admin-user-management).

## Movers

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

## Mover requests

```text
GET    /api/mover-requests                                     tenant (their own sent requests)
POST   /api/mover-requests                                     tenant (requires homeSize; accepts optional pickupLat/pickupLng)
GET    /api/mover-requests/received                            mover (across all requests to them)
PUT    /api/mover-requests/:id/status                          tenant (cancel only) or the receiving mover
```

Responses for all four routes above include a `distanceKm`/`priceEstimate` pair — computed on read from the current pickup/property location and the request's `homeSize`, never persisted, so neither figure can go stale if a mover's base price changes later.

`pickupLat`/`pickupLng` (both optional) capture the tenant's device location at request time. Every mover-request response includes a computed `distanceKm` whenever both that pickup point and the destination property's coordinates are available — it's never stored, so it can't go stale if a property's location changes.

## Manual testing with Insomnia

1. Import `docs/kejaapp-insomnia.json` into [Insomnia](https://insomnia.rest/).
2. Select the `Base Environment`, confirm `base_url` is `http://localhost:5000`.
3. Register or log in, copy the returned token into the `token` environment variable.
4. After creating resources, copy returned ids into the matching environment variables (`property_id`, `image_id`, `inquiry_id`, `viewing_id`, `notification_id`, `verification_id`).
5. Use the grouped requests for Auth, Properties, Favorites, Reviews, Inquiries, Viewings, Notifications, Agencies, Feedback, Admin, Movers, and Mover requests.
