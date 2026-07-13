import assert from "node:assert/strict";
import { describe, it } from "./helpers/nodeTestCompat.js";
import {
  clearRequestCache,
  createFeedback,
  createProperty,
  fetchAdminFeedback,
  fetchAdminReviews,
  fetchAdminUsers,
  fetchDashboardSummary,
  fetchFavorites,
  fetchMyFeedback,
  fetchMyProperties,
  fetchProperties,
  fetchPropertyById,
  fetchReceivedInquiries,
  loginUser,
  removeFavorite,
  respondToFeedback,
  saveFavorite,
  updateAdminUserStatus,
  updateProperty,
} from "../app-utils.js";

describe("frontend request cache", () => {
  const setupEnv = () => {
    const store = {};
    global.localStorage = {
      getItem: (key) => (key === "keja_base_url" ? "http://localhost:5000" : store[key] || null),
      setItem: (key, value) => {
        store[key] = value;
      },
      removeItem: (key) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((key) => delete store[key]);
      },
    };
  };

  const jsonResponse = (body) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  it("reuses a cached properties response within the TTL window", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      return jsonResponse({ data: [{ _id: "p1" }] });
    };

    const first = await fetchProperties({ page: 1 });
    const second = await fetchProperties({ page: 1 });

    assert.equal(calls, 1);
    assert.deepEqual(first, second);
  });

  it("reuses a cached single-property response within the TTL window", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      return jsonResponse({ data: { _id: "p1", title: "Test Property" } });
    };

    const first = await fetchPropertyById("p1");
    const second = await fetchPropertyById("p1");

    assert.equal(calls, 1);
    assert.deepEqual(first, second);
  });

  it("reuses a cached my-properties response within the TTL window", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    let capturedUrl;
    global.fetch = async (url) => {
      calls += 1;
      capturedUrl = url;
      return jsonResponse({
        data: [{ _id: "p1", title: "My Property" }],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      });
    };

    const first = await fetchMyProperties();
    const second = await fetchMyProperties();

    assert.equal(calls, 1);
    assert.equal(capturedUrl, "http://localhost:5000/api/properties/mine");
    assert.deepEqual(first, second);
    assert.deepEqual(first.properties, [{ _id: "p1", title: "My Property" }]);
    assert.deepEqual(first.pagination, { page: 1, limit: 20, total: 1, pages: 1 });
  });

  it("reuses a cached received-inquiries response within the TTL window", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    let capturedUrl;
    global.fetch = async (url) => {
      calls += 1;
      capturedUrl = url;
      return jsonResponse({
        data: [{ _id: "i1", subject: "Question" }],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      });
    };

    const first = await fetchReceivedInquiries();
    const second = await fetchReceivedInquiries();

    assert.equal(calls, 1);
    assert.equal(capturedUrl, "http://localhost:5000/api/inquiries/received");
    assert.deepEqual(first, second);
    assert.deepEqual(first.inquiries, [{ _id: "i1", subject: "Question" }]);
    assert.deepEqual(first.pagination, { page: 1, limit: 20, total: 1, pages: 1 });
  });

  it("reuses a cached dashboard-summary response within the TTL window", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    let capturedUrl;
    global.fetch = async (url) => {
      calls += 1;
      capturedUrl = url;
      return jsonResponse({ data: { role: "tenant", notifications: { unread: 2 } } });
    };

    const first = await fetchDashboardSummary();
    const second = await fetchDashboardSummary();

    assert.equal(calls, 1);
    assert.equal(capturedUrl, "http://localhost:5000/api/dashboard/summary");
    assert.deepEqual(first, second);
  });

  it("reuses a cached admin-users response within the TTL window", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    let capturedUrl;
    global.fetch = async (url) => {
      calls += 1;
      capturedUrl = url;
      return jsonResponse({ data: [{ _id: "u1", role: "tenant" }], pagination: { page: 1, pages: 1, total: 1 } });
    };

    const first = await fetchAdminUsers();
    const second = await fetchAdminUsers();

    assert.equal(calls, 1);
    assert.equal(capturedUrl, "http://localhost:5000/api/admin/users");
    assert.deepEqual(first, second);
  });

  it("invalidates the admin-users cache after updating an account status", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    global.fetch = async (url) => {
      calls += 1;

      if (url.endsWith("/status")) {
        return jsonResponse({ data: { _id: "u1", role: "tenant", accountStatus: "suspended" } });
      }

      return jsonResponse({ data: [{ _id: "u1" }], pagination: { page: 1, pages: 1, total: 1 } });
    };

    await fetchAdminUsers();
    await updateAdminUserStatus("u1", { status: "suspended", reason: "Reported by multiple tenants" });
    await fetchAdminUsers();

    assert.equal(calls, 3);
  });

  it("reuses a cached admin-reviews response within the TTL window", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    let capturedUrl;
    global.fetch = async (url) => {
      calls += 1;
      capturedUrl = url;
      return jsonResponse({ data: [{ _id: "r1", rating: 5 }] });
    };

    const first = await fetchAdminReviews();
    const second = await fetchAdminReviews();

    assert.equal(calls, 1);
    assert.equal(capturedUrl, "http://localhost:5000/api/admin/reviews");
    assert.deepEqual(first, second);
  });

  it("reuses a cached my-feedback response within the TTL window", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    let capturedUrl;
    global.fetch = async (url) => {
      calls += 1;
      capturedUrl = url;
      return jsonResponse({ data: [{ _id: "f1", status: "pending" }] });
    };

    const first = await fetchMyFeedback();
    const second = await fetchMyFeedback();

    assert.equal(calls, 1);
    assert.equal(capturedUrl, "http://localhost:5000/api/feedback/mine");
    assert.deepEqual(first, second);
  });

  it("invalidates the my-feedback cache after submitting new feedback", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    global.fetch = async (url, options = {}) => {
      calls += 1;
      return options.method === "POST"
        ? jsonResponse({ data: { _id: "f2", status: "pending" } })
        : jsonResponse({ data: [{ _id: "f1", status: "pending" }] });
    };

    await fetchMyFeedback();
    await createFeedback({ message: "KejaApp helped me find my dream home." });
    await fetchMyFeedback();

    assert.equal(calls, 3, "the second read after submitting should not be served from stale cache");
  });

  it("invalidates the admin-feedback and my-feedback caches after responding", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    global.fetch = async (url) => {
      calls += 1;

      if (url.endsWith("/respond")) {
        return jsonResponse({ data: { _id: "f1", status: "responded" } });
      }

      return jsonResponse({ data: [{ _id: "f1", status: "pending" }] });
    };

    await fetchAdminFeedback();
    await fetchMyFeedback();
    await respondToFeedback("f1", { message: "Thank you!" });
    await fetchAdminFeedback();
    await fetchMyFeedback();

    assert.equal(calls, 5, "the reads after responding should not be served from stale cache");
  });

  it("issues a fresh request for a different query", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      return jsonResponse({ data: [] });
    };

    await fetchProperties({ page: 1 });
    await fetchProperties({ page: 2 });

    assert.equal(calls, 2);
  });

  it("invalidates the my-properties cache after creating a listing", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    let capturedCreateUrl;
    global.fetch = async (url, options = {}) => {
      calls += 1;
      if (options.method === "POST") capturedCreateUrl = url;
      return options.method === "POST"
        ? jsonResponse({ data: { _id: "p2", title: "New Property" } })
        : jsonResponse({ data: [{ _id: "p1", title: "Existing Property" }] });
    };

    await fetchMyProperties();
    await createProperty({ title: "New Property", price: { rent: 10000 } });
    await fetchMyProperties();

    assert.equal(calls, 3, "the second read after creating should not be served from stale cache");
    assert.equal(capturedCreateUrl, "http://localhost:5000/api/properties");
  });

  it("invalidates the property and my-properties caches after an edit", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    global.fetch = async (url, options = {}) => {
      calls += 1;
      return options.method === "PUT"
        ? jsonResponse({ data: { _id: "p1", title: "Updated Property" } })
        : jsonResponse({ data: [{ _id: "p1", title: "Original Property" }] });
    };

    await fetchPropertyById("p1");
    await fetchMyProperties();
    await updateProperty("p1", { title: "Updated Property" });
    await fetchPropertyById("p1");
    await fetchMyProperties();

    assert.equal(calls, 5, "the two reads after the edit should not be served from stale cache");
  });

  it("invalidates the favorites cache after saving a favorite", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    global.fetch = async (url, options = {}) => {
      calls += 1;
      return options.method === "POST" ? jsonResponse({ data: { _id: "f1" } }) : jsonResponse({ data: [] });
    };

    await fetchFavorites();
    await saveFavorite("p1");
    await fetchFavorites();

    assert.equal(calls, 3);
  });

  it("invalidates the favorites cache after removing a favorite", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    global.fetch = async (url, options = {}) => {
      calls += 1;
      return options.method === "DELETE" ? jsonResponse({}) : jsonResponse({ data: [] });
    };

    await fetchFavorites();
    await removeFavorite("p1");
    await fetchFavorites();

    assert.equal(calls, 3);
  });

  it("clears the entire cache on login", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    global.fetch = async (url) => {
      calls += 1;
      return url.includes("/api/auth/login")
        ? jsonResponse({ token: "tok", user: { id: "u1" } })
        : jsonResponse({ data: [] });
    };

    await fetchProperties({ page: 1 });
    await loginUser({ identifier: "a@b.com", password: "password123" });
    await fetchProperties({ page: 1 });

    assert.equal(calls, 3);
  });

  it("evicts the oldest cached entry once the cache exceeds its size cap", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      return jsonResponse({ data: [] });
    };

    // The cap is 200 entries; filling 201 distinct queries should push out
    // the very first one instead of growing the cache forever.
    for (let page = 0; page <= 200; page += 1) {
      await fetchProperties({ page });
    }

    const callsBeforeRecheck = calls;

    await fetchProperties({ page: 0 });
    assert.equal(calls, callsBeforeRecheck + 1, "the oldest query should have been evicted, forcing a fresh fetch");

    await fetchProperties({ page: 200 });
    assert.equal(calls, callsBeforeRecheck + 1, "the most recent query should still be cached");
  });
});
