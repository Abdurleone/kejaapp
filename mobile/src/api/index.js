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
  return response.data || [];
};

export const createProperty = async (payload) => {
  const response = await apiFetch("/api/properties", { method: "POST", body: payload });
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

export const fetchInquiries = async () => {
  const response = await apiFetch("/api/inquiries", { method: "GET" });
  return response.data || [];
};

export const createInquiry = async ({ property, subject, message, contactPreference }) => {
  const response = await apiFetch("/api/inquiries", {
    method: "POST",
    body: { property, subject, message, contactPreference },
  });
  return response.data;
};

// --- Viewing requests ---

export const fetchViewingRequests = async () => {
  const response = await apiFetch("/api/viewings", { method: "GET" });
  return response.data || [];
};

export const createViewingRequest = async ({ property, requestedDate, message }) => {
  const response = await apiFetch("/api/viewings", {
    method: "POST",
    body: { property, requestedDate, message },
  });
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
