import assert from "node:assert/strict";
import { describe, it } from "node:test";
import validateRequest from "../../middlewares/validateRequest.js";
import { createFeedbackSchema, respondToFeedbackSchema } from "../../validators/feedbackValidators.js";

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

describe("feedbackValidators", () => {
  it("rejects blank and oversized feedback messages", () => {
    const blank = validate(createFeedbackSchema, { message: "   " });
    const oversized = validate(createFeedbackSchema, { message: "x".repeat(1001) });

    assert.equal(blank.res.statusCode, 400);
    assert.deepEqual(blank.res.body.errors, ["message is required"]);
    assert.equal(oversized.res.statusCode, 400);
    assert.deepEqual(oversized.res.body.errors, ["message must be 1000 characters or fewer"]);
  });

  it("accepts a valid feedback payload", () => {
    const { nextCalled } = validate(createFeedbackSchema, {
      message: "JakezApp helped me find my dream home.",
    });

    assert.equal(nextCalled, true);
  });

  it("rejects blank and oversized admin responses", () => {
    const blank = validate(respondToFeedbackSchema, { message: "   " });
    const oversized = validate(respondToFeedbackSchema, { message: "x".repeat(1001) });

    assert.equal(blank.res.statusCode, 400);
    assert.deepEqual(blank.res.body.errors, ["message is required"]);
    assert.equal(oversized.res.statusCode, 400);
    assert.deepEqual(oversized.res.body.errors, ["message must be 1000 characters or fewer"]);
  });

  it("accepts a valid admin response", () => {
    const { nextCalled } = validate(respondToFeedbackSchema, {
      message: "Thank you for sharing your experience!",
    });

    assert.equal(nextCalled, true);
  });
});
