import { apiFetch, buildQueryString, clearRequestCache, getCached, setAuthToken, setCached } from "./client.js";

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

// These three return the full response (not just response.data), since the
// caller needs `imageReview.status` to surface a "flagged as suspicious"
// notice inline - unlike other mutations here where only the updated record
// itself is ever needed.
export const addPropertyImage = async (propertyId, payload) => {
  const response = await apiFetch(`/api/properties/${propertyId}/images`, {
    method: "POST",
    body: payload,
  });
  clearRequestCache("property");
  clearRequestCache("myProperties");
  return response;
};

export const uploadPropertyImage = async (propertyId, payload) => {
  const response = await apiFetch(`/api/properties/${propertyId}/images/upload`, {
    method: "POST",
    body: payload,
  });
  clearRequestCache("property");
  clearRequestCache("myProperties");
  return response;
};

export const removePropertyImage = async (propertyId, imageId) => {
  const response = await apiFetch(`/api/properties/${propertyId}/images/${imageId}`, {
    method: "DELETE",
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
  const data = { properties: response.data || [], pagination: response.pagination };
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
  const data = { inquiries: response.data || [], pagination: response.pagination };
  setCached(cacheKey, data, receivedInquiriesCacheTtlMs);
  return data;
};

export const respondToInquiry = async (inquiryId, payload) => {
  const response = await apiFetch(`/api/inquiries/${inquiryId}`, {
    method: "PUT",
    body: payload,
  });
  clearRequestCache("receivedInquiries");
  return response.data;
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

const adminReviewsCacheTtlMs = 15000;

export const fetchAdminReviews = async () => {
  const cacheKey = "adminReviews:";
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch("/api/admin/reviews", {
    method: "GET",
  });
  const data = response.data || [];
  setCached(cacheKey, data, adminReviewsCacheTtlMs);
  return data;
};

const moversCacheTtlMs = 15000;
const propertyMoversCacheTtlMs = 15000;
const moverProfileCacheTtlMs = 15000;
const moverRequestsCacheTtlMs = 15000;

export const fetchMovers = async (query = {}) => {
  const queryString = buildQueryString(query);
  const cacheKey = `movers:${queryString}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch(`/api/movers${queryString}`, { method: "GET" });
  const data = response.data || [];
  setCached(cacheKey, data, moversCacheTtlMs);
  return data;
};

export const fetchPropertyMovers = async (propertyId, query = {}) => {
  const queryString = buildQueryString(query);
  const cacheKey = `propertyMovers:${propertyId}:${queryString}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch(`/api/properties/${propertyId}/movers${queryString}`, {
    method: "GET",
  });
  const data = response.data || { affiliates: [], nearby: [] };
  setCached(cacheKey, data, propertyMoversCacheTtlMs);
  return data;
};

export const affiliateMover = async (moverId) => {
  const response = await apiFetch(`/api/movers/${moverId}/affiliate`, { method: "PUT" });
  clearRequestCache("movers");
  clearRequestCache("propertyMovers");
  return response.data;
};

export const unaffiliateMover = async (moverId) => {
  const response = await apiFetch(`/api/movers/${moverId}/affiliate`, { method: "DELETE" });
  clearRequestCache("movers");
  clearRequestCache("propertyMovers");
  return response.data;
};

export const submitMoverProfile = async (payload) => {
  const response = await apiFetch("/api/movers/profile", {
    method: "POST",
    body: payload,
  });
  clearRequestCache("moverProfile");
  clearRequestCache("movers");
  return response.data;
};

export const fetchMoverProfileStatus = async () => {
  const cacheKey = "moverProfile";
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch("/api/movers/profile", { method: "GET" });
  setCached(cacheKey, response.data, moverProfileCacheTtlMs);
  return response.data;
};

export const createMoverRequest = async ({
  mover,
  property,
  homeSize,
  message,
  preferredDate,
  pickupLat,
  pickupLng,
}) => {
  const response = await apiFetch("/api/mover-requests", {
    method: "POST",
    body: { mover, property, homeSize, message, preferredDate, pickupLat, pickupLng },
  });
  clearRequestCache("myMoverRequests");
  return response.data;
};

// Best-effort: resolves with {lat, lng} from the browser's geolocation, or null if
// unsupported/denied/timed out. Callers should treat pickup coordinates as optional —
// a mover request is still valid without them, it just won't show a pickup distance.
export const getCurrentPositionOrNull = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 },
    );
  });

