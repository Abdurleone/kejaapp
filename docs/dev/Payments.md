# Payments

KejaApp has exactly one payment integration: **Support KejaApp**, a voluntary M-Pesa service charge a signed-in user can optionally pay directly to the app's developer. It is unrelated to rent, deposits, agency fees, or mover charges — see the README's [Payment Boundary](../../README.md#payment-boundary), which this feature does not cross. KejaApp never holds, routes, or takes a cut of money between users; this is a separate, one-directional payment from a user to the app operator.

## Why STK push, not custody

Safaricom's M-Pesa STK push ("Lipa Na M-Pesa Online") always credits whoever owns the paybill/till shortcode the request is made against — there's no way to have a tenant's STK push land directly in an arbitrary third party's account. That constraint is exactly why this feature is scoped the way it is: it only ever pays the app operator's own shortcode, never a landlord/agency/mover's. A genuinely non-custodial "pay my landlord via M-Pesa" feature would need each landlord to register and configure their own Daraja API credentials — real friction most individual landlords wouldn't have, and out of scope here.

## Flow

`POST /api/support-payments` (authenticated)

```json
{ "phoneNumber": "0712345678", "amount": 100 }
```

1. `phoneNumber` is normalized to Daraja's required `2547XXXXXXXX`/`2541XXXXXXXX` shape (`utils/phone.js`'s `normalizeKenyanPhone`) and `amount` validated (1–150,000 KES, whole shillings only).
2. The backend calls Daraja's OAuth endpoint for an access token (cached ~1hr, `services/mpesaService.js`), then initiates the STK push. This only confirms Safaricom *accepted the request* — not that the user actually paid.
3. A `SupportPayment` record is created with `status: "pending"` and Safaricom's own `CheckoutRequestID`.
4. The user's phone shows the M-Pesa PIN prompt. The frontend (`SupportPage.jsx`) polls `GET /api/support-payments/:id` every 3s (up to 90s) for the final status.
5. Safaricom calls back to `MPESA_CALLBACK_URL` (`POST /api/support-payments/callback`, public — no auth, since Safaricom's servers carry none of kejaapp's own cookies) with the real result, looked up by `CheckoutRequestID` and used to update the record to `completed`/`failed`/`cancelled` (`ResultCode` 1032 specifically means the user dismissed the prompt, distinguished from a genuine failure).

Same "empty = disabled" convention as `REDIS_URL`/`CLAMAV_HOST`/`VAPID_*`/`GOOGLE_CLIENT_ID`: with any of `MPESA_CONSUMER_KEY`/`MPESA_CONSUMER_SECRET`/`MPESA_SHORTCODE`/`MPESA_PASSKEY`/`MPESA_CALLBACK_URL` unset, `POST /api/support-payments` 503s instead of calling Daraja with empty credentials.

## First-time setup

1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke) and create an app — this gives a free **sandbox** consumer key/secret and a shared test shortcode (`174379`) immediately, no business onboarding needed to start building against it.
2. A **real** paybill/till needs Safaricom's own business account onboarding (separate from the developer portal) before `MPESA_ENVIRONMENT=production` credentials exist.
3. Set in Render's dashboard (or local `.env` for dev) — see `backend/.env.example` for the full list: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL` (must be a full, publicly-reachable URL — validated at startup, same as `S3_ENDPOINT`), `MPESA_ENVIRONMENT` (`sandbox`/`production`), `MPESA_TRANSACTION_TYPE` (`CustomerPayBillOnline`/`CustomerBuyGoodsOnline`), `MPESA_ACCOUNT_REFERENCE`.
4. `MPESA_CALLBACK_URL` can't be `localhost` in production — Safaricom's own servers need to reach it directly.
