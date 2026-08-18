export const defaultApiBaseUrl = import.meta.env?.VITE_API_BASE_URL || "http://localhost:5000";

export const normalizeApiBaseUrl = (value) => {
  const baseUrl = String(value || "").trim() || defaultApiBaseUrl;
  return baseUrl.replace(/\/+$/, "");
};

export const createApiUrl = (path, baseUrl = defaultApiBaseUrl) => {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
};

// The auth session lives entirely in httpOnly cookies the backend sets/
// clears on login/register/logout/etc. (apiFetch's credentials: "include"
// sends them automatically) - nothing about the session token itself is
// ever readable by, or stored in, frontend JS anymore.
//
// The one thing frontend JS does need is proof a mutation actually came
// from this site: a matching CSRF value echoed back as a header, checked
// against the non-httpOnly jakez_csrf cookie the backend also sets, exactly
// as csrfProtection.js expects.
//
// That value used to be read directly via document.cookie - which works
// only when the page and the cookie share an origin. In production the
// frontend and backend are on different Render origins (jakezapp-frontend
// vs jakezapp-backend-...), so the cookie the backend sets is stored under
// the BACKEND's origin: the browser still attaches it automatically to
// requests TO that origin (that part isn't same-origin-restricted), but
// frontend JS calling document.cookie on ITS OWN page can never see a
// cookie that belongs to a different origin - that restriction has nothing
// to do with httpOnly/SameSite, it's just how per-origin cookie storage
// works. The result: getCsrfToken() always returned "" in production, and
// every mutation (not just login) failed CSRF - a real, live bug.
//
// Fixed by having the backend also echo the current CSRF value in the JSON
// body of login/register/refresh/me responses (something the frontend's
// own fetch call CAN read, regardless of origin, since it's reading its own
// response) and keeping it here in memory instead of re-deriving it from a
// cookie the page can't see. The cookie itself still rides along on every
// request and is still what csrfProtection.js compares against - only
// where the client learns the value to echo back changed.
let csrfToken = "";

export const setCsrfToken = (token) => {
  csrfToken = typeof token === "string" ? token : "";
};

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Entries only expire lazily (on access), so a long-lived tab doing many
// distinct searches (e.g. repeated "near me" radius queries) could grow this
// unbounded. FIFO-evict the oldest entry past this size as a backstop.
const requestCacheMaxEntries = 200;

const requestCache = new Map();

// Exported (unlike the Map itself) so api.js's domain wrappers can read/write
// the shared cache without each needing their own cache implementation.
export const getCached = (key) => {
  const entry = requestCache.get(key);

  if (!entry || entry.expiresAt <= Date.now()) {
    requestCache.delete(key);
    return undefined;
  }

  return entry.value;
};

export const setCached = (key, value, ttlMs) => {
  requestCache.set(key, { value, expiresAt: Date.now() + ttlMs });

  while (requestCache.size > requestCacheMaxEntries) {
    requestCache.delete(requestCache.keys().next().value);
  }
};

// Clears every cached key when called with no prefix (e.g. on auth
// transitions), or just the keys under a prefix (e.g. after a mutation).
export const clearRequestCache = (prefix) => {
  if (!prefix) {
    requestCache.clear();
    return;
  }

  for (const key of requestCache.keys()) {
    if (key.startsWith(prefix)) {
      requestCache.delete(key);
    }
  }
};

export const buildQueryString = (filters) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
};

export const apiFetch = async (path, options = {}, _isRetry = false) => {
  const baseUrl = normalizeApiBaseUrl(localStorage.getItem("jakez_base_url") || defaultApiBaseUrl);
  const url = createApiUrl(path, baseUrl);
  const headers = new Headers(options.headers || {});
  const method = (options.method || "GET").toUpperCase();

  if (unsafeMethods.has(method) && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
    body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body,
  });

  const payload = await response.json().catch(() => ({}));

  // Learn the current value from whichever response carries one (login,
  // register, refresh, google, and /api/auth/me all echo it) rather than
  // requiring every call site to know to do this - covers both a fresh
  // login and restoring a session on page reload via the existing
  // fetchCurrentUser() mount check.
  if (typeof payload.csrfToken === "string") {
    setCsrfToken(payload.csrfToken);
  }

  // A tab left open since before another tab (or a reload) rotated this
  // browser's shared CSRF cookie ends up with a stale in-memory value -
  // still validly signed in (the auth cookie matches), but the header no
  // longer matches the current cookie. csrfProtection.js's CSRF_MISMATCH
  // code (as opposed to any other 403 reason) means exactly that: safe to
  // silently re-sync from the current session once and retry, since it's
  // purely this tab's own staleness, not a real authorization decision.
  if (response.status === 403 && payload.code === "CSRF_MISMATCH" && !_isRetry) {
    const resyncResponse = await fetch(createApiUrl("/api/auth/me", baseUrl), { credentials: "include" });
    const resyncPayload = await resyncResponse.json().catch(() => ({}));

    if (typeof resyncPayload.csrfToken === "string") {
      setCsrfToken(resyncPayload.csrfToken);
      return apiFetch(path, options, true);
    }
  }

  if (!response.ok) {
    const error = new Error(payload.message || `Request failed with status ${response.status}`);
    if (payload.suggestions) {
      error.suggestions = payload.suggestions;
    }
    throw error;
  }

  return payload;
};
