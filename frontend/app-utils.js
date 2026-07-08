const fallbackImage =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=70";

export const defaultApiBaseUrl = "http://localhost:5000";

export const normalizeApiBaseUrl = (value) => {
  const baseUrl = String(value || "").trim() || defaultApiBaseUrl;
  return baseUrl.replace(/\/+$/, "");
};

export const createApiUrl = (path, baseUrl = defaultApiBaseUrl) => {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
};

const authTokenKey = "keja_token";

export const getAuthToken = () => localStorage.getItem(authTokenKey) || "";
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(authTokenKey, token);
  } else {
    localStorage.removeItem(authTokenKey);
  }
};

// Entries only expire lazily (on access), so a long-lived tab doing many
// distinct searches (e.g. repeated "near me" radius queries) could grow this
// unbounded. FIFO-evict the oldest entry past this size as a backstop.
const requestCacheMaxEntries = 200;

const requestCache = new Map();

const getCached = (key) => {
  const entry = requestCache.get(key);

  if (!entry || entry.expiresAt <= Date.now()) {
    requestCache.delete(key);
    return undefined;
  }

  return entry.value;
};

const setCached = (key, value, ttlMs) => {
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

export const apiFetch = async (path, options = {}) => {
  const baseUrl = normalizeApiBaseUrl(localStorage.getItem("keja_base_url") || defaultApiBaseUrl);
  const url = createApiUrl(path, baseUrl);
  const headers = new Headers(options.headers || {});

  if (getAuthToken()) {
    headers.set("Authorization", `Bearer ${getAuthToken()}`);
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

const propertiesCacheTtlMs = 15000;
const favoritesCacheTtlMs = 15000;

export const fetchProperties = async (query = {}) => {
  const queryString = buildQueryString(query);
  const cacheKey = `properties:${queryString}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch(`/api/properties${queryString}`, {
    method: "GET",
  });
  const data = response.data || [];
  setCached(cacheKey, data, propertiesCacheTtlMs);
  return data;
};

export const fetchPropertyById = async (propertyId) => {
  const cacheKey = `property:${propertyId}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch(`/api/properties/${propertyId}`, {
    method: "GET",
  });
  setCached(cacheKey, response.data, propertiesCacheTtlMs);
  return response.data;
};

export const createProperty = async (payload) => {
  const response = await apiFetch("/api/properties", {
    method: "POST",
    body: payload,
  });
  // "property" also matches "properties:" list-query cache keys, since both
  // start with that prefix - see clearRequestCache's startsWith check.
  clearRequestCache("property");
  clearRequestCache("myProperties");
  return response.data;
};

export const updateProperty = async (propertyId, payload) => {
  const response = await apiFetch(`/api/properties/${propertyId}`, {
    method: "PUT",
    body: payload,
  });
  clearRequestCache("property");
  clearRequestCache("myProperties");
  return response.data;
};

const myPropertiesCacheTtlMs = 15000;
const receivedInquiriesCacheTtlMs = 15000;

export const fetchMyProperties = async (query = {}) => {
  const queryString = buildQueryString(query);
  const cacheKey = `myProperties:${queryString}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch(`/api/properties/mine${queryString}`, {
    method: "GET",
  });
  const data = response.data || [];
  setCached(cacheKey, data, myPropertiesCacheTtlMs);
  return data;
};

export const fetchReceivedInquiries = async (query = {}) => {
  const queryString = buildQueryString(query);
  const cacheKey = `receivedInquiries:${queryString}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch(`/api/inquiries/received${queryString}`, {
    method: "GET",
  });
  const data = response.data || [];
  setCached(cacheKey, data, receivedInquiriesCacheTtlMs);
  return data;
};

const dashboardSummaryCacheTtlMs = 15000;

export const fetchDashboardSummary = async () => {
  const cacheKey = "dashboardSummary";
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch("/api/dashboard/summary", {
    method: "GET",
  });
  setCached(cacheKey, response.data, dashboardSummaryCacheTtlMs);
  return response.data;
};

const adminUsersCacheTtlMs = 15000;

export const fetchAdminUsers = async (query = {}) => {
  const queryString = buildQueryString(query);
  const cacheKey = `adminUsers:${queryString}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch(`/api/admin/users${queryString}`, {
    method: "GET",
  });
  const data = { users: response.data || [], pagination: response.pagination };
  setCached(cacheKey, data, adminUsersCacheTtlMs);
  return data;
};

export const fetchAdminUserSummary = async (userId) => {
  const response = await apiFetch(`/api/admin/users/${userId}/summary`, {
    method: "GET",
  });
  return response.data;
};

export const fetchAdminUserStatusHistory = async (userId) => {
  const response = await apiFetch(`/api/admin/users/${userId}/status-history`, {
    method: "GET",
  });
  return response.data || [];
};

export const updateAdminUserStatus = async (userId, payload) => {
  const response = await apiFetch(`/api/admin/users/${userId}/status`, {
    method: "PUT",
    body: payload,
  });
  clearRequestCache("adminUsers");
  return response.data;
};

export const createInquiry = async ({ property, subject, message, contactPreference }) => {
  const response = await apiFetch("/api/inquiries", {
    method: "POST",
    body: { property, subject, message, contactPreference },
  });
  return response.data;
};

const myFeedbackCacheTtlMs = 15000;
const adminFeedbackCacheTtlMs = 15000;
const publicTestimonialsCacheTtlMs = 60000;

export const createFeedback = async ({ message }) => {
  const response = await apiFetch("/api/feedback", {
    method: "POST",
    body: { message },
  });
  clearRequestCache("myFeedback");
  return response.data;
};

export const fetchMyFeedback = async () => {
  const cacheKey = "myFeedback";
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch("/api/feedback/mine", { method: "GET" });
  const data = response.data || [];
  setCached(cacheKey, data, myFeedbackCacheTtlMs);
  return data;
};

export const fetchAdminFeedback = async (query = {}) => {
  const queryString = buildQueryString(query);
  const cacheKey = `adminFeedback:${queryString}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch(`/api/admin/feedback${queryString}`, {
    method: "GET",
  });
  const data = response.data || [];
  setCached(cacheKey, data, adminFeedbackCacheTtlMs);
  return data;
};

export const respondToFeedback = async (feedbackId, { message }) => {
  const response = await apiFetch(`/api/admin/feedback/${feedbackId}/respond`, {
    method: "PUT",
    body: { message },
  });
  clearRequestCache("adminFeedback");
  clearRequestCache("myFeedback");
  return response.data;
};

export const fetchPublicTestimonials = async () => {
  const cacheKey = "publicTestimonials";
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch("/api/feedback/public", { method: "GET" });
  const data = response.data || [];
  setCached(cacheKey, data, publicTestimonialsCacheTtlMs);
  return data;
};

export const createViewingRequest = async ({ property, requestedDate, message }) => {
  const response = await apiFetch("/api/viewings", {
    method: "POST",
    body: { property, requestedDate, message },
  });
  return response.data;
};

export const fetchCurrentUser = async () => {
  const response = await apiFetch("/api/auth/me", { method: "GET" });
  return response.user;
};

export const fetchFavorites = async () => {
  const cacheKey = "favorites";
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch("/api/favorites", { method: "GET" });
  const data = response.data || [];
  setCached(cacheKey, data, favoritesCacheTtlMs);
  return data;
};

export const saveFavorite = async (propertyId) => {
  const response = await apiFetch(`/api/favorites/${propertyId}`, {
    method: "POST",
  });
  clearRequestCache("favorites");
  return response.data;
};

export const removeFavorite = async (propertyId) => {
  await apiFetch(`/api/favorites/${propertyId}`, {
    method: "DELETE",
  });
  clearRequestCache("favorites");
};

export const loginUser = async (credentials) => {
  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    body: credentials,
  });
  setAuthToken(response.token);
  clearRequestCache();
  return response;
};

export const logoutUser = async () => {
  await apiFetch("/api/auth/logout", { method: "POST" });
  setAuthToken("");
  clearRequestCache();
};

export const deleteCurrentAccount = async () => {
  const response = await apiFetch("/api/auth/me", { method: "DELETE" });
  setAuthToken("");
  clearRequestCache();
  return response;
};

export const registerUser = async (userData) => {
  const response = await apiFetch("/api/auth/register", {
    method: "POST",
    body: userData,
  });
  setAuthToken(response.token);
  clearRequestCache();
  return response;
};

export const formatKes = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

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

export const resolveAssetUrl = (url, baseUrl) => {
  if (!url) {
    return fallbackImage;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${baseUrl.replace(/\/$/, "")}${url}`;
};

export const getPropertyImage = (property, baseUrl = defaultApiBaseUrl) =>
  resolveAssetUrl(property.images?.[0]?.url, baseUrl);

export const statusTone = (status) => {
  if (status === "available" || status === "active" || status === "approved" || status === "responded") {
    return "status-active";
  }

  if (status === "taken" || status === "suspended" || status === "pending") {
    return "status-suspended";
  }

  return "status-banned";
};

export const formatStatusLabel = (value) =>
  String(value || "")
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatRatingSummary = (ratingAverage, ratingCount) => {
  const count = Number(ratingCount || 0);

  if (!count) {
    return "No ratings";
  }

  return `${Number(ratingAverage || 0).toFixed(1)} rating (${count})`;
};

export const summarizeProperties = (properties) => {
  const rents = properties
    .map((property) => Number(property.price?.rent || 0))
    .filter((rent) => rent > 0)
    .sort((a, b) => a - b);
  const medianRent = rents.length ? rents[Math.floor((rents.length - 1) / 2)] : 0;
  const openViewings = properties.filter((property) => property.viewingType === "open").length;
  const scheduledViewings = properties.filter((property) => property.viewingType === "scheduled").length;
  const areas = new Set(properties.map((property) => property.location?.area).filter(Boolean));

  return {
    total: properties.length,
    medianRent,
    openViewings,
    scheduledViewings,
    areaCount: areas.size,
  };
};

export const summarizeReview = (review) => {
  const propertyTitle = review.property?.title || "Property";
  const reviewer = review.user?.name || "Tenant";
  const rating = Number(review.rating || 0);

  return `${propertyTitle} - ${rating}/5 by ${reviewer}`;
};

export const sortProperties = (properties, sortMode) => {
  const sorted = [...properties];

  if (sortMode === "rent-asc") {
    return sorted.sort((a, b) => Number(a.price?.rent || 0) - Number(b.price?.rent || 0));
  }

  if (sortMode === "rent-desc") {
    return sorted.sort((a, b) => Number(b.price?.rent || 0) - Number(a.price?.rent || 0));
  }

  return sorted;
};

export const demoAccounts = {
  tenant: "tenant@example.com",
  landlord: "landlord@example.com",
  agency: "agency@example.com",
  admin: "admin@example.com",
};

export const getDemoEmailForRole = (role) => demoAccounts[role] || demoAccounts.tenant;

export const roles = Object.freeze({
  tenant: "tenant",
  landlord: "landlord",
  agency: "agency",
  admin: "admin",
});

export const roleGroups = Object.freeze({
  publicRegistration: [roles.tenant, roles.landlord, roles.agency],
  tenantOnly: [roles.tenant],
  listingManagers: [roles.landlord, roles.agency],
  propertyOwners: [roles.landlord, roles.agency],
  agencies: [roles.agency],
  admins: [roles.admin],
});

export const hasRole = (role, allowedRoles) => allowedRoles.includes(role);

export const canRegisterRole = (role) => hasRole(role, roleGroups.publicRegistration);

const roleViewAccess = {
  [roles.tenant]: ["dashboard", "discover", "saved", "feedback", "account"],
  [roles.landlord]: ["dashboard", "owner", "feedback", "account"],
  [roles.agency]: ["dashboard", "owner", "feedback", "account"],
  [roles.admin]: ["dashboard", "admin", "feedback", "account"],
};

export const canAccessView = (role, view) => {
  if (["privacy", "deleteAccount"].includes(view)) {
    return true;
  }

  if (!role) {
    return view === "discover";
  }

  return Boolean(roleViewAccess[role]?.includes(view));
};

export const getDefaultViewForRole = (role) => roleViewAccess[role]?.[0] || "discover";

export const canUseTenantPropertyActions = (role) => hasRole(role, roleGroups.tenantOnly);

export const canManageListings = (role) => hasRole(role, roleGroups.listingManagers);

export const canSearchListings = (role) => !role || hasRole(role, roleGroups.tenantOnly);

export const canOpenPropertyDetails = (role) => hasRole(role, roleGroups.tenantOnly);

export const shouldShowSplash = ({ isSignedIn, path = "/" }) => {
  const normalizedPath = String(path || "/").replace(/\/$/, "") || "/";
  return !isSignedIn && normalizedPath === "/";
};

const viewPaths = {
  dashboard: "/dashboard",
  discover: "/search",
  saved: "/saved",
  owner: "/owner",
  propertyCreate: "/owner/properties/new",
  admin: "/admin",
  feedback: "/feedback",
  account: "/account",
  privacy: "/privacy",
  deleteAccount: "/delete-account",
};

const propertyDetailPathPrefix = "/property/";
const propertyEditPathPrefix = "/owner/properties/";
const propertyEditPathSuffix = "/edit";

export const getPropertyDetailPath = (propertyId) => `${propertyDetailPathPrefix}${propertyId}`;

export const getPropertyIdFromPath = (path) => {
  const normalizedPath = String(path || "").replace(/\/$/, "");
  return normalizedPath.startsWith(propertyDetailPathPrefix)
    ? normalizedPath.slice(propertyDetailPathPrefix.length)
    : null;
};

export const getPropertyEditPath = (propertyId) => `${propertyEditPathPrefix}${propertyId}${propertyEditPathSuffix}`;

export const getPropertyEditIdFromPath = (path) => {
  const normalizedPath = String(path || "").replace(/\/$/, "");
  return normalizedPath.startsWith(propertyEditPathPrefix) && normalizedPath.endsWith(propertyEditPathSuffix)
    ? normalizedPath.slice(propertyEditPathPrefix.length, -propertyEditPathSuffix.length)
    : null;
};

export const resolveViewFromPath = (path) => {
  const normalizedPath = path === "/" ? "/" : String(path || "").replace(/\/$/, "");

  if (normalizedPath === "/") {
    return "discover";
  }

  if (normalizedPath.startsWith(propertyEditPathPrefix) && normalizedPath.endsWith(propertyEditPathSuffix)) {
    return "propertyEdit";
  }

  if (normalizedPath.startsWith(propertyDetailPathPrefix)) {
    return "propertyDetail";
  }

  const match = Object.entries(viewPaths).find(([, viewPath]) => viewPath === normalizedPath);
  return match?.[0] || "discover";
};

export const getViewPath = (view) => viewPaths[view] || viewPaths.discover;

export const getPropertyCreatePath = () => viewPaths.propertyCreate;

export const findPropertyById = (collections, propertyId) =>
  collections.flat().find((property) => String(property?._id || property?.id) === String(propertyId));
