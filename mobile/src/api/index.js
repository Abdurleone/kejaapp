import { apiFetch, buildQueryString, setAuthToken } from "./client.js";

export { getApiBaseUrl, setApiBaseUrl, getAuthToken } from "./client.js";

// --- Auth ---

export const loginUser = async (credentials) => {
  const response = await apiFetch("/api/auth/login", { method: "POST", body: credentials });
  await setAuthToken(response.token);
  return response;
};

export const registerUser = async (payload) => {
  const response = await apiFetch("/api/auth/register", { method: "POST", body: payload });
  await setAuthToken(response.token);
  return response;
};

export const logoutUser = async () => {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } finally {
    await setAuthToken(null);
  }
};

export const fetchCurrentUser = async () => {
  const response = await apiFetch("/api/auth/me", { method: "GET" });
  return response.user;
};

// --- Dashboard ---

export const fetchDashboardSummary = async () => {
  const response = await apiFetch("/api/dashboard/summary", { method: "GET" });
  return response.data;
};

// --- Properties ---

export const fetchProperties = async (query = {}) => {
  const response = await apiFetch(`/api/properties${buildQueryString(query)}`, { method: "GET" });
  return response.data || [];
};

export const fetchProperty = async (propertyId) => {
  const response = await apiFetch(`/api/properties/${propertyId}`, { method: "GET" });
  return response.data;
};

export const fetchPropertyReviews = async (propertyId) => {
  const response = await apiFetch(`/api/properties/${propertyId}/reviews`, { method: "GET" });
  return response.data || [];
};

export const fetchMyProperties = async (query = {}) => {
  const response = await apiFetch(`/api/properties/mine${buildQueryString(query)}`, { method: "GET" });
  return { properties: response.data || [], pagination: response.pagination };
};

export const createProperty = async (payload) => {
  const response = await apiFetch("/api/properties", { method: "POST", body: payload });
  return response.data;
};

export const updateProperty = async (propertyId, payload) => {
  const response = await apiFetch(`/api/properties/${propertyId}`, { method: "PUT", body: payload });
  return response.data;
};

// Returns the whole response (not just .data) since callers need imageReview.status.
export const uploadPropertyImage = async (propertyId, payload) => {
  return apiFetch(`/api/properties/${propertyId}/images/upload`, { method: "POST", body: payload });
};

export const removePropertyImage = async (propertyId, imageId) => {
  const response = await apiFetch(`/api/properties/${propertyId}/images/${imageId}`, { method: "DELETE" });
  return response.data;
};

// --- Favorites ---

export const fetchFavorites = async () => {
  const response = await apiFetch("/api/favorites", { method: "GET" });
  return response.data || [];
};

export const saveFavorite = async (propertyId) => {
  const response = await apiFetch(`/api/favorites/${propertyId}`, { method: "POST" });
  return response.data;
};

export const removeFavorite = async (propertyId) => {
  await apiFetch(`/api/favorites/${propertyId}`, { method: "DELETE" });
};

// --- Inquiries ---

export const fetchInquiries = async (query = {}) => {
  const response = await apiFetch(`/api/inquiries${buildQueryString(query)}`, { method: "GET" });
  return { inquiries: response.data || [], pagination: response.pagination };
};

export const createInquiry = async ({ property, subject, message, contactPreference }) => {
  const response = await apiFetch("/api/inquiries", {
    method: "POST",
    body: { property, subject, message, contactPreference },
  });
  return response.data;
};

export const fetchReceivedInquiries = async (query = {}) => {
  const response = await apiFetch(`/api/inquiries/received${buildQueryString(query)}`, { method: "GET" });
  return { inquiries: response.data || [], pagination: response.pagination };
};

export const respondToInquiry = async (inquiryId, { status, response: replyMessage }) => {
  const result = await apiFetch(`/api/inquiries/${inquiryId}`, {
    method: "PUT",
    body: { status, response: replyMessage },
  });
  return result.data;
};

// --- Viewing requests ---

export const fetchViewingRequests = async (query = {}) => {
  const response = await apiFetch(`/api/viewings${buildQueryString(query)}`, { method: "GET" });
  return { viewingRequests: response.data || [], pagination: response.pagination };
};

export const createViewingRequest = async ({ property, requestedDate, message }) => {
  const response = await apiFetch("/api/viewings", {
    method: "POST",
    body: { property, requestedDate, message },
  });
  return response.data;
};

