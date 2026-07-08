# Authentication Flow Guide

This document describes the complete authentication implementation in KejaApp, including frontend and backend integration.

## Overview

KejaApp uses JWT (JSON Web Token) authentication with HTTP-only refresh token cookies. The auth flow is fully integrated between the React frontend and Node.js/Express backend.

## Frontend Authentication

### Architecture

The frontend authentication is managed in `frontend/src/App.jsx` with helper functions in `frontend/app-utils.js`.

**Key State in App.jsx:**
```javascript
const [signedIn, setSignedIn] = useState(Boolean(localStorage.getItem("keja_token")));
const [currentUser, setCurrentUser] = useState(null);
const [authPanelOpen, setAuthPanelOpen] = useState(false);
const [authMode, setAuthMode] = useState("login");
const [authError, setAuthError] = useState("");
const [authLoading, setAuthLoading] = useState(false);
const [authForm, setAuthForm] = useState({
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "tenant",
});
```

### Auth Modal (Auth Panel)

The auth modal is rendered when `authPanelOpen` is true and provides two tabs:

1. **Sign in tab**
   - Email input
   - Password input
   - Sign in button
   - Leads to `loginUser()` API call

2. **Register tab**
   - Name input
   - Phone input (optional)
   - Role selector (tenant, landlord, agency)
   - Email input
   - Password input
   - Register button
   - Leads to `registerUser()` API call

### API Helper Functions

All auth functions are in `frontend/app-utils.js`:

#### `registerUser(userData)`
```javascript
export const registerUser = async (userData) => {
  const response = await apiFetch("/api/auth/register", {
    method: "POST",
    body: userData,  // { name, email, password, phone, role }
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
    body: credentials,  // { identifier, password } — identifier is either the account's email or its backend-assigned username
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

### User Session Loading

When the app loads or `signedIn` changes, the current user is fetched:

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
      }
    } catch (err) {
      setSignedIn(false);
      setCurrentUser(null);
      setAuthPanelOpen(false);
    }
  };

  loadUser();
  return () => { active = false; };
}, [signedIn]);
```

### Auth Form Submission

```javascript
const handleAuthSubmit = async (event) => {
  event.preventDefault();
  setAuthLoading(true);
  setAuthError("");

  try {
    const payload = authMode === "login"
      ? await loginUser({ identifier: authForm.email, password: authForm.password })
      : await registerUser(authForm);

    setCurrentUser(payload.user);
    setSignedIn(true);
    setAuthPanelOpen(false);
    setAuthForm({ name: "", email: "", password: "", phone: "", role: "tenant" });
  } catch (err) {
    setAuthError(err.message || "Authentication failed");
  } finally {
    setAuthLoading(false);
  }
};
```

### Logout Flow

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
Register a new user with role selection.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
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
    "username": "swiftcheetah284",
    "role": "tenant",
    "phone": "+254712345678"
  },
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

The `username` is generated by the backend (an adjective, a noun, and a number — not derived from the account's name or email) and is immutable; there is no endpoint to change it. Accounts created before this feature existed are backfilled by `backend/seeders/backfillUsernames.js`.

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
  "identifier": "swiftcheetah284",
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
    "username": "swiftcheetah284",
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
    "username": "swiftcheetah284",
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

- **tenant**: Can view properties, save favorites, inquire about properties
- **landlord**: Can manage own properties, view inquiries, add property images
- **agency**: Can manage properties, view inquiries, manage clients
- **admin**: Can access admin console, moderate violations, verify agencies

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

```javascript
export const canAccessView = (role, view) => {
  const accessMap = {
    discover: ["tenant", "landlord", "agency", "admin"],
    saved: ["tenant", "landlord", "agency", "admin"],
    owner: ["landlord", "agency", "admin"],
    admin: ["admin"],
  };
  return accessMap[view]?.includes(role) || false;
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

CORS is configured to allow frontend origin:
```javascript
const corsOrigins = [
  "http://localhost:5173",  // frontend dev
  "http://localhost:3000",  // frontend alt
];
```

### Auth Middleware

All protected endpoints validate:
1. Bearer token presence
2. Token validity (JWT signature)
3. Token expiration
4. User role authorization

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
