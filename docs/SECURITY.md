# Security Policy

## Supported Versions

JakezApp is developed on a single rolling `main` branch rather than versioned
releases. Only `main` is supported — please make sure you're testing against
the latest commit before reporting an issue.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, report it privately using GitHub's built-in flow:

1. Go to the [Security tab](../../../security) of this repository.
2. Click **"Report a vulnerability"** (or use this direct link:
   [../../../security/advisories/new](../../../security/advisories/new)).
3. Fill in as much detail as you can:
   - The affected component (backend API, frontend web app, or mobile app)
   - Steps to reproduce, or a proof-of-concept
   - The potential impact (e.g. data exposure, privilege escalation, auth
     bypass)

This keeps the report private between you and the maintainer until a fix is
available, instead of disclosing it publicly right away.

We'll do our best to acknowledge new reports promptly and to keep you
updated as the issue is investigated and resolved. Once a fix is released,
we'll credit the reporter in the advisory unless you'd prefer to stay
anonymous.

## Scope

This project handles user accounts, authentication (JWT + refresh tokens),
and rental-listing data for tenants, landlords, agencies, movers, and admins.
Reports involving any of the following are especially welcome:

- Authentication/authorization bypass (e.g. accessing another user's data,
  privilege escalation between roles)
- Injection vulnerabilities (NoSQL injection, XSS, etc.)
- Exposure of secrets, tokens, or password hashes
- Broken access control on any `/api/*` endpoint
- Sensitive data (tokens, credentials, PII) leaking into error reports sent
  to our error-tracking provider (Sentry) — see
  [Data Protection Policy §7](compliance/data-protection-policy.md#7-third-party-processors)

Out of scope: findings that require physical access to a user's device,
denial-of-service reports without a realistic exploitation path, and
issues in third-party dependencies that should be reported upstream
instead (though we're happy to hear about them too).