// --- Movers ---

export const fetchMovers = async (query = {}) => {
  const response = await apiFetch(`/api/movers${buildQueryString(query)}`, { method: "GET" });
  return response.data || [];
};

export const fetchMoverById = async (moverId) => {
  const response = await apiFetch(`/api/movers/${moverId}`, { method: "GET" });
  return response.data;
};

export const fetchPropertyMovers = async (propertyId, query = {}) => {
  const response = await apiFetch(`/api/properties/${propertyId}/movers${buildQueryString(query)}`, {
    method: "GET",
  });
  return response.data || { affiliates: [], nearby: [] };
};

export const affiliateMover = async (moverId) => {
  const response = await apiFetch(`/api/movers/${moverId}/affiliate`, { method: "PUT" });
  return response.data;
};

export const unaffiliateMover = async (moverId) => {
  const response = await apiFetch(`/api/movers/${moverId}/affiliate`, { method: "DELETE" });
  return response.data;
};

export const submitMoverProfile = async (payload) => {
  const response = await apiFetch("/api/movers/profile", { method: "POST", body: payload });
  return response.data;
};

export const fetchMoverProfileStatus = async () => {
  const response = await apiFetch("/api/movers/profile", { method: "GET" });
  return response.data;
};

export const createMoverRequest = async ({ mover, property, message, preferredDate, pickupLat, pickupLng }) => {
  const response = await apiFetch("/api/mover-requests", {
    method: "POST",
    body: { mover, property, message, preferredDate, pickupLat, pickupLng },
  });
  return response.data;
};

export const fetchReceivedMoverRequests = async (query = {}) => {
  const response = await apiFetch(`/api/mover-requests/received${buildQueryString(query)}`, { method: "GET" });
  return response.data || [];
};

export const updateMoverRequestStatus = async (moverRequestId, { status, response: replyMessage }) => {
  const result = await apiFetch(`/api/mover-requests/${moverRequestId}/status`, {
    method: "PUT",
    body: { status, response: replyMessage },
  });
  return result.data;
};

// --- Saved searches ---

export const createSavedSearch = async (payload) => {
  const response = await apiFetch("/api/saved-searches", { method: "POST", body: payload });
  return response.data;
};

export const fetchSavedSearches = async () => {
  const response = await apiFetch("/api/saved-searches", { method: "GET" });
  return response.data || [];
};

export const deleteSavedSearch = async (savedSearchId) => {
  await apiFetch(`/api/saved-searches/${savedSearchId}`, { method: "DELETE" });
};

// --- Device tokens (push notifications) ---

export const createDeviceToken = async ({ token, platform }) => {
  const response = await apiFetch("/api/device-tokens", { method: "POST", body: { token, platform } });
  return response.data;
};

export const deleteDeviceToken = async (token) => {
  await apiFetch("/api/device-tokens", { method: "DELETE", body: { token } });
};

// --- Notifications ---

export const fetchNotifications = async (query = {}) => {
  const response = await apiFetch(`/api/notifications${buildQueryString(query)}`, { method: "GET" });
  return response.data || [];
};

export const markNotificationAsRead = async (notificationId) => {
  const response = await apiFetch(`/api/notifications/${notificationId}/read`, { method: "PUT" });
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await apiFetch("/api/notifications/read-all", { method: "PUT" });
  return response.data;
};

// --- Feedback ---

export const fetchMyFeedback = async () => {
  const response = await apiFetch("/api/feedback/mine", { method: "GET" });
  return response.data || [];
};

export const createFeedback = async ({ message }) => {
  const response = await apiFetch("/api/feedback", { method: "POST", body: { message } });
  return response.data;
};

export const fetchPublicTestimonials = async () => {
  const response = await apiFetch("/api/feedback/public", { method: "GET" });
  return response.data || [];
};

export const fetchAdminFeedback = async (query = {}) => {
  const response = await apiFetch(`/api/admin/feedback${buildQueryString(query)}`, { method: "GET" });
  return response.data || [];
};

export const respondToFeedback = async (feedbackId, { message }) => {
  const response = await apiFetch(`/api/admin/feedback/${feedbackId}/respond`, {
    method: "PUT",
    body: { message },
  });
  return response.data;
};
