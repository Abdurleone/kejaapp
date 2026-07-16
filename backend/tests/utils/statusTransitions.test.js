import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertValidTransition } from "../../utils/statusTransitions.js";

const allowedFromByTarget = {
  approved: ["pending"],
  cancelled: ["pending", "approved"],
};

describe("assertValidTransition", () => {
  it("allows a transition present in the target's allowed-from list", () => {
    assert.doesNotThrow(() => assertValidTransition("pending", "approved", allowedFromByTarget));
    assert.doesNotThrow(() => assertValidTransition("approved", "cancelled", allowedFromByTarget));
  });

  it("rejects a transition from a status not in the target's allowed-from list", () => {
    assert.throws(
      () => assertValidTransition("cancelled", "approved", allowedFromByTarget),
      /Cannot change status from "cancelled" to "approved"/
    );
  });

  it("rejects a target status with no entry in the map at all", () => {
    assert.throws(
      () => assertValidTransition("pending", "completed", allowedFromByTarget),
      /Cannot change status from "pending" to "completed"/
    );
  });

  it("throws a 400 ApiError", () => {
    try {
      assertValidTransition("cancelled", "approved", allowedFromByTarget);
      assert.fail("expected assertValidTransition to throw");
    } catch (err) {
      assert.equal(err.statusCode, 400);
    }
  });
});
