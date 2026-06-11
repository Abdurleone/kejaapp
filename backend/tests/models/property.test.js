import assert from "node:assert/strict";
import mongoose from "mongoose";
import { describe, it } from "node:test";
import Property from "../../models/Property.js";

describe("Property model", () => {
  it("omits GeoJSON coordinates when no coordinate array is provided", () => {
    const property = new Property({
      title: "Modern Kilimani Apartment",
      owner: new mongoose.Types.ObjectId(),
      price: {
        rent: 65000,
      },
      location: {
        county: "Nairobi",
        town: "Nairobi",
        area: "Kilimani",
      },
    });

    const doc = property.toObject();

    assert.equal(doc.location.coordinates, undefined);
  });

  it("defaults properties to scheduled viewings", () => {
    const property = new Property({
      title: "Modern Kilimani Apartment",
      owner: new mongoose.Types.ObjectId(),
      price: {
        rent: 65000,
      },
    });

    assert.equal(property.viewingType, "scheduled");
  });
});
