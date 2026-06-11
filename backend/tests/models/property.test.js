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

  it("stores image subdocuments with alt text", () => {
    const property = new Property({
      title: "Modern Kilimani Apartment",
      owner: new mongoose.Types.ObjectId(),
      price: {
        rent: 65000,
      },
      images: [
        {
          url: "https://example.com/property.jpg",
          alt: "Living room",
        },
      ],
    });

    assert.equal(property.images.length, 1);
    assert.equal(property.images[0].url, "https://example.com/property.jpg");
    assert.equal(property.images[0].alt, "Living room");
    assert.ok(property.images[0]._id);
  });
});
