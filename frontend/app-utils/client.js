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
// from this site: keja_csrf is a deliberately non-httpOnly cookie set
// alongside the session cookies specifically so this code can read it and
// echo it back as a header. A cross-site forged request can't do that -
// Same-Origin Policy blocks reading another origin's cookie value - so a
// matching header+cookie pair is proof of same-origin, same as the backend's
// csrfProtection.js middleware expects. Must match the backend's
// CSRF_COOKIE_NAME default.
const csrfCookieName = "keja_csrf";

const getCsrfToken = () => {
  // node:test's suite of tests runs this file outside a DOM (no `document`
  // global at all), unlike the Vitest/jsdom render tests - stay safe there
  // the same way defaultApiBaseUrl above stays safe without import.meta.env.
  if (typeof document === "undefined") {
    return "";
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${csrfCookieName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
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

export const apiFetch = async (path, options = {}) => {
  const baseUrl = normalizeApiBaseUrl(localStorage.getItem("keja_base_url") || defaultApiBaseUrl);
  const url = createApiUrl(path, baseUrl);
  const headers = new Headers(options.headers || {});
  const method = (options.method || "GET").toUpperCase();

  if (unsafeMethods.has(method)) {
    const csrfToken = getCsrfToken();

    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
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

  if (!response.ok) {
    const error = new Error(payload.message || `Request failed with status ${response.status}`);
    if (payload.suggestions) {
      error.suggestions = payload.suggestions;
    }
    throw error;
  }

  return payload;
};
