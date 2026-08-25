# Authentication Flow Guide

This document describes the complete authentication implementation in KejaApp, including frontend and backend integration.

## Overview

KejaApp uses JWT (JSON Web Token) authentication with HTTP-only refresh token cookies. The auth flow is fully integrated between the React frontend and Node.js/Express backend.

## Frontend Authentication

**Rewritten to match the current httpOnly-cookie architecture** — the session moved off `localStorage` entirely in the "Migrate web auth from localStorage to httpOnly cookies + CSRF tokens" change (see `CHANGELOG.md`); an earlier version of this section still described the pre-migration Bearer/localStorage flow.

### Architecture

Auth state (`signedIn`/`currentUser`) and session bootstrapping live in `frontend/src/App.jsx`; the sign-in/register form itself is a separate component, `frontend/src/components/AuthModal.jsx`; and both are made available to every page without prop-drilling via `frontend/src/context/AuthContext.jsx`. Helper functions live split by concern in `frontend/app-utils/` — `client.js` (`apiFetch`, CSRF token handling), `api.js` (`registerUser`/`loginUser`/`logoutUser`/`fetchCurrentUser`/`updateCurrentUser`/`changeCurrentUserPassword`/`deleteCurrentAccount`/`loginWithGoogle`, and every other endpoint call). `frontend/app-utils.js` still exists too, but only as a ~10-line barrel re-exporting all of `app-utils/*` for backward compatibility — the real logic isn't there.

**Key state in `App.jsx`:**
```javascript
const [signedIn, setSignedIn] = useState(false);
const [currentUser, setCurrentUser] = useState(null);
const [authPanelOpen, setAuthPanelOpen] = useState(false);
```

`signedIn` starts `false` unconditionally — the session lives entirely in an httpOnly cookie, invisible to JS, so there's no client-side value to seed it from. `App.jsx` runs a session-restore effect **once on mount** (empty dependency array) that unconditionally calls `fetchCurrentUser()` and lets a `401` answer whether a session exists, rather than checking anything client-side first. It owns `handleAuthenticated(user)`/`handleLogout()`, renders `<AuthModal onClose={...} onAuthenticated={handleAuthenticated} />` only while `authPanelOpen` is true, and wraps the app in `<AuthProvider signedIn={signedIn} currentUser={currentUser} openAuthPanel={openAuthPanel} setCurrentUser={setCurrentUser}>` so any page can read auth state via `useAuth()` instead of receiving it as props.

**`AuthContext.jsx`** is a thin pass-through — it does not own any state itself, just makes `App.jsx`'s state available via `useAuth()`:
```javascript
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
```

### Auth Modal (`AuthModal.jsx`)

A self-contained component (own `authMode`/`authError`/`authLoading`/`authForm`/`confirmPassword`/`showPassword`/`usernameSuggestions` state — none of it lives in `App.jsx`), rendered by `App.jsx` only while the panel is open. Props: `{ onClose, onAuthenticated }`.

1. **Sign in tab** — email-or-username input (sent as `identifier`), password, a `<GoogleSignInButton />` alongside the password form, sign-in button → `loginUser()`.
2. **Register tab** — name, free-text username (on a `409` conflict, `usernameSuggestions` renders as clickable chips), optional phone, role selector (tenant/landlord/agency/mover), email, password + confirm-password, register button → `registerUser()`.

On success, `AuthModal` calls `onAuthenticated(payload.user)` — it does not set `signedIn`/`currentUser` itself; `App.jsx`'s `handleAuthenticated` does that and closes the panel.

### API Helper Functions (`frontend/app-utils/api.js`)

No function here ever touches a client-side token — the server sets the session cookie directly on the response, and `apiFetch` (`client.js`) sends it automatically via `credentials: "include"` on every request.

```javascript
export const registerUser = async (userData) => {
  const response = await apiFetch("/api/auth/register", { method: "POST", body: userData });
  clearRequestCache();
  return response; // { user, token, refreshToken, tokenType, expiresIn, csrfToken }
};

export const loginUser = async (credentials) => {
  const response = await apiFetch("/api/auth/login", { method: "POST", body: credentials });
  clearRequestCache();
  return response;
};

export const fetchCurrentUser = async () => {
  const response = await apiFetch("/api/auth/me", { method: "GET" });
  return response.user;
};

export const logoutUser = async () => {
  await apiFetch("/api/auth/logout", { method: "POST" });
  clearRequestCache();
  setCsrfToken("");
};
```

