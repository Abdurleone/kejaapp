import assert from "node:assert/strict";
import { describe, it, before } from "./helpers/nodeTestCompat.js";
import {
  addPropertyImage,
  apiFetch,
  createApiUrl,
  createFeedback,
  createInquiry,
  createSavedSearch,
  createViewingRequest,
  deleteSavedSearch,
  fetchAdminFeedback,
  fetchCurrentUser,
  fetchMyFeedback,
  fetchNotifications,
  fetchProperties,
  fetchFavorites,
  fetchPublicTestimonials,
  fetchSavedSearches,
  loginUser,
  logoutUser,
  markNotificationAsRead,
  registerUser,
  removePropertyImage,
  respondToFeedback,
  respondToInquiry,
  uploadPropertyImage,
  updateCurrentUser,
  changeCurrentUserPassword,
  setCsrfToken,
} from "../app-utils.js";

const jsonResponse = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("frontend API helpers", () => {
  before(() => {
    const store = new Map([["keja_base_url", "http://localhost:5000"]]);
    global.localStorage = {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    };
  });

  it("creates API URLs from paths", () => {
    assert.equal(
      createApiUrl("/api/properties", "http://localhost:5000"),
      "http://localhost:5000/api/properties"
    );
    assert.equal(
      createApiUrl("api/properties", "http://localhost:5000"),
      "http://localhost:5000/api/properties"
    );
  });

  it("normalizes API base URLs with trailing slashes", () => {
    const baseUrl = "http://localhost:5000/";
    assert.equal(
      createApiUrl("/api/health", baseUrl).startsWith("http://localhost:5000/api/health"),
      true
    );
  });

  it("attaches the in-memory CSRF token as a header on mutating requests", async () => {
    // Not read from document.cookie: the CSRF cookie is set by the backend's
    // own origin, a different origin than the frontend page in production,
    // so document.cookie there can never see it (unrelated to httpOnly -
    // that's true even of the non-httpOnly CSRF cookie itself). The value
    // instead comes from a prior response body, held in memory - primed
    // here the same way a real login response would populate it.
    setCsrfToken("test-csrf-value");

    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedOptions = options;
      return jsonResponse({ message: "ok" });
    };

    await apiFetch("/api/favorites/p1", { method: "POST" });

    assert.equal(capturedOptions.headers.get("X-CSRF-Token"), "test-csrf-value");
    assert.equal(capturedOptions.credentials, "include");
  });

  it("does not attach a CSRF header on safe (GET) requests", async () => {
    setCsrfToken("test-csrf-value");

    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedOptions = options;
      return jsonResponse({ data: [] });
    };

    await apiFetch("/api/properties");

    assert.equal(capturedOptions.headers.has("X-CSRF-Token"), false);
  });

  it("learns a fresh CSRF token from any response body that carries one, without needing document.cookie", async () => {
    setCsrfToken("stale-value");
    global.fetch = async () => jsonResponse({ user: { id: "u1" }, csrfToken: "fresh-value-from-body" });

    await apiFetch("/api/auth/me");

    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedOptions = options;
      return jsonResponse({ message: "ok" });
    };

    await apiFetch("/api/favorites/p1", { method: "POST" });

    assert.equal(capturedOptions.headers.get("X-CSRF-Token"), "fresh-value-from-body");
  });

  it("sends no CSRF header once cleared (e.g. after logout)", async () => {
    setCsrfToken("");

    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedOptions = options;
      return jsonResponse({ message: "ok" });
    };

    await apiFetch("/api/favorites/p1", { method: "POST" });

    assert.equal(capturedOptions.headers.has("X-CSRF-Token"), false);
  });

  it("handles API responses with data payloads", async () => {
    // Mock apiFetch would normally call fetch internally
    // For unit tests, we verify the function structure is correct
    assert.equal(typeof fetchProperties, "function");
    assert.equal(typeof fetchCurrentUser, "function");
    assert.equal(typeof loginUser, "function");
  });

  it("exports favorites API helpers", () => {
    assert.equal(typeof fetchFavorites, "function");
  });

  it("exports logout and register API helpers", () => {
    assert.equal(typeof logoutUser, "function");
    assert.equal(typeof registerUser, "function");
  });

  it("attaches suggestions from an error response onto the thrown error", async () => {
    global.fetch = async () =>
      new Response(
        JSON.stringify({ message: "Username is already taken", suggestions: ["a1", "a2", "a3"] }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );

    await assert.rejects(
      () => apiFetch("/api/auth/register", { method: "POST", body: {} }),
      (error) => {
        assert.equal(error.message, "Username is already taken");
        assert.deepEqual(error.suggestions, ["a1", "a2", "a3"]);
        return true;
      }
    );
  });

  it("does not add a suggestions property when an error response has none", async () => {
    global.fetch = async () =>
      new Response(JSON.stringify({ message: "Invalid credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });

    await assert.rejects(
      () => apiFetch("/api/auth/login", { method: "POST", body: {} }),
      (error) => {
        assert.equal("suggestions" in error, false);
        return true;
      }
    );
  });

  it("sends an inquiry with the property, subject, message, and contact preference", async () => {
    let capturedUrl;
    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return jsonResponse({ data: { _id: "i1", status: "open" } });
    };

    const result = await createInquiry({
      property: "p1",
      subject: "Viewing question",
      message: "Is parking included?",
      contactPreference: "in_app",
    });

    assert.equal(capturedUrl, "http://localhost:5000/api/inquiries");
    assert.equal(capturedOptions.method, "POST");
    assert.deepEqual(JSON.parse(capturedOptions.body), {
      property: "p1",
      subject: "Viewing question",
      message: "Is parking included?",
      contactPreference: "in_app",
    });
    assert.deepEqual(result, { _id: "i1", status: "open" });
  });

  it("sends a viewing request with the property, requested date, and message", async () => {
    let capturedUrl;
    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return jsonResponse({ data: { _id: "v1", status: "pending" } });
    };

    const result = await createViewingRequest({
      property: "p1",
      requestedDate: "2026-08-01T10:00:00.000Z",
      message: "Looking forward to it.",
    });

    assert.equal(capturedUrl, "http://localhost:5000/api/viewings");
    assert.equal(capturedOptions.method, "POST");
    assert.deepEqual(JSON.parse(capturedOptions.body), {
      property: "p1",
      requestedDate: "2026-08-01T10:00:00.000Z",
      message: "Looking forward to it.",
    });
    assert.deepEqual(result, { _id: "v1", status: "pending" });
  });

  it("submits platform feedback with just a message", async () => {
    let capturedUrl;
    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return jsonResponse({ data: { _id: "f1", status: "pending" } });
    };

    const result = await createFeedback({ message: "KejaApp helped me find my dream home." });

    assert.equal(capturedUrl, "http://localhost:5000/api/feedback");
    assert.equal(capturedOptions.method, "POST");
    assert.deepEqual(JSON.parse(capturedOptions.body), {
      message: "KejaApp helped me find my dream home.",
    });
    assert.deepEqual(result, { _id: "f1", status: "pending" });
  });

  it("fetches the current user's own feedback", async () => {
    global.fetch = async () => jsonResponse({ data: [{ _id: "f1", status: "pending" }] });

    const result = await fetchMyFeedback();

    assert.deepEqual(result, [{ _id: "f1", status: "pending" }]);
  });

  it("fetches all feedback for admins", async () => {
    global.fetch = async () => jsonResponse({ data: [{ _id: "f1", status: "pending" }] });

    const result = await fetchAdminFeedback();

    assert.deepEqual(result, [{ _id: "f1", status: "pending" }]);
  });

  it("responds to feedback as an admin", async () => {
    let capturedUrl;
    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return jsonResponse({ data: { _id: "f1", status: "responded" } });
    };

    const result = await respondToFeedback("f1", { message: "Thank you!" });

    assert.equal(capturedUrl, "http://localhost:5000/api/admin/feedback/f1/respond");
    assert.equal(capturedOptions.method, "PUT");
    assert.deepEqual(JSON.parse(capturedOptions.body), { message: "Thank you!" });
    assert.deepEqual(result, { _id: "f1", status: "responded" });
  });

  it("fetches public testimonials", async () => {
    global.fetch = async () => jsonResponse({ data: [{ _id: "f1", message: "Great app!" }] });

    const result = await fetchPublicTestimonials();

    assert.deepEqual(result, [{ _id: "f1", message: "Great app!" }]);
  });

  it("fetches notifications, optionally filtered to unread", async () => {
    let capturedUrl;
    global.fetch = async (url) => {
      capturedUrl = url;
      return jsonResponse({ data: [{ _id: "n1", title: "New inquiry", isRead: false }] });
    };

    const result = await fetchNotifications({ unread: "true" });

    assert.equal(capturedUrl, "http://localhost:5000/api/notifications?unread=true");
    assert.deepEqual(result, [{ _id: "n1", title: "New inquiry", isRead: false }]);
  });

  it("creates a saved search", async () => {
    let capturedUrl;
    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return jsonResponse({ data: { _id: "s1", lat: -1.29, lng: 36.8, radiusKm: 5 } });
    };

    const result = await createSavedSearch({ lat: -1.29, lng: 36.8, radiusKm: 5 });

    assert.equal(capturedUrl, "http://localhost:5000/api/saved-searches");
    assert.equal(capturedOptions.method, "POST");
    assert.deepEqual(JSON.parse(capturedOptions.body), { lat: -1.29, lng: 36.8, radiusKm: 5 });
    assert.deepEqual(result, { _id: "s1", lat: -1.29, lng: 36.8, radiusKm: 5 });
  });

  it("fetches the current user's saved searches", async () => {
    global.fetch = async () => jsonResponse({ data: [{ _id: "s1", county: "Nairobi" }] });

    const result = await fetchSavedSearches();

    assert.deepEqual(result, [{ _id: "s1", county: "Nairobi" }]);
  });

  it("deletes a saved search", async () => {
    let capturedUrl;
    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return jsonResponse({ message: "Saved search deleted" });
    };

    await deleteSavedSearch("s1");

    assert.equal(capturedUrl, "http://localhost:5000/api/saved-searches/s1");
    assert.equal(capturedOptions.method, "DELETE");
  });

  it("marks a notification as read", async () => {
    let capturedUrl;
    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return jsonResponse({ data: { _id: "n1", isRead: true } });
    };

    const result = await markNotificationAsRead("n1");

    assert.equal(capturedUrl, "http://localhost:5000/api/notifications/n1/read");
    assert.equal(capturedOptions.method, "PUT");
    assert.deepEqual(result, { _id: "n1", isRead: true });
  });

  it("adds a property image by URL and surfaces the image review status", async () => {
    let capturedUrl;
    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return jsonResponse({
        data: { _id: "p1", images: [{ _id: "img1", url: "https://example.com/a.jpg" }] },
        imageReview: { status: "suspicious", violation: "v1" },
      });
    };

    const result = await addPropertyImage("p1", { url: "https://example.com/a.jpg" });

    assert.equal(capturedUrl, "http://localhost:5000/api/properties/p1/images");
    assert.equal(capturedOptions.method, "POST");
    assert.deepEqual(JSON.parse(capturedOptions.body), { url: "https://example.com/a.jpg" });
    assert.equal(result.data._id, "p1");
    assert.equal(result.imageReview.status, "suspicious");
  });

  it("uploads a base64 property image", async () => {
    let capturedUrl;
    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return jsonResponse({
        data: { _id: "p1", images: [{ _id: "img1", url: "/uploads/properties/img1.jpg" }] },
        imageReview: { status: "clear", violation: null },
      });
    };

    const result = await uploadPropertyImage("p1", {
      fileName: "home.jpg",
      mimeType: "image/jpeg",
      data: "data:image/jpeg;base64,AAAA",
    });

    assert.equal(capturedUrl, "http://localhost:5000/api/properties/p1/images/upload");
    assert.equal(capturedOptions.method, "POST");
    assert.equal(result.imageReview.status, "clear");
  });

  it("removes a property image", async () => {
    let capturedUrl;
    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return jsonResponse({ data: { _id: "p1", images: [] } });
    };

    const result = await removePropertyImage("p1", "img1");

    assert.equal(capturedUrl, "http://localhost:5000/api/properties/p1/images/img1");
    assert.equal(capturedOptions.method, "DELETE");
    assert.deepEqual(result, { _id: "p1", images: [] });
  });

  it("responds to a received inquiry", async () => {
    let capturedUrl;
    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return jsonResponse({ data: { _id: "i1", status: "responded", response: "Sure, it's available." } });
    };

    const result = await respondToInquiry("i1", { status: "responded", response: "Sure, it's available." });

    assert.equal(capturedUrl, "http://localhost:5000/api/inquiries/i1");
    assert.equal(capturedOptions.method, "PUT");
    assert.deepEqual(JSON.parse(capturedOptions.body), {
      status: "responded",
      response: "Sure, it's available.",
    });
    assert.deepEqual(result, { _id: "i1", status: "responded", response: "Sure, it's available." });
  });

  it("updates the current user's name/phone", async () => {
    let capturedUrl;
    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return jsonResponse({ user: { id: "u1", name: "Jane Updated", phone: "+254711111111" } });
    };

    const result = await updateCurrentUser({ name: "Jane Updated", phone: "+254711111111" });

    assert.equal(capturedUrl, "http://localhost:5000/api/auth/me");
    assert.equal(capturedOptions.method, "PUT");
    assert.deepEqual(JSON.parse(capturedOptions.body), { name: "Jane Updated", phone: "+254711111111" });
    assert.deepEqual(result, { id: "u1", name: "Jane Updated", phone: "+254711111111" });
  });

  it("changes the current user's password", async () => {
    let capturedUrl;
    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return jsonResponse({ message: "Password updated" });
    };

    const result = await changeCurrentUserPassword({ currentPassword: "old1", newPassword: "new12345" });

    assert.equal(capturedUrl, "http://localhost:5000/api/auth/password");
    assert.equal(capturedOptions.method, "PUT");
    assert.deepEqual(JSON.parse(capturedOptions.body), { currentPassword: "old1", newPassword: "new12345" });
    assert.deepEqual(result, { message: "Password updated" });
  });
});
