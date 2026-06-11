import assert from "node:assert/strict";
import { describe, it } from "node:test";
import validateRequest from "../../middlewares/validateRequest.js";
import { createReviewSchema } from "../../validators/reviewValidators.js";

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

  validateRequest(createReviewSchema)({ body }, res, () => {
    nextCalled = true;
  });

  return { nextCalled, res };
};

describe("reviewValidators", () => {
  it("rejects missing property and out-of-range rating", () => {
    const { res } = validate({
      rating: 6,
    });

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, [
      "property is required",
      "rating must be an integer between 1 and 5",
    ]);
  });

  it("accepts a valid review payload", () => {
    const { nextCalled } = validate({
      property: "000000000000000000000000",
      rating: 5,
      comment: "Great property.",
    });

    assert.equal(nextCalled, true);
  });
});
