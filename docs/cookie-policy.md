# KejaApp Cookie Policy

## 1. Scope

This policy covers cookies and comparable browser/device storage (localStorage) used by KejaApp's web frontend. It supplements the [Data Protection Policy](data-protection-policy.md).

## 2. What KejaApp uses today

| Name | Type | Purpose | Storage | Lifetime |
|---|---|---|---|---|
| `keja_token` (configurable via `AUTH_COOKIE_NAME`) | HTTP-only cookie | Authenticates your session on each request | Browser cookie jar, never readable by page JavaScript | Session/short-lived, per `AUTH_COOKIE_MAX_AGE_DAYS` |
| `keja_refresh` (configurable via `REFRESH_COOKIE_NAME`) | HTTP-only cookie | Issues a new auth token without re-entering your password | Browser cookie jar, never readable by page JavaScript | Up to 30 days by default (`REFRESH_TOKEN_MAX_AGE_DAYS`), tied to a hashed session record server-side |
| Bearer token (mobile app / API clients) | Not a cookie — stored in the mobile app's local storage | Same authentication purpose as `keja_token`, for clients that don't use browser cookies | Device-local app storage | Until sign-out or expiry |
| `keja_base_url` | `localStorage` (not a cookie) | Lets a developer override the API base URL in local/dev environments | Browser `localStorage` | Until manually cleared |
| Theme preference (light/dark) | `localStorage` (not a cookie) | Remembers your light/dark mode choice across visits | Browser `localStorage` | Until manually cleared |

## 3. Categorization

Under both the ePrivacy/GDPR "strictly necessary" carve-out and equivalent Kenyan practice, every item above is a **strictly necessary** or **functional preference** cookie/storage item — none are used for advertising, cross-site tracking, or behavioral profiling:

- `keja_token` / `keja_refresh` are strictly necessary — the app cannot authenticate you without them.
- `keja_base_url` and the theme preference are functional preferences that improve your experience but aren't required for the core service to work.

Because none of these are advertising/tracking cookies, KejaApp does not currently show a cookie-consent banner — strictly necessary cookies are exempt from consent requirements under GDPR-equivalent frameworks, and the functional-preference items store no personal data (just a URL override or a UI preference).

## 4. If that changes

If KejaApp ever adds analytics, advertising, or cross-site tracking cookies, this policy will be updated first, and a consent mechanism (opt-in banner) will be added before any such cookie is set — consistent with the [Data Protection Policy](data-protection-policy.md)'s commitment to data minimization and purpose limitation.

## 5. Managing cookies yourself

You can clear `keja_token`/`keja_refresh` at any time by signing out (which also revokes the underlying server-side session) or by clearing your browser's cookies for the site, which will simply sign you out. Clearing `localStorage` resets your theme preference and any local dev API override back to default.

## 6. Contact

Questions about this policy: `privacy@kejaapp.com`.
