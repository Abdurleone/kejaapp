import assert from "node:assert/strict";
import { describe, it } from "node:test";
import csrfProtection from "../../middlewares/csrfProtection.js";

describe("csrfProtection", () => {
  it("allows unsafe methods that carry an Authorization: Bearer header", () => {
    const req = { method: "POST", headers: { authorization: "Bearer abc.def.ghi" } };
    let nextCalled = false;

    csrfProtection(req, {}, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it("allows safe methods (GET) even when only the session cookie is present", () => {
    const req = { method: "GET", headers: { cookie: "keja_token=abc" } };
    let nextCalled = false;

    csrfProtection(req, {}, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it("allows unsafe methods with no Authorization header when there's no session cookie either", () => {
    const req = { method: "POST", headers: {} };
    let nextCalled = false;

    csrfProtection(req, {}, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    it(`rejects a cookie-only ${method} request with no Authorization header (CSRF guard)`, () => {
      const req = { method, headers: { cookie: "keja_token=abc; other=1" } };

      assert.throws(
        () => csrfProtection(req, {}, () => {}),
        {
          message: "This request must be authenticated with an Authorization header",
          statusCode: 403,
        }
      );
    });
  }
});
