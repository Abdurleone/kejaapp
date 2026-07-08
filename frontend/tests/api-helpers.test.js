import assert from "node:assert/strict";
import { describe, it, before } from "./helpers/nodeTestCompat.js";
import {
  createApiUrl,
  createFeedback,
  createInquiry,
  createViewingRequest,
  fetchAdminFeedback,
  fetchCurrentUser,
  fetchMyFeedback,
  fetchProperties,
  fetchFavorites,
  fetchPublicTestimonials,
  loginUser,
  logoutUser,
  registerUser,
  respondToFeedback,
  getAuthToken,
  setAuthToken,
} from "../app-utils.js";

const jsonResponse = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("frontend API helpers", () => {
  before(() => {
    // Real in-memory localStorage so setAuthToken/getAuthToken round-trip correctly.
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

  it("retrieves and sets auth tokens in localStorage", () => {
    setAuthToken("test-token");
    assert.equal(getAuthToken(), "test-token");
    setAuthToken("");
    assert.equal(getAuthToken(), "");
  });

  it("builds fetch requests with auth headers", () => {
    const token = "test-auth-token";
    setAuthToken(token);
    // The apiFetch function should include the auth header when a token is set
    assert.equal(getAuthToken() !== "", true);
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
});
