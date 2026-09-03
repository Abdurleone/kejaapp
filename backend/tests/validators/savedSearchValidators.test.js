import assert from "node:assert/strict";
import { describe, it } from "node:test";
import validateRequest from "../../middlewares/validateRequest.js";
import { createSavedSearchSchema } from "../../validators/savedSearchValidators.js";

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

describe("savedSearchValidators", () => {
  it("rejects a property type outside the fixed enum", () => {
    const { res } = validate(createSavedSearchSchema, { type: "mansion" });

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, [
      "type must be one of: apartment, bedsitter, maisonette, house, studio, other",
    ]);
  });

  it("rejects non-integer and negative bedrooms", () => {
    const { res } = validate(createSavedSearchSchema, { bedrooms: 2.5 });

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, ["bedrooms must be a whole number 0 or greater"]);
  });

  it("rejects a negative radiusKm", () => {
    const { res } = validate(createSavedSearchSchema, { radiusKm: -5 });

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, ["radiusKm must be greater than 0"]);
  });

  it("rejects negative rent bounds", () => {
    const { res } = validate(createSavedSearchSchema, { minRent: -1, maxRent: -1 });

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, ["minRent must be 0 or greater", "maxRent must be 0 or greater"]);
  });

  it("accepts a valid saved-search payload", () => {
    const { nextCalled } = validate(createSavedSearchSchema, {
      type: "apartment",
      bedrooms: 2,
      county: "Nairobi",
      town: "Westlands",
      minRent: 20000,
      maxRent: 60000,
      lat: -1.29,
      lng: 36.82,
      radiusKm: 5,
    });

    assert.equal(nextCalled, true);
  });

  it("accepts an empty payload - every field is optional", () => {
    const { nextCalled } = validate(createSavedSearchSchema, {});

    assert.equal(nextCalled, true);
  });
});
