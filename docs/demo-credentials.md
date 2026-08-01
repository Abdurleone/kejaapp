# Demo credentials

This page is a separate, repo-local reference for the development/demo accounts created by `backend/seeders/seedDemoData.js`.

> Scope: local development, seed/demo data only. Do not use these credentials in production or for any real account.

## Shared password

All seeded demo accounts use the same password:

```text
password123
```

## Primary demo accounts

Use these as the stable, human-friendly demo identities for local testing:

| Email | Role | Notes |
|---|---|---|
| `tenant@example.com` | tenant | primary demo tenant |
| `agency@example.com` | agency | primary demo agency |
| `landlord@example.com` | landlord | primary demo landlord |
| `admin@example.com` | admin | admin account |
| `mover1@example.com` | mover | verified mover |

## Sign-in behavior

- You can sign in with either the account email or that account's generated username.
- The password for every seeded account is the same shared value above.
- The exact username values are generated during seeding and are not guaranteed to be stable across reseeds.
- The full seeded roster is defined in `backend/seeders/seedDemoData.js`; this page intentionally keeps only the stable primary examples for day-to-day testing.
