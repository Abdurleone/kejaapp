import assert from "node:assert/strict";
import { describe, it } from "node:test";
import validateRequest from "../../middlewares/validateRequest.js";
import {
  createReviewSchema,
  updateReviewResponseSchema,
} from "../../validators/reviewValidators.js";

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

describe("reviewValidators", () => {
  it("rejects missing property and out-of-range rating", () => {
    const { res } = validate(createReviewSchema, {
      rating: 6,
    });

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, [
      "property is required",
      "rating must be an integer between 1 and 5",
    ]);
  });

  it("accepts a valid review payload", () => {
    const { nextCalled } = validate(createReviewSchema, {
      property: "000000000000000000000000",
      rating: 5,
      comment: "Great property.",
    });

    assert.equal(nextCalled, true);
  });

  it("rejects blank and oversized owner review responses", () => {
    const blank = validate(updateReviewResponseSchema, {
      message: "   ",
    });
    const oversized = validate(updateReviewResponseSchema, {
      message: "x".repeat(1001),
    });

    assert.equal(blank.res.statusCode, 400);
    assert.deepEqual(blank.res.body.errors, ["message is required"]);
    assert.equal(oversized.res.statusCode, 400);
    assert.deepEqual(oversized.res.body.errors, ["message must be 1000 characters or fewer"]);
  });

  it("accepts a valid owner review response", () => {
    const { nextCalled } = validate(updateReviewResponseSchema, {
      message: "Thank you for the feedback.",
    });

    assert.equal(nextCalled, true);
  });
});
