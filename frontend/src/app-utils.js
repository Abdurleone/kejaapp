/**
 * KejaApp Frontend Utilities & API Helpers
 */

const API_BASE_URL = localStorage.getItem("keja_base_url") || "http://localhost:5000";

// --- CORE API HELPER ---
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("keja_token");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data.data || data;
}

// --- AUTH HELPERS ---
export async function loginUser(credentials) {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  if (data.token) localStorage.setItem("keja_token", data.token);
  return data;
}

export async function registerUser(payload) {
  const data = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (data.token) localStorage.setItem("keja_token", data.token);
  return data;
}

export async function fetchCurrentUser() {
  return apiFetch("/api/auth/me");
}

export async function logoutUser() {
  await apiFetch("/api/auth/logout", { method: "POST" });
  localStorage.removeItem("keja_token");
}

/**
 * NEW: Register FCM Device Token for Push Notifications
 */
export async function registerFcmToken(data) {
  return apiFetch("/api/auth/fcm-token", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- PROPERTY HELPERS ---
export async function fetchProperties(filters = {}) {
  const query = new URLSearchParams(filters).toString();
  return apiFetch(`/api/properties?${query}`);
}

export async function fetchFavorites() {
  return apiFetch("/api/favorites");
}

export async function saveFavorite(propertyId) {
  return apiFetch(`/api/favorites/${propertyId}`, { method: "POST" });
}

export async function removeFavorite(propertyId) {
  return apiFetch(`/api/favorites/${propertyId}`, { method: "DELETE" });
}

// --- FORMATTING & UI HELPERS ---
export function formatKes(amount) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function summarizeProperties(properties = []) {
  if (properties.length === 0) return { medianRent: 0, areaCount: 0 };
  
  const rents = properties.map(p => p.price?.rent || 0).sort((a, b) => a - b);
  const medianRent = rents[Math.floor(rents.length / 2)];
  const areas = new Set(properties.map(p => p.location?.area));

  return {
    medianRent,
    areaCount: areas.size,
  };
}

// --- ROUTING & THEME HELPERS ---
export function normalizeApiBaseUrl(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getViewPath(view) {
  const paths = {
    discover: "/search",
    saved: "/saved",
    owner: "/owner",
    admin: "/admin",
    account: "/account",
    privacy: "/privacy",
    deleteAccount: "/delete-account",
  };
  return paths[view] || paths.discover;
}

export function resolveViewFromPath(path) {
  if (path === "/") return "discover";
  if (path === "/search") return "discover";
  if (path === "/saved") return "saved";
  if (path === "/owner") return "owner";
  if (path === "/admin") return "admin";
  if (path === "/account") return "account";
  if (path === "/privacy") return "privacy";
  if (path === "/delete-account") return "deleteAccount";
  return "discover";
}

export function shouldShowSplash({ isSignedIn, path }) {
  return !isSignedIn && path === "/";
}

export function nextTheme(current) {
  return current === "default" ? "kenya" : "default";
}

export function nextColorMode(current) {
  return current === "light" ? "dark" : "light";
}

export function canAccessView(role, view) {
  if (view === "privacy" || view === "deleteAccount") return true;
  if (!role) return view === "discover";

  const roleViewAccess = {
    tenant: ["discover", "saved", "account"],
    landlord: ["owner", "account"],
    agency: ["owner", "account"],
    admin: ["admin", "owner", "account"],
  };

  return Boolean(roleViewAccess[role]?.includes(view));
}

export function canRegisterRole(role) {
  return ["tenant", "landlord", "agency"].includes(role);
}

export function canUseTenantPropertyActions(role) {
  return role === "tenant";
}

export function canManageListings(role) {
  return ["landlord", "agency", "admin"].includes(role);
}

export function canSearchListings(role) {
  return !role || role === "tenant";
}

export function canOpenPropertyDetails(role) {
  return role === "tenant";
}

export function canUseFavorites(role) {
  return role === "tenant";
}

export function canCreateTenantRequest(role) {
  return role === "tenant";
}

export function canSubmitAgencyVerification(role) {
  return role === "agency";
}

export function canUseAdminTools(role) {
  return role === "admin";
}

export function getDefaultViewForRole(role) {
  if (!role) return "discover";

  const defaults = {
    tenant: "discover",
    landlord: "owner",
    agency: "owner",
    admin: "admin",
  };

  return defaults[role] || "discover";
}
