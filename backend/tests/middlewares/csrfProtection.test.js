import assert from "node:assert/strict";
import { describe, it } from "node:test";
import csrfProtection from "../../middlewares/csrfProtection.js";

const baseReq = (overrides) => ({ originalUrl: "/api/properties", headers: {}, ...overrides });

describe("csrfProtection", () => {
  it("allows unsafe methods that carry an Authorization: Bearer header", () => {
    const req = baseReq({ method: "POST", headers: { authorization: "Bearer abc.def.ghi" } });
    let nextCalled = false;

    csrfProtection(req, {}, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it("allows safe methods (GET) even when only the session cookie is present", () => {
    const req = baseReq({ method: "GET", headers: { cookie: "keja_token=abc" } });
    let nextCalled = false;

    csrfProtection(req, {}, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it("allows unsafe methods with no Authorization header when there's no session cookie either", () => {
    const req = baseReq({ method: "POST" });
    let nextCalled = false;

    csrfProtection(req, {}, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    it(`rejects a cookie-only ${method} request with no Authorization header (CSRF guard)`, () => {
      const req = baseReq({ method, headers: { cookie: "keja_token=abc; other=1" } });

      assert.throws(
        () => csrfProtection(req, {}, () => {}),
        {
          message: "This request must be authenticated with an Authorization header or a matching CSRF token",
          statusCode: 403,
        }
      );
    });
  }

  it("rejects a refresh-cookie-only request to a non-refresh route the same way (CSRF guard)", () => {
    const req = baseReq({ method: "DELETE", headers: { cookie: "keja_refresh=abc" } });

    assert.throws(
      () => csrfProtection(req, {}, () => {}),
      { statusCode: 403 }
    );
  });

  it("rejects a forged POST /api/auth/refresh relying only on the refresh cookie", () => {
    const req = baseReq({
      method: "POST",
      originalUrl: "/api/auth/refresh",
      headers: { cookie: "keja_refresh=abc" },
      body: {},
    });

    assert.throws(
      () => csrfProtection(req, {}, () => {}),
      {
        message: "This request must be authenticated with an Authorization header or a matching CSRF token",
        statusCode: 403,
      }
    );
  });

  for (const path of ["/api/auth/login", "/api/auth/register", "/api/auth/google"]) {
    it(`allows POST ${path} even with a stale, mismatched auth/refresh cookie present (login/register can't require proof of a session they're about to create)`, () => {
      const req = baseReq({
        method: "POST",
        originalUrl: path,
        headers: { cookie: "keja_token=stale-value; keja_refresh=stale-value" },
        body: {},
      });
      let nextCalled = false;

      csrfProtection(req, {}, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
    });
  }

  it("allows POST /api/auth/refresh when the refresh token is supplied in the body, even with the cookie also present", () => {
    const req = baseReq({
      method: "POST",
      originalUrl: "/api/auth/refresh",
      headers: { cookie: "keja_refresh=abc" },
      body: { refreshToken: "a-real-refresh-token" },
    });
    let nextCalled = false;

    csrfProtection(req, {}, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it("allows an unsafe request whose X-CSRF-Token header matches the csrf cookie (web's cookie-only auth path)", () => {
    const req = baseReq({
      method: "POST",
      headers: {
        cookie: "keja_token=abc; keja_csrf=matching-csrf-value",
        "x-csrf-token": "matching-csrf-value",
      },
    });
    let nextCalled = false;

    csrfProtection(req, {}, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it("rejects an unsafe request whose X-CSRF-Token header doesn't match the csrf cookie", () => {
    const req = baseReq({
      method: "POST",
      headers: {
        cookie: "keja_token=abc; keja_csrf=real-csrf-value",
        "x-csrf-token": "attacker-guessed-value",
      },
    });

    assert.throws(
      () => csrfProtection(req, {}, () => {}),
      { statusCode: 403 }
    );
  });

  it("rejects an unsafe request with the csrf cookie but no X-CSRF-Token header (what a forged cross-site request looks like)", () => {
    const req = baseReq({
      method: "POST",
      headers: { cookie: "keja_token=abc; keja_csrf=real-csrf-value" },
    });

    assert.throws(
      () => csrfProtection(req, {}, () => {}),
      { statusCode: 403 }
    );
  });

  it("rejects an unsafe request with an X-CSRF-Token header but no matching cookie", () => {
    const req = baseReq({
      method: "POST",
      headers: { cookie: "keja_token=abc", "x-csrf-token": "no-cookie-to-match" },
    });

    assert.throws(
      () => csrfProtection(req, {}, () => {}),
      { statusCode: 403 }
    );
  });
});
