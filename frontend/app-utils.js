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
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }

  return payload;
};

export const fetchProperties = async (query = {}) => {
  const queryString = buildQueryString(query);
  const response = await apiFetch(`/api/properties${queryString}`, {
    method: "GET",
  });
  return response.data || [];
};

export const fetchCurrentUser = async () => {
  const response = await apiFetch("/api/auth/me", { method: "GET" });
  return response.user;
};

export const fetchFavorites = async () => {
  const response = await apiFetch("/api/favorites", { method: "GET" });
  return response.data || [];
};

export const saveFavorite = async (propertyId) => {
  const response = await apiFetch(`/api/favorites/${propertyId}`, {
    method: "POST",
  });
  return response.data;
};

export const removeFavorite = async (propertyId) => {
  await apiFetch(`/api/favorites/${propertyId}`, {
    method: "DELETE",
  });
};

export const loginUser = async (credentials) => {
  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    body: credentials,
  });
  setAuthToken(response.token);
  return response;
};

export const logoutUser = async () => {
  await apiFetch("/api/auth/logout", { method: "POST" });
  setAuthToken("");
};

export const deleteCurrentAccount = async () => {
  const response = await apiFetch("/api/auth/me", { method: "DELETE" });
  setAuthToken("");
  return response;
};

export const registerUser = async (userData) => {
  const response = await apiFetch("/api/auth/register", {
    method: "POST",
    body: userData,
  });
  setAuthToken(response.token);
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
  if (status === "available" || status === "active" || status === "approved") {
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

export const nextTheme = (theme) => (theme === "kenya" ? "default" : "kenya");

export const nextColorMode = (mode) => (mode === "dark" ? "light" : "dark");

export const demoAccounts = {
  tenant: "tenant@example.com",
  landlord: "landlord@example.com",
  agency: "agency@example.com",
  admin: "admin@example.com",
};

export const getDemoEmailForRole = (role) => demoAccounts[role] || demoAccounts.tenant;

export const canRegisterRole = (role) => ["tenant", "landlord", "agency"].includes(role);

const roleViewAccess = {
  tenant: ["discover", "saved", "account"],
  landlord: ["owner", "account"],
  agency: ["owner", "account"],
  admin: ["admin", "owner", "account"],
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

export const canUseTenantPropertyActions = (role) => role === "tenant";

export const canManageListings = (role) => ["landlord", "agency", "admin"].includes(role);

export const canSearchListings = (role) => !role || role === "tenant";

export const canOpenPropertyDetails = (role) => role === "tenant";

export const shouldShowSplash = ({ isSignedIn, path = "/" }) => {
  const normalizedPath = String(path || "/").replace(/\/$/, "") || "/";
  return !isSignedIn && normalizedPath === "/";
};

const viewPaths = {
  discover: "/search",
  saved: "/saved",
  owner: "/owner",
  admin: "/admin",
  account: "/account",
  privacy: "/privacy",
  deleteAccount: "/delete-account",
};

export const resolveViewFromPath = (path) => {
  const normalizedPath = path === "/" ? "/" : String(path || "").replace(/\/$/, "");

  if (normalizedPath === "/") {
    return "discover";
  }

  const match = Object.entries(viewPaths).find(([, viewPath]) => viewPath === normalizedPath);
  return match?.[0] || "discover";
};

export const getViewPath = (view) => viewPaths[view] || viewPaths.discover;

export const findPropertyById = (collections, propertyId) =>
  collections.flat().find((property) => String(property?._id || property?.id) === String(propertyId));
