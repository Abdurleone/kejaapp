# Authentication Flow Guide

This document describes the complete authentication implementation in KejaApp, including frontend and backend integration.

## Overview

KejaApp uses JWT (JSON Web Token) authentication with HTTP-only refresh token cookies. The auth flow is fully integrated between the React frontend and Node.js/Express backend.

## Frontend Authentication

### Architecture

Auth state (`signedIn`/`currentUser`) and session bootstrapping live in `frontend/src/App.jsx`; the sign-in/register form itself is a separate component, `frontend/src/components/AuthModal.jsx`; and both are made available to every page without prop-drilling via `frontend/src/context/AuthContext.jsx`. Helper functions (the actual API calls, token storage) live in `frontend/app-utils.js`.

**Key state in `App.jsx`:**
```javascript
const [signedIn, setSignedIn] = useState(Boolean(localStorage.getItem("keja_token")));
const [currentUser, setCurrentUser] = useState(null);
const [authPanelOpen, setAuthPanelOpen] = useState(false);
```

`App.jsx` runs the session-restore effect (calls `fetchCurrentUser()` whenever `signedIn` flips true, falling back to signed-out on failure) and owns `handleAuthenticated(user)`/`handleLogout()`. It renders `<AuthModal onClose={closeAuthPanel} onAuthenticated={handleAuthenticated} />` only while `authPanelOpen` is true, and wraps the whole app in `<AuthProvider signedIn={signedIn} currentUser={currentUser} openAuthPanel={openAuthPanel}>` so any page can read auth state via a `useAuth()` hook instead of receiving it as props.

**`AuthContext.jsx`** is a thin pass-through — it does not own any state itself, just makes `App.jsx`'s `signedIn`/`currentUser`/`openAuthPanel` available via `useAuth()`:
```javascript
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
```

### Auth Modal (`AuthModal.jsx`)

A self-contained component (own `authMode`/`authError`/`authLoading`/`authForm`/`usernameSuggestions` state — none of it lives in `App.jsx`), rendered by `App.jsx` only while the panel is open. Props: `{ onClose, onAuthenticated }` — since it's only ever mounted fresh (`authPanelOpen && <AuthModal ... />`), there's no need to reset its state on close; unmounting does that for free.

1. **Sign in tab**
   - Email-or-username input (`authForm.email`, sent as `identifier`)
   - Password input
   - Sign in button
   - Leads to `loginUser()` API call

2. **Register tab**
   - Name input
   - Username input (free text; on a `409` conflict, `usernameSuggestions` is populated and rendered as clickable chips that fill the field)
   - Phone input (optional)
   - Role selector (tenant, landlord, agency, mover)
   - Email input
   - Password input
   - Register button
   - Leads to `registerUser()` API call

On success, `AuthModal` calls `onAuthenticated(payload.user)` — it does not set `signedIn`/`currentUser` itself; `App.jsx`'s `handleAuthenticated` does that and closes the panel.

### API Helper Functions

All auth functions are in `frontend/app-utils.js`:

#### `registerUser(userData)`
```javascript
export const registerUser = async (userData) => {
  const response = await apiFetch("/api/auth/register", {
    method: "POST",
    body: userData,  // { name, email, username, password, phone, role }
  });
  setAuthToken(response.token);
  return response;  // { user, token, refreshToken }
};
```

#### `loginUser(credentials)`
```javascript
export const loginUser = async (credentials) => {
  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    body: credentials,  // { identifier, password } — identifier is either the account's email or its chosen username
  });
  setAuthToken(response.token);
  return response;  // { user, token, refreshToken }
};
```

#### `fetchCurrentUser()`
```javascript
export const fetchCurrentUser = async () => {
  const response = await apiFetch("/api/auth/me", { method: "GET" });
  return response.user;
};
```

#### `logoutUser()`
```javascript
export const logoutUser = async () => {
  await apiFetch("/api/auth/logout", { method: "POST" });
  setAuthToken("");
};
```

### Token Management

Tokens are stored in localStorage:

```javascript
const authTokenKey = "keja_token";

export const getAuthToken = () => localStorage.getItem(authTokenKey) || "";
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(authTokenKey, token);
  } else {
    localStorage.removeItem(authTokenKey);
  }
};
```

### Bearer Token Injection

All API requests automatically include the bearer token:

```javascript
export const apiFetch = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});

  if (getAuthToken()) {
    headers.set("Authorization", `Bearer ${getAuthToken()}`);
  }
  
  // ... rest of fetch logic
};
```

### User Session Loading (`App.jsx`)

Whenever `signedIn` flips true (on mount, if a token is already in `localStorage`; or right after login/register), the current user is fetched. A restored session landing on the bare root path also gets redirected to its role's default view, since `/` always resolves to `discover` otherwise:

```javascript
useEffect(() => {
  let active = true;

  const loadUser = async () => {
    if (!signedIn) {
      setCurrentUser(null);
      return;
    }

    try {
      const user = await fetchCurrentUser();
      if (active) {
        setCurrentUser(user);
        if (path === "/") navigate(getViewPath(getDefaultViewForRole(user.role)));
      }
    } catch {
      setSignedIn(false);
      setCurrentUser(null);
      setAuthPanelOpen(false);
    }
  };

  loadUser();
  return () => { active = false; };
}, [signedIn]);
```

### Auth Form Submission (`AuthModal.jsx`)

Lives in the `AuthModal` component now, not `App.jsx` — it reports the result back via `onAuthenticated` instead of touching `signedIn`/`currentUser` directly:

