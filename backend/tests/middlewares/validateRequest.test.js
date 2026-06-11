import assert from "node:assert/strict";
import { describe, it } from "node:test";
import validateRequest from "../../middlewares/validateRequest.js";

const createResponse = () => ({
  body: null,
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const runValidation = (schema, body) => {
  const req = { body };
  const res = createResponse();
  let nextCalled = false;

  validateRequest(schema)(req, res, () => {
    nextCalled = true;
  });

  return {
    nextCalled,
    res,
  };
};

describe("validateRequest", () => {
  it("reports required and type validation errors", () => {
    const { nextCalled, res } = runValidation(
      {
        email: { required: true, type: "string" },
        age: { type: "number" },
      },
      {
        age: "old",
      }
    );

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, ["email is required", "age must be a number"]);
  });

  it("validates arrays and enum values", () => {
    const { res } = runValidation(
      {
        documents: { type: "array" },
        role: { type: "string", enum: ["tenant", "agency"] },
      },
      {
        documents: {},
        role: "admin",
      }
    );

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, [
      "documents must be an array",
      "role must be one of: tenant, agency",
    ]);
  });

  it("runs custom validators and calls next for valid payloads", () => {
    const invalid = runValidation(
      {
        rating: {
          type: "number",
          validate(value) {
            return value < 1 || value > 5 ? "rating must be between 1 and 5" : null;
          },
        },
      },
      { rating: 6 }
    );

    assert.equal(invalid.res.statusCode, 400);
    assert.deepEqual(invalid.res.body.errors, ["rating must be between 1 and 5"]);

    const valid = runValidation(
      {
        rating: {
          type: "number",
          validate(value) {
            return value < 1 || value > 5 ? "rating must be between 1 and 5" : null;
          },
        },
      },
      { rating: 5 }
    );

    assert.equal(valid.nextCalled, true);
  });
});
