import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { roleGroups } from "../../constants/rbac.js";
import { authorize, authorizeGroup } from "../../middlewares/authMiddleware.js";

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

  it("authorizes shared role groups", () => {
    const req = {
      user: {
        role: "agency",
      },
    };
    let nextCalled = false;

    authorizeGroup(roleGroups.listingManagers)(req, {}, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it("rejects roles outside a shared role group", () => {
    const req = {
      user: {
        role: "landlord",
      },
    };

    assert.throws(
      () => authorizeGroup(roleGroups.tenantOnly)(req, {}, () => {}),
      {
        message: "Not authorized for this resource",
        statusCode: 403,
      }
    );
  });
});