```javascript
const handleAuthSubmit = async (event) => {
  event.preventDefault();
  setAuthLoading(true);
  setAuthError("");
  setUsernameSuggestions([]);

  try {
    const payload = authMode === "login"
      ? await loginUser({ identifier: authForm.email, password: authForm.password })
      : await registerUser(authForm);

    onAuthenticated(payload.user);
  } catch (err) {
    setAuthError(err.message || "Authentication failed");
    setUsernameSuggestions(err.suggestions || []);
  } finally {
    setAuthLoading(false);
  }
};
```

`App.jsx`'s `handleAuthenticated(user)` (passed as the `onAuthenticated` prop) is what actually sets `currentUser`/`signedIn`, closes the panel, and navigates to the new user's default view.

### Logout Flow (`App.jsx`)

```javascript
const handleLogout = async () => {
  try {
    await logoutUser();
  } catch (err) {
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

**Response (201):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johnkamau",
    "role": "tenant",
    "phone": "+254712345678"
  },
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

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
    "phone": "+254712345678"
  },
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### GET `/api/auth/me`
Fetch current authenticated user (requires bearer token).

**Headers:**
```
Authorization: Bearer <token>
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
    "phone": "+254712345678"
  }
}
```

#### POST `/api/auth/logout`
Logout current user (requires bearer token).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Logged out"
}
```

### Role-Based Access Control

The backend enforces role-based access:

- **tenant**: Can view properties, save favorites, inquire about properties, request movers
- **landlord**: Can manage own properties, view inquiries, add property images
- **agency**: Can manage properties, view inquiries, manage clients, submit for verification
- **mover**: Can manage their own business profile, submit for verification, respond to service requests — does not browse property listings
- **admin**: Can access admin console, moderate violations, verify agencies/movers

Protected endpoints check the user's role:
```javascript
const authorize = (allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, "Insufficient permissions");
  }
  next();
};
```

## Frontend Role-Based Navigation

### Navigation Filtering

Navigation items are filtered based on user role:

```javascript
const navigationItems = navItems.filter((item) => 
  canAccessView(currentUser?.role, item.view)
);
```

### Access Rules

`roleViewAccess` (in `frontend/app-utils.js`) is a per-role allow-list of views, also used by `getDefaultViewForRole` to pick where a role lands after signing in (its first entry):

```javascript
const roleViewAccess = {
  tenant: ["dashboard", "discover", "saved", "movers", "notifications", "feedback", "account"],
  landlord: ["dashboard", "owner", "movers", "notifications", "feedback", "account"],
  agency: ["dashboard", "owner", "movers", "notifications", "feedback", "account"],
  mover: ["dashboard", "movers", "notifications", "feedback", "account"],
  admin: ["dashboard", "admin", "notifications", "feedback", "account"],
};

export const canAccessView = (role, view) => {
  if (["privacy", "terms", "deleteAccount"].includes(view)) return true;
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
- Token management (get/set in localStorage)
- API URL building
- Auth header injection
- API helper exports

### Integration Tests

End-to-end auth flow is tested in `frontend/tests/auth-flow.integration.test.js`:
- User registration with role selection
- User login with email/password
- Fetch current user with bearer token
- Save property as favorite (authenticated)
- Fetch favorites list
- Remove favorite property
- Invalid credentials rejection
- Protected route access prevention

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

- Access tokens (JWT) stored in localStorage for easy access
- Refresh tokens stored in HTTP-only cookies for additional security
- Tokens cleared on logout and auth failure

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

`authMiddleware.protect()` accepts either an `Authorization` header or the httpOnly session cookie — and that cookie is `sameSite: "none"` in production (frontend and backend are on different origins there), so it's sent on cross-site requests too, the classic CSRF setup. `backend/middlewares/csrfProtection.js` closes this: state-changing requests (`POST`/`PUT`/`PATCH`/`DELETE`) require the `Authorization` header, which every real client here already sends on every authenticated call. The cookie stays valid for safe (`GET`) requests; it just stops being trusted alone for mutations, which a forged cross-site request has no way to supply (it can't read the token to put it in a header).

The one exception is `POST /api/auth/refresh` — it never has a valid access token to send as a header (that's the whole reason it's being called), so it instead trusts a refresh token supplied in the request body, which is equally unforgeable cross-site (an attacker can't read or guess it) but doesn't require a header.

### Auth Middleware

All protected endpoints validate:
1. Bearer token presence
2. Token validity (JWT signature)
3. Token expiration
4. User role authorization
5. For state-changing requests, the `Authorization` header specifically (see CSRF Protection above) — the cookie fallback only works for `GET` requests

## Troubleshooting

### Token Not Persisting

If auth token isn't saved after login:
1. Check browser localStorage for `keja_token`
2. Verify `setAuthToken()` is called after successful login
3. Check for localStorage being disabled in browser

### 401 Unauthorized Errors

If getting 401 errors on protected routes:
1. Verify token exists: `console.log(localStorage.getItem('keja_token'))`
2. Check token format in request headers
3. Verify token hasn't expired
4. Check user role has permission for endpoint

### CORS Errors

If getting CORS errors:
1. Verify frontend URL matches CORS whitelist in backend
2. Check `credentials: "include"` in fetch options
3. Verify cookies are being sent/received

## Future Enhancements

- [ ] Add password reset flow
- [ ] Add OAuth2 / social auth integration
- [ ] Add multi-factor authentication (MFA)
- [ ] Add session timeout and automatic refresh
- [ ] Add device/browser-based auth limits
- [ ] Add login history and security audit log
