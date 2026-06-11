import assert from "node:assert/strict";
import { describe, it } from "node:test";
import validateRequest from "../../middlewares/validateRequest.js";
import { updateViolationStatusSchema } from "../../validators/violationValidators.js";

const validate = (body) => {
  const res = {
    body: null,
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  let nextCalled = false;

  validateRequest(updateViolationStatusSchema)({ body }, res, () => {
    nextCalled = true;
  });

  return { nextCalled, res };
};

describe("violationValidators", () => {
  it("requires supported violation statuses", () => {
    const { res } = validate({ status: "confirmed" });

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, ["status must be one of: open, reviewed, dismissed"]);
  });

  it("accepts a valid violation update", () => {
    const { nextCalled } = validate({
      status: "reviewed",
      notes: "Confirmed duplicate image reuse.",
    });

    assert.equal(nextCalled, true);
  });
});