`token`/`refreshToken` are still present in the register/login response body (mobile reads them from there and stores them via `expo-secure-store`, since it has no cookie jar), but web never reads or stores them — it only uses `csrfToken` from that same body, via `setCsrfToken()`, to prime the value it needs to echo back on the next mutation.

### CSRF token handling (`client.js`)

`apiFetch` keeps the current CSRF token in an in-memory module variable (not `localStorage` — it's re-learned from a response body, not read from a client-readable cookie), attaching it as an `X-CSRF-Token` header on every state-changing request. If a request 403s with `code: "CSRF_MISMATCH"` (e.g. a stale tab whose in-memory copy no longer matches after a login/register in another tab), `apiFetch` re-fetches `GET /api/auth/me` to relearn the current token and retries the original request once automatically — see `docs/Authentication.md`'s CSRF section for the full mechanism.

### User Session Loading (`App.jsx`)

```javascript
useEffect(() => {
  let active = true;

  const loadUser = async () => {
    try {
      const user = await fetchCurrentUser();
      if (active) {
        setSignedIn(true);
        setCurrentUser(user);

        if (path === "/") {
          navigate(getViewPath(user.roleConfirmed === false ? "selectRole" : getDefaultViewForRole(user.role)));
        }
      }
    } catch {
      if (active) {
        setSignedIn(false);
        setCurrentUser(null);
        setAuthPanelOpen(false);
      }
    }
  };

  loadUser();
  return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once on mount only
}, []);
```

A restored session landing on the bare root path is redirected to its role's default view (`/` always resolves to `discover` otherwise) — unless `roleConfirmed` is `false` (first sign-in after Google Sign-In, see below), which forces the role-picker screen regardless of path.

### Logout Flow (`App.jsx`)

```javascript
const handleLogout = async () => {
  try {
    await logoutUser();
  } catch {
    // Ignore failure and clear local auth state anyway
  }

  setSignedIn(false);
  setCurrentUser(null);
  setAuthPanelOpen(false);
  navigate(getViewPath("discover"));
};
```

## Backend Authentication

### API Endpoints

#### POST `/api/auth/register`
Register a new user with role selection. `username` is free text chosen by the user (no character restrictions, just non-blank after trimming) — it is not generated by the backend.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "username": "johnkamau",
  "password": "SecurePassword123!",
  "phone": "+254712345678",
  "role": "tenant"
}
```

**Response (201):** same shape as `POST /api/auth/login`'s response below.

**Response (409) — username already taken:**
```json
{
  "message": "Username is already taken",
  "suggestions": ["johnkamau284", "johnkamau1093", "johnkamau562"]
}
```
`suggestions` is an array of up to 3 available alternatives (the requested username plus different random number suffixes) the client can offer the user instead of resubmitting blind. This works via `ApiError`'s optional third constructor argument (`details`), which the central error handler (`backend/middlewares/errorMiddleware.js`) spreads into the JSON response alongside `message` — the same mechanism any future endpoint can reuse to attach structured extra data to an error.

`username` is immutable after registration — there is no endpoint to change it. Accounts created before this feature existed are backfilled with an auto-generated opaque username (e.g. `swiftcheetah284` — an adjective, a noun, and a number, not derived from the account's name or email) by `backend/seeders/backfillUsernames.js`, since there's no user to ask.

#### POST `/api/auth/login`
Login with either the account's email or its assigned username, plus the password. The request body key is `identifier`, not `email`.

**Request:**
```json
{
  "identifier": "john@example.com",
  "password": "SecurePassword123!"
}
```
or equivalently:
```json
{
  "identifier": "johnkamau",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johnkamau",
    "role": "tenant",
    "roleConfirmed": true,
    "phone": "+254712345678"
  },
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "tokenType": "Bearer",
  "expiresIn": "7d",
  "csrfToken": "..."
}
```
Register's response carries the same shape (`201` instead of `200`). Both also set the `keja_token`/`keja_refresh`/`keja_csrf` cookies on the response directly — `token`/`refreshToken` in the body are for mobile (no cookie jar, stores them via `expo-secure-store`); `csrfToken` is what web reads to prime `client.js`'s in-memory CSRF value.

#### GET `/api/auth/me`
Fetch the current authenticated user. Accepts either an `Authorization: Bearer <token>` header (mobile) or the httpOnly session cookie (web) — see `protect` in `backend/middlewares/authMiddleware.js`.

**Response (200):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johnkamau",
    "role": "tenant",
    "roleConfirmed": true,
    "phone": "+254712345678"
  },
  "csrfToken": "..."
}
```
`csrfToken` is only present when the request carried the CSRF cookie (i.e. a web session) — this is how `App.jsx`'s session-restore call relearns the value after a page reload resets `client.js`'s in-memory copy.

