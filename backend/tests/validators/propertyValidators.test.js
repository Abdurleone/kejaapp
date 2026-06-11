import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  costCalculationSchema,
  createPropertySchema,
  updatePropertySchema,
} from "../../validators/propertyValidators.js";

describe("propertyValidators", () => {
  it("requires rent when creating stored property prices", () => {
    const message = createPropertySchema.price.validate({
      deposit: 65000,
    });

    assert.equal(message, "price.rent is required and must be a number");
  });

  it("requires rent when calculating property costs", () => {
    const message = costCalculationSchema.price.validate({
      agencyFee: 5000,
    });

    assert.equal(message, "price.rent is required and must be a number");
  });

  it("allows partial prices when property owners update listings", () => {
    const message = updatePropertySchema.price.validate({
      agencyFee: 5000,
    });

    assert.equal(message, null);
  });

  it("rejects negative price fields", () => {
    const message = updatePropertySchema.price.validate({
      deposit: -1,
    });

    assert.equal(message, "price.deposit must be a number greater than or equal to 0");
  });

  it("allows open and scheduled viewing types", () => {
    assert.deepEqual(createPropertySchema.viewingType.enum, ["scheduled", "open"]);
    assert.deepEqual(updatePropertySchema.viewingType.enum, ["scheduled", "open"]);
  });

  it("limits viewing instructions", () => {
    const message = createPropertySchema.viewingInstructions.validate("a".repeat(1001));

    assert.equal(message, "viewingInstructions must be 1000 characters or fewer");
  });
});
