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
- Usernames are randomly generated only the first time an account is created: `upsertUsers()` in the seeder does a `findOne` by email first, and only assigns a new username via `generateUniqueUsername()` when no account exists yet — an existing account's username is left untouched on every subsequent reseed. So for a given database, once seeded, each demo account's username stays stable across reseeds; it just isn't predictable in advance for a database that hasn't been seeded yet (e.g. a fresh environment).
- The full seeded roster is defined in `backend/seeders/seedDemoData.js`; this page intentionally keeps only the stable primary examples for day-to-day testing.
