import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  costCalculationSchema,
  createPropertySchema,
  propertyImageSchema,
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

  it("allows property lifecycle statuses", () => {
    assert.deepEqual(createPropertySchema.status.enum, ["draft", "available", "taken", "archived"]);
    assert.deepEqual(updatePropertySchema.status.enum, ["draft", "available", "taken", "archived"]);
  });

  it("limits viewing instructions", () => {
    const message = createPropertySchema.viewingInstructions.validate("a".repeat(1001));

    assert.equal(message, "viewingInstructions must be 1000 characters or fewer");
  });

  it("allows listing contact methods for property owners", () => {
    assert.deepEqual(createPropertySchema.contact.validate({ preferredMethod: "whatsapp" }), null);
    assert.deepEqual(updatePropertySchema.contact.validate({ preferredMethod: "inquiry" }), null);
  });

  it("rejects invalid listing contact details", () => {
    assert.equal(
      createPropertySchema.contact.validate({ preferredMethod: "sms" }),
      "contact.preferredMethod must be one of: phone, email, whatsapp, inquiry"
    );
    assert.equal(
      createPropertySchema.contact.validate({ email: "not-an-email" }),
      "contact.email must be a valid email"
    );
  });

  it("requires valid HTTP property image URLs", () => {
    assert.equal(propertyImageSchema.url.required, true);
    assert.equal(propertyImageSchema.url.pattern.test("https://example.com/property.jpg"), true);
    assert.equal(propertyImageSchema.url.pattern.test("ftp://example.com/property.jpg"), false);
  });

  it("limits property image alt text", () => {
    const message = propertyImageSchema.alt.validate("a".repeat(201));

    assert.equal(message, "alt must be 200 characters or fewer");
  });

  it("accepts valid GeoJSON property coordinates", () => {
    const message = createPropertySchema.location.validate({
      coordinates: {
        type: "Point",
        coordinates: [36.782, -1.2921],
      },
    });

    assert.equal(message, null);
  });

  it("rejects invalid GeoJSON coordinate types", () => {
    const message = createPropertySchema.location.validate({
      coordinates: {
        type: "LineString",
        coordinates: [36.782, -1.2921],
      },
    });

    assert.equal(message, "location.coordinates.type must be Point");
  });

  it("rejects invalid GeoJSON coordinate ranges", () => {
    const message = createPropertySchema.location.validate({
      coordinates: {
        type: "Point",
        coordinates: [200, -1.2921],
      },
    });

    assert.equal(message, "location.coordinates.coordinates[0] must be a longitude between -180 and 180");
  });
});
