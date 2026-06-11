import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "node:test";
import {
  addPropertyImage,
  removePropertyImage,
} from "../../controllers/propertyController.js";
import Property from "../../models/Property.js";

const createResponse = () => ({
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
});

describe("propertyController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("returns not found when adding an image to a missing property", async () => {
    mock.method(Property, "findById", async () => null);
    const req = {
      body: {
        url: "https://example.com/property.jpg",
      },
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId(), role: "landlord" },
    };
    const res = createResponse();
    let nextError;

    await addPropertyImage(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Property not found");
  });

  it("rejects image updates from non-owners", async () => {
    mock.method(Property, "findById", async () => ({
      owner: new mongoose.Types.ObjectId(),
    }));
    const req = {
      body: {
        url: "https://example.com/property.jpg",
      },
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId(), role: "landlord" },
    };
    const res = createResponse();
    let nextError;

    await addPropertyImage(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 403);
    assert.equal(nextError.message, "Not authorized to manage this property");
  });

  it("returns not found when removing a missing image", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const property = new Property({
      title: "Modern Kilimani Apartment",
      owner: ownerId,
      price: {
        rent: 65000,
      },
      images: [],
    });
    mock.method(Property, "findById", async () => property);
    const req = {
      params: {
        id: property._id.toString(),
        imageId: new mongoose.Types.ObjectId().toString(),
      },
      user: { _id: ownerId, role: "landlord" },
    };
    const res = createResponse();
    let nextError;

    await removePropertyImage(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Property image not found");
  });
});
