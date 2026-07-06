import assert from "node:assert/strict";
import { describe, it } from "./helpers/nodeTestCompat.js";
import {
  clearRequestCache,
  fetchDashboardSummary,
  fetchFavorites,
  fetchMyProperties,
  fetchProperties,
  fetchPropertyById,
  fetchReceivedInquiries,
  loginUser,
  removeFavorite,
  saveFavorite,
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
      return jsonResponse({ data: [{ _id: "p1", title: "My Property" }] });
    };

    const first = await fetchMyProperties();
    const second = await fetchMyProperties();

    assert.equal(calls, 1);
    assert.equal(capturedUrl, "http://localhost:5000/api/properties/mine");
    assert.deepEqual(first, second);
  });

  it("reuses a cached received-inquiries response within the TTL window", async () => {
    setupEnv();
    clearRequestCache();
    let calls = 0;
    let capturedUrl;
    global.fetch = async (url) => {
      calls += 1;
      capturedUrl = url;
      return jsonResponse({ data: [{ _id: "i1", subject: "Question" }] });
    };

    const first = await fetchReceivedInquiries();
    const second = await fetchReceivedInquiries();

    assert.equal(calls, 1);
    assert.equal(capturedUrl, "http://localhost:5000/api/inquiries/received");
    assert.deepEqual(first, second);
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
    await loginUser({ email: "a@b.com", password: "password123" });
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