export const fetchReceivedMoverRequests = async (query = {}) => {
  const queryString = buildQueryString(query);
  const cacheKey = `receivedMoverRequests:${queryString}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch(`/api/mover-requests/received${queryString}`, { method: "GET" });
  const data = response.data || [];
  setCached(cacheKey, data, moverRequestsCacheTtlMs);
  return data;
};

export const updateMoverRequestStatus = async (moverRequestId, { status, response: replyMessage }) => {
  const result = await apiFetch(`/api/mover-requests/${moverRequestId}/status`, {
    method: "PUT",
    body: { status, response: replyMessage },
  });
  clearRequestCache("myMoverRequests");
  clearRequestCache("receivedMoverRequests");
  return result.data;
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

export const createFeedback = async ({ message, allowPublicSharing }) => {
  const response = await apiFetch("/api/feedback", {
    method: "POST",
    body: { message, allowPublicSharing },
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

const savedSearchesCacheTtlMs = 15000;

export const createSavedSearch = async (payload) => {
  const response = await apiFetch("/api/saved-searches", {
    method: "POST",
    body: payload,
  });
  clearRequestCache("savedSearches");
  return response.data;
};

export const fetchSavedSearches = async () => {
  const cacheKey = "savedSearches";
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch("/api/saved-searches", { method: "GET" });
  const data = response.data || [];
  setCached(cacheKey, data, savedSearchesCacheTtlMs);
  return data;
};

export const deleteSavedSearch = async (savedSearchId) => {
  await apiFetch(`/api/saved-searches/${savedSearchId}`, { method: "DELETE" });
  clearRequestCache("savedSearches");
};

const notificationsCacheTtlMs = 15000;

export const fetchNotifications = async (query = {}) => {
  const queryString = buildQueryString(query);
  const cacheKey = `notifications:${queryString}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch(`/api/notifications${queryString}`, {
    method: "GET",
  });
  const data = response.data || [];
  setCached(cacheKey, data, notificationsCacheTtlMs);
  return data;
};

export const markNotificationAsRead = async (notificationId) => {
  const response = await apiFetch(`/api/notifications/${notificationId}/read`, {
    method: "PUT",
  });
  clearRequestCache("notifications");
  clearRequestCache("dashboardSummary");
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await apiFetch("/api/notifications/read-all", {
    method: "PUT",
  });
  clearRequestCache("notifications");
  clearRequestCache("dashboardSummary");
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

const receivedViewingRequestsCacheTtlMs = 15000;

export const fetchReceivedViewingRequests = async (query = {}) => {
  const queryString = buildQueryString(query);
  const cacheKey = `receivedViewingRequests:${queryString}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch(`/api/viewings/received${queryString}`, { method: "GET" });
  const data = { viewingRequests: response.data || [], pagination: response.pagination };
  setCached(cacheKey, data, receivedViewingRequestsCacheTtlMs);
  return data;
};

export const updateViewingRequestStatus = async (viewingRequestId, { status, reason }) => {
  const response = await apiFetch(`/api/viewings/${viewingRequestId}/status`, {
    method: "PUT",
    body: { status, reason },
  });
  clearRequestCache("receivedViewingRequests");
  return response.data;
};

export const fetchCurrentUser = async () => {
  const response = await apiFetch("/api/auth/me", { method: "GET" });
  return response.user;
};

export const updateCurrentUser = async (updates) => {
  const response = await apiFetch("/api/auth/me", { method: "PUT", body: updates });
  return response.user;
};

export const changeCurrentUserPassword = async ({ currentPassword, newPassword }) => {
  return apiFetch("/api/auth/password", { method: "PUT", body: { currentPassword, newPassword } });
};

export const fetchFavorites = async (query = {}) => {
  const queryString = buildQueryString(query);
  const cacheKey = `favorites:${queryString}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await apiFetch(`/api/favorites${queryString}`, { method: "GET" });
  const data = { favorites: response.data || [], pagination: response.pagination };
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
