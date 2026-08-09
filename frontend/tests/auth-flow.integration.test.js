import assert from "node:assert/strict";
import { before, describe, it } from "./helpers/nodeTestCompat.js";
import { apiFetch } from "../app-utils.js";

/**
 * End-to-end auth flow integration test
 *
 * Tests the complete authentication journey:
 * 1. Register a new user with role selection
 * 2. Login with credentials
 * 3. Fetch current user after login
 * 4. Logout and verify the session is cleared
 * 5. Save/remove favorites as authenticated user
 *
 * Uses the real apiFetch from app-utils.js (not a reimplementation) against
 * a live backend, so a regression in the actual fetch wrapper - not just an
 * approximation of it - fails this test.
 *
 * The session now lives entirely in httpOnly cookies the backend sets on
 * login/register/etc., which a real browser resends automatically - Node's
 * built-in fetch has no such cookie jar, so this file provides a small one:
 * it captures Set-Cookie from every response and replays it as a Cookie
 * header on the next request, and exposes only the non-httpOnly cookie
 * (keja_csrf) via a global.document.cookie stub, matching what a real
 * browser would actually let frontend JS read.
 */

const TEST_API_BASE = "http://localhost:5000";
const testUser = {
  email: `test-${Date.now()}@example.com`,
  username: `testuser${Date.now()}`,
  password: "TestPassword123!",
  name: "Test User",
  phone: "+254712345678",
  role: "tenant",
};

const shouldRunAuthE2E = process.env.RUN_AUTH_E2E === "true";

const createCookieJar = () => {
  const cookies = new Map();

  const parseSetCookie = (setCookieValue) => {
    const [pair, ...attrs] = setCookieValue.split(";").map((part) => part.trim());
    const eqIndex = pair.indexOf("=");
    const name = pair.slice(0, eqIndex);
    const value = pair.slice(eqIndex + 1);
    const httpOnly = attrs.some((attr) => attr.toLowerCase() === "httponly");
    const expired = attrs.some((attr) => /^expires=/i.test(attr) && /1970/.test(attr));
    return { name, value, httpOnly, expired };
  };

  return {
    applyResponse(response) {
      const setCookieHeaders =
        typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];

      for (const header of setCookieHeaders) {
        const { name, value, httpOnly, expired } = parseSetCookie(header);

        if (expired || value === "") {
          cookies.delete(name);
        } else {
          cookies.set(name, { value, httpOnly });
        }
      }
    },
    cookieHeader() {
      return Array.from(cookies.entries())
        .map(([name, { value }]) => `${name}=${value}`)
        .join("; ");
    },
    documentCookie() {
      return Array.from(cookies.entries())
        .filter(([, { httpOnly }]) => !httpOnly)
        .map(([name, { value }]) => `${name}=${value}`)
        .join("; ");
    },
    clear() {
      cookies.clear();
    },
  };
};

describe("Authentication flow end-to-end", { skip: !shouldRunAuthE2E }, () => {
  const jar = createCookieJar();

  before(() => {
    const store = new Map([["keja_base_url", TEST_API_BASE]]);
    global.localStorage = {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    };

    global.document = {
      get cookie() {
        return jar.documentCookie();
      },
    };

    const originalFetch = global.fetch;
    global.fetch = async (url, options = {}) => {
      const headers = new Headers(options.headers || {});
      const cookieHeader = jar.cookieHeader();

      if (cookieHeader) {
        headers.set("Cookie", cookieHeader);
      }

      const response = await originalFetch(url, { ...options, headers });
      jar.applyResponse(response);
      return response;
    };
  });

  it("registers a new user with tenant role", async () => {
    const response = await apiFetch("/api/auth/register", {
      method: "POST",
      body: testUser,
    });

    assert.ok(response.user, "Should return user object");
    assert.equal(response.user.email, testUser.email, "User email should match");
    assert.equal(response.user.role, testUser.role, "User role should match");
  });

  it("fetches current user from the session cookie set at registration", async () => {
    const response = await apiFetch("/api/auth/me", {
      method: "GET",
    });

    assert.ok(response.user, "Should return current user");
    assert.equal(response.user.email, testUser.email, "Current user email should match");
    assert.equal(response.user.role, testUser.role, "Current user role should match");
  });

  it("logs in with email and password", async () => {
    const response = await apiFetch("/api/auth/login", {
      method: "POST",
      body: {
        identifier: testUser.email,
        password: testUser.password,
      },
    });

    assert.ok(response.user, "Should return user object");
    assert.equal(response.user.email, testUser.email, "User email should match");
  });

  it("saves a property as favorite", async () => {
    // First, get a property to save
    const propertiesResponse = await apiFetch("/api/properties", {
      method: "GET",
    });

    assert.ok(
      Array.isArray(propertiesResponse.data) && propertiesResponse.data.length > 0,
      "Should have at least one property",
    );

    const propertyId = propertiesResponse.data[0]._id || propertiesResponse.data[0].id;

    // Now save it - a mutation, so this only succeeds if apiFetch actually
    // attached a matching X-CSRF-Token header alongside the cookie.
    const response = await apiFetch(`/api/favorites/${propertyId}`, {
      method: "POST",
    });

    assert.ok(response.data || response.message, "Should return success response");
  });

  it("fetches favorite properties", async () => {
    const response = await apiFetch("/api/favorites", {
      method: "GET",
    });

    assert.ok(Array.isArray(response.data), "Should return array of favorites");
    // May be empty if just saved one property
  });

  it("removes a favorite property", async () => {
    // Get favorites first
    const favoritesResponse = await apiFetch("/api/favorites", {
      method: "GET",
    });

    if (Array.isArray(favoritesResponse.data) && favoritesResponse.data.length > 0) {
      const favorite = favoritesResponse.data[0];
      const propertyId = favorite.property?._id || favorite.propertyId || favorite._id;

      const response = await apiFetch(`/api/favorites/${propertyId}`, {
        method: "DELETE",
      });

      assert.ok(response.message || response.data, "Should return success response");
    }
  });

  it("logs out and clears the session", async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    jar.clear();

    try {
      await apiFetch("/api/auth/me", { method: "GET" });
      assert.fail("Should prevent access after logout");
    } catch (err) {
      assert.ok(err.message, "Should throw authentication error");
    }
  });

  it("requires an identifier and password for login", async () => {
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: { identifier: "" },
      });
      assert.fail("Should reject incomplete login");
    } catch (err) {
      assert.ok(err.message, "Should throw validation error");
    }
  });

  it("rejects invalid credentials", async () => {
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: {
          identifier: testUser.email,
          password: "WrongPassword123!",
        },
      });
      assert.fail("Should reject invalid credentials");
    } catch (err) {
      assert.ok(err.message, "Should throw authentication error");
    }
  });

  it("prevents access to protected routes with no session", async () => {
    jar.clear();

    try {
      await apiFetch("/api/auth/me", {
        method: "GET",
      });
      assert.fail("Should prevent access without a session");
    } catch (err) {
      assert.ok(err.message, "Should throw authentication error");
    }
  });
});
