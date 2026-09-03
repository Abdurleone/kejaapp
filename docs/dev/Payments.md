# Payments

KejaApp has exactly one payment integration: **Support KejaApp**, a voluntary M-Pesa service charge a signed-in user can optionally pay directly to the app's developer. It is unrelated to rent, deposits, agency fees, or mover charges — see the README's [Payment Boundary](../../README.md#payment-boundary), which this feature does not cross. KejaApp never holds, routes, or takes a cut of money between users; this is a separate, one-directional payment from a user to the app operator.

## Why STK push, not custody

Safaricom's M-Pesa STK push ("Lipa Na M-Pesa Online") always credits whoever owns the paybill/till shortcode the request is made against — there's no way to have a tenant's STK push land directly in an arbitrary third party's account. That constraint is exactly why this feature is scoped the way it is: it only ever pays the app operator's own shortcode, never a landlord/agency/mover's. A genuinely non-custodial "pay my landlord via M-Pesa" feature would need each landlord to register and configure their own Daraja API credentials — real friction most individual landlords wouldn't have, and out of scope here.

## National Payment System Act applicability

Kenya's **National Payment System Act, 2011** requires a **Payment Service Provider (PSP)** to be authorized by the Central Bank of Kenya (§12: "No person shall, in Kenya conduct the business of a payment service provider except an authorized payment service provider"). This doesn't apply to KejaApp: the Act's own definition of "payment service provider" is about *acting as provider* of payment infrastructure — sending, receiving, storing, or processing payments *for others*, or operating the underlying payment system itself. Support KejaApp does neither. It triggers Safaricom's own STK push API against KejaApp's own paybill/till — Safaricom (the licensed PSP and designated payment system operator behind M-Pesa) is the entity actually moving the money; KejaApp is simply the beneficiary of its own transaction, in exactly the same position as any ordinary Kenyan business that accepts M-Pesa payments at a till number without holding its own CBK authorization. If KejaApp ever began processing or routing payments *between* other users — which the [Payment Boundary](../../README.md#payment-boundary) already rules out as a permanent product decision, not a future roadmap item — this assessment would need revisiting from scratch.

## Flow

`POST /api/support-payments` (authenticated)

```json
{ "phoneNumber": "0712345678", "amount": 100 }
```

1. `phoneNumber` is normalized to Daraja's required `2547XXXXXXXX`/`2541XXXXXXXX` shape (`utils/phone.js`'s `normalizeKenyanPhone`) and `amount` validated (1–150,000 KES, whole shillings only).
2. The backend calls Daraja's OAuth endpoint for an access token (cached ~1hr, `services/mpesaService.js`), then initiates the STK push. This only confirms Safaricom *accepted the request* — not that the user actually paid.
3. A `SupportPayment` record is created with `status: "pending"` and Safaricom's own `CheckoutRequestID`.
4. The user's phone shows the M-Pesa PIN prompt. The frontend (`SupportPage.jsx`) polls `GET /api/support-payments/:id` every 3s (up to 90s) for the final status.
5. Safaricom calls back to `MPESA_CALLBACK_URL` (`POST /api/support-payments/callback/:secret`, public — no auth, since Safaricom's servers carry none of kejaapp's own cookies) with the real result, looked up by `CheckoutRequestID` and used to update the record to `completed`/`failed`/`cancelled` (`ResultCode` 1032 specifically means the user dismissed the prompt, distinguished from a genuine failure). The `:secret` path segment must match `MPESA_CALLBACK_SECRET` — Daraja callbacks carry no signature of their own, and `CheckoutRequestID` can't double as that check since it's returned to the paying user themselves in step 3's response (see the Security Audit entry in `CHANGELOG.md`).

Same "empty = disabled" convention as `REDIS_URL`/`CLAMAV_HOST`/`VAPID_*`/`GOOGLE_CLIENT_ID`: with any of `MPESA_CONSUMER_KEY`/`MPESA_CONSUMER_SECRET`/`MPESA_SHORTCODE`/`MPESA_PASSKEY`/`MPESA_CALLBACK_URL` unset, `POST /api/support-payments` 503s instead of calling Daraja with empty credentials. `MPESA_CALLBACK_SECRET` is the one exception with teeth, same as `STORAGE_DRIVER=s3`'s `S3_*` group: once the other four are set, it's required and validated eagerly at startup, not just silently skipped.

## First-time setup

1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke) and create an app under "My Apps", selecting the **Lipa Na M-Pesa Sandbox** product — this gives a free **sandbox** consumer key/secret unique to that app immediately, no business onboarding needed to start building against it. The app's own Shortcode/Passkey fields commonly show `N/A` - that's expected, not a setup error: unlike the consumer key/secret, these two are fixed constants shared by every sandbox app, not per-app values, so they never populate there. Use `174379` (`MPESA_SHORTCODE`) and `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919` (`MPESA_PASSKEY`) directly - both are published in Safaricom's own docs, not secret. Sandbox STK pushes only work against Safaricom's own test phone number, `254708374149` - a push to a real personal number won't go through until production credentials replace all of the above.
2. A **real** paybill/till needs Safaricom's own business account onboarding (separate from the developer portal) before `MPESA_ENVIRONMENT=production` credentials exist - going live also issues app-specific production values for `MPESA_SHORTCODE`/`MPESA_PASSKEY`, replacing the shared sandbox constants above.
3. Generate a random `MPESA_CALLBACK_SECRET` (e.g. `openssl rand -hex 32`) and set `MPESA_CALLBACK_URL` to include it as the final path segment: `https://<host>/api/support-payments/callback/<the-secret>`. Register that full URL with Safaricom as the callback URL — this secret is never exposed to any client, unlike `CheckoutRequestID`.
4. Set in Render's dashboard (or local `.env` for dev) — see `backend/.env.example` for the full list: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL` (must be a full, publicly-reachable URL, with the secret path segment from step 3 — validated at startup, same as `S3_ENDPOINT`), `MPESA_CALLBACK_SECRET` (must match that same path segment), `MPESA_ENVIRONMENT` (`sandbox`/`production`), `MPESA_TRANSACTION_TYPE` (`CustomerPayBillOnline`/`CustomerBuyGoodsOnline`), `MPESA_ACCOUNT_REFERENCE`.
5. `MPESA_CALLBACK_URL` can't be `localhost` in production — Safaricom's own servers need to reach it directly.
