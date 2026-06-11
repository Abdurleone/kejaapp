import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authorize } from "../../middlewares/authMiddleware.js";

describe("authMiddleware authorize", () => {
  it("allows users with an accepted role", () => {
    const req = {
      user: {
        role: "admin",
      },
    };
    let nextCalled = false;

    authorize("admin")(req, {}, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it("rejects users without an accepted role", () => {
    const req = {
      user: {
        role: "tenant",
      },
    };

    assert.throws(
      () => authorize("admin")(req, {}, () => {}),
      {
        message: "Not authorized for this resource",
        statusCode: 403,
      }
    );
  });
});
