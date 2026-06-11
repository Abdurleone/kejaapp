import assert from "node:assert/strict";
import { describe, it } from "node:test";
import validateRequest from "../../middlewares/validateRequest.js";
import {
  rejectAgencyVerificationSchema,
  updateUserStatusSchema,
} from "../../validators/adminValidators.js";

const validate = (schema, body) => {
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

  validateRequest(schema)({ body }, res, () => {
    nextCalled = true;
  });

  return { nextCalled, res };
};

describe("adminValidators", () => {
  it("requires rejection reason", () => {
    const { res } = validate(rejectAgencyVerificationSchema, {});

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, ["reason is required"]);
  });

  it("accepts a valid rejection reason", () => {
    const { nextCalled } = validate(rejectAgencyVerificationSchema, {
      reason: "Missing registration documents",
    });

    assert.equal(nextCalled, true);
  });

  it("requires supported user account statuses", () => {
    const { res } = validate(updateUserStatusSchema, { status: "locked" });

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, ["status must be one of: active, suspended, banned"]);
  });

  it("accepts a valid user account status update", () => {
    const { nextCalled } = validate(updateUserStatusSchema, {
      status: "suspended",
      reason: "Repeated duplicate listing uploads",
    });

    assert.equal(nextCalled, true);
  });
});
