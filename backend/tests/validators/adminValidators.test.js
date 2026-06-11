import assert from "node:assert/strict";
import { describe, it } from "node:test";
import validateRequest from "../../middlewares/validateRequest.js";
import { rejectAgencyVerificationSchema } from "../../validators/adminValidators.js";

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

  validateRequest(rejectAgencyVerificationSchema)({ body }, res, () => {
    nextCalled = true;
  });

  return { nextCalled, res };
};

describe("adminValidators", () => {
  it("requires rejection reason", () => {
    const { res } = validate({});

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, ["reason is required"]);
  });

  it("accepts a valid rejection reason", () => {
    const { nextCalled } = validate({
      reason: "Missing registration documents",
    });

    assert.equal(nextCalled, true);
  });
});
