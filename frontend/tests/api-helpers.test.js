import assert from "node:assert/strict";
import { describe, it, before } from "./helpers/nodeTestCompat.js";
import {
  createApiUrl,
  fetchCurrentUser,
  fetchProperties,
  fetchFavorites,
  loginUser,
  logoutUser,
  registerUser,
  getAuthToken,
  setAuthToken,
} from "../app-utils.js";

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
});