#### POST `/api/auth/logout`
Revokes the current refresh session and clears the auth/refresh/CSRF cookies. Same auth acceptance as `GET /api/auth/me` above.

**Response (200):**
```json
{
  "message": "Logged out"
}
```

**Other endpoints** (`POST /api/auth/google`, `PUT /api/auth/me`, `PUT /api/auth/role`, `PUT /api/auth/password`, `DELETE /api/auth/me`) are listed in [docs/Authentication.md](https://github.com/Abdurleone/kejaapp/blob/main/docs/dev/Authentication.md) rather than duplicated here.

### Role-Based Access Control

The backend enforces role-based access:

- **tenant**: Can view properties, save favorites, inquire about properties, request movers
- **landlord**: Can manage own properties, view inquiries, add property images
- **agency**: Can manage properties, view inquiries, manage clients, submit for verification
- **mover**: Can manage their own business profile, submit for verification, respond to service requests — does not browse property listings
- **admin**: Can access admin console, moderate violations, verify agencies/movers

Protected endpoints check the user's role (`backend/middlewares/authMiddleware.js`):
```javascript
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized for this resource");
  }
  next();
};

const authorizeGroup = (roles) => authorize(...roles);
```
`authorize` takes roles as variadic arguments (`authorize("admin")`), not a single array; `authorizeGroup` is the array-taking wrapper around it, for call sites that already have a role list as a value.

## Frontend Role-Based Navigation

### Navigation Filtering

Navigation items are filtered based on user role:

```javascript
const navigationItems = navItems.filter((item) => 
  canAccessView(currentUser?.role, item.view)
);
```

### Access Rules

`roleViewAccess` (in `frontend/app-utils/access.js`) is a per-role allow-list of views, also used by `getDefaultViewForRole` to pick where a role lands after signing in (its first entry):

```javascript
const roleViewAccess = {
  tenant: ["dashboard", "discover", "saved", "movers", "notifications", "feedback", "account"],
  landlord: ["dashboard", "owner", "movers", "notifications", "feedback", "account"],
  agency: ["dashboard", "owner", "movers", "notifications", "feedback", "account"],
  mover: ["dashboard", "movers", "notifications", "feedback", "account"],
  admin: ["dashboard", "admin", "notifications", "feedback", "account"],
};

export const canAccessView = (role, view) => {
  // selectRole/dataProtection are reachable regardless of role, same as the
  // other always-on legal pages - selectRole is forced by App.jsx whenever
  // the signed-in user's role isn't confirmed yet (first sign-in after
  // Google Sign-In).
  if (["privacy", "terms", "dataProtection", "deleteAccount", "selectRole", "support"].includes(view)) return true;
  if (!role) return ["discover", "movers"].includes(view);
  return Boolean(roleViewAccess[role]?.includes(view));
};
```

### Protected Route Guards

```javascript
case "saved":
  if (!signedIn) {
    return (
      <div className="panel">
        <p className="muted-copy">Sign in to see your saved rentals...</p>
      </div>
    );
  }
  return <SavedPage {...props} />;

case "owner":
  if (!signedIn || !canAccessView(currentUser?.role, "owner")) {
    return (
      <div className="panel">
        <p className="muted-copy">You need an owner or agency account...</p>
      </div>
    );
  }
  return <WorkspacePage {...props} />;
```

## Testing

### Unit Tests

Frontend auth helpers are tested in `frontend/tests/api-helpers.test.js`:
- CSRF token handling (attaching, learning from a response body, clearing on logout, re-sync-and-retry-once on a `CSRF_MISMATCH` 403, never retrying a genuine permission 403)
- API URL building
- API helper exports

`frontend/tests/auth-modal.render.test.jsx` and `frontend/tests/auth-context.render.test.jsx` cover the `AuthModal`/`AuthContext` components directly.

### Integration Tests

End-to-end auth flow is tested in `frontend/tests/auth-flow.integration.test.js`, against the real session cookie the backend sets (not a bearer token):
- User registration with role selection
- Fetch current user from the session cookie set at registration
- User login with email/password
- Save/fetch/remove a favorite property (authenticated)
- Logout, and that it clears the session
- Missing-field and invalid-credentials rejection
- Protected route access prevention with no session

**Run integration tests:**
```bash
cd frontend
node --test tests/auth-flow.integration.test.js
```

**Run all frontend tests:**
```bash
npm run test:frontend
```

## Security Considerations

### Token Storage

- Web never stores a token client-side at all — the session lives entirely in an httpOnly cookie the browser attaches automatically (`credentials: "include"`); JS can't read or write it.
- Mobile (no cookie jar) stores the JWT via `expo-secure-store`, sent as an `Authorization: Bearer` header on every request instead.
- Refresh tokens are stored server-side as hashes only (`AuthSession` model), never in plain text; the raw refresh token itself lives in an httpOnly cookie (web) or `expo-secure-store` (mobile).
- Both cookies are cleared on logout and on a failed session-restore.

### Password Security

- Passwords hashed with bcrypt on backend
- Minimum password requirements enforced
- Passwords never sent in responses or logs

### CORS Configuration

`backend/config/cors.js` reads allowed origins from the `CORS_ORIGIN` env var (comma-separated), not a hardcoded list. If it's unset, the policy fails closed in production (no origin is allowed) and stays permissive in development/test, so a missing `.env` value can't silently produce an unrestricted, credentialed CORS policy in production:

```javascript
export const isAllowedCorsOrigin = (origin, { nodeEnv = env.nodeEnv, corsOrigins = env.corsOrigins } = {}) => {
  if (!origin) return true;

  if (corsOrigins.length === 0) {
    return nodeEnv !== "production";
  }

  return corsOrigins.includes(origin);
};
```

### CSRF Protection

`authMiddleware.protect()` accepts either an `Authorization: Bearer` header (mobile) or the httpOnly session cookie (web). That cookie is `sameSite: "none"` on the cross-origin docker-compose/Kubernetes deployments, or `sameSite: "lax"` on the consolidated same-origin Render production deployment (`authCookieSameSite` in `backend/config/env.js`) — either way it rides along on requests automatically, and `"none"` specifically rides along on cross-site ones too, the classic CSRF setup. `backend/middlewares/csrfProtection.js` closes this for state-changing requests (`POST`/`PUT`/`PATCH`/`DELETE`), applied uniformly regardless of deployment shape:

- **Mobile**: a real `Authorization: Bearer` header is proof enough — a forged cross-site request has no way to read the token to construct one.
- **Web**: mobile has no cookie for this, but web does — a matching `X-CSRF-Token` header plus the `keja_csrf` cookie. That cookie is deliberately **not** httpOnly, so frontend JS can read it and echo it back as a header; a forged request gets the cookie for free but can never read its value to also send it as a header (Same-Origin Policy).

The session cookie alone — of either kind — is only ever trusted for safe (`GET`) requests. The one exception is `POST /api/auth/refresh`: it never has a valid access token to send as a header (that's the whole reason it's being called), so it instead trusts a refresh token supplied in the request body, equally unforgeable cross-site but not requiring a header.

### Auth Middleware

All protected endpoints validate:
1. `Authorization: Bearer` header **or** session cookie presence
2. Token validity (JWT signature)
3. Token expiration
4. User role authorization
5. For state-changing requests, proof against CSRF specifically (see CSRF Protection above) — the session cookie alone only works for `GET` requests

## Troubleshooting

### Session Not Persisting

If a user appears signed out after a page reload:
1. Confirm the `keja_token`/`keja_refresh` cookies are actually being set (browser devtools → Application/Storage → Cookies) — `httpOnly` cookies won't show up via `document.cookie`, only in devtools.
2. Check `AUTH_COOKIE_SECURE`/`AUTH_COOKIE_SAME_SITE` in the backend's env — a `secure: true` cookie is silently dropped by the browser over plain HTTP.
3. Verify `fetchCurrentUser()`'s request actually includes `credentials: "include"` and isn't being blocked by CORS (see below).

### 401 Unauthorized Errors

If getting 401 errors on protected routes:
1. Web: confirm the session cookie is present and unexpired (see above) — there's no client-side token to inspect.
2. Mobile: verify a token exists in `expo-secure-store` and is attached as `Authorization: Bearer <token>`.
3. Check the token hasn't expired (`JWT_EXPIRES_IN`).
4. Check the user's role has permission for the endpoint (see Role-Based Access Control above).

### CORS Errors

If getting CORS errors:
1. Verify frontend URL matches CORS whitelist in backend
2. Check `credentials: "include"` in fetch options
3. Verify cookies are being sent/received

## Future Enhancements

- [ ] Add password reset flow
- [x] Add OAuth2 / social auth integration — Google Sign-In only (`POST /api/auth/google`, see `docs/Authentication.md`); no other provider added. Live in production on backend + web; mobile's code is merged but paused pending the account owner's own Google Cloud Console + EAS credentials setup.
- [ ] Add multi-factor authentication (MFA)
- [ ] Add session timeout and automatic refresh
- [ ] Add device/browser-based auth limits
- [ ] Add login history and security audit log
