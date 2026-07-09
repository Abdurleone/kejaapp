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

  it("defaults properties to available status", async () => {
    const property = new Property({
      title: "Modern Kilimani Apartment",
      owner: new mongoose.Types.ObjectId(),
      price: {
        rent: 65000,
      },
    });

    await property.validate();

    assert.equal(property.status, "available");
    assert.equal(property.isAvailable, true);
    assert.equal(property.freshnessNudgeSentAt, null);
  });

  it("marks taken properties as unavailable", async () => {
    const property = new Property({
      title: "Modern Kilimani Apartment",
      owner: new mongoose.Types.ObjectId(),
      price: {
        rent: 65000,
      },
      status: "taken",
    });

    await property.validate();

    assert.equal(property.status, "taken");
    assert.equal(property.isAvailable, false);
  });

  it("maps legacy unavailable updates to taken status", async () => {
    const property = new Property({
      title: "Modern Kilimani Apartment",
      owner: new mongoose.Types.ObjectId(),
      price: {
        rent: 65000,
      },
    });

    await property.validate();
    property.isAvailable = false;
    await property.validate();

    assert.equal(property.status, "taken");
    assert.equal(property.isAvailable, false);
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

  it("stores uploaded image metadata", () => {
    const property = new Property({
      title: "Modern Kilimani Apartment",
      owner: new mongoose.Types.ObjectId(),
      price: {
        rent: 65000,
      },
      images: [
        {
          url: "/uploads/properties/image.jpg",
          fileName: "image.jpg",
          mimeType: "image/jpeg",
          size: 123,
          storagePath: "/tmp/image.jpg",
          perceptualHash: "ff00ff00ff00ff00",
        },
      ],
    });

    assert.equal(property.images[0].mimeType, "image/jpeg");
    assert.equal(property.images[0].size, 123);
    assert.equal(property.images[0].perceptualHash, "ff00ff00ff00ff00");
  });

  it("stores GeoJSON coordinates when provided", () => {
    const property = new Property({
      title: "Modern Kilimani Apartment",
      owner: new mongoose.Types.ObjectId(),
      price: {
        rent: 65000,
      },
      location: {
        coordinates: {
          type: "Point",
          coordinates: [36.782, -1.2921],
        },
      },
    });

    assert.equal(property.location.coordinates.type, "Point");
    assert.deepEqual(property.location.coordinates.coordinates, [36.782, -1.2921]);
  });

  it("stores listing-specific contact details", () => {
    const property = new Property({
      title: "Modern Kilimani Apartment",
      owner: new mongoose.Types.ObjectId(),
      price: {
        rent: 65000,
      },
      contact: {
        preferredMethod: "whatsapp",
        phone: "+254700000000",
        email: "AGENCY@EXAMPLE.COM",
        whatsapp: "+254700000000",
        availableHours: "Weekdays 9 AM to 5 PM",
        notes: "Use inquiry messages for detailed questions.",
      },
    });

    assert.equal(property.contact.preferredMethod, "whatsapp");
    assert.equal(property.contact.email, "agency@example.com");
    assert.equal(property.contact.availableHours, "Weekdays 9 AM to 5 PM");
  });
});
