import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  addPropertyImage,
  listMyProperties,
  listProperties,
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

  it("lists only available properties by default", async () => {
    let findFilters;
    let countFilters;
    mock.method(Property, "find", (filters) => {
      findFilters = filters;

      return {
        populate() {
          return this;
        },
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return Promise.resolve([]);
        },
      };
    });
    mock.method(Property, "countDocuments", (filters) => {
      countFilters = filters;
      return Promise.resolve(0);
    });

    const req = { query: {} };
    const res = createResponse();

    await listProperties(req, res, () => {});

    assert.deepEqual(findFilters, { status: "available" });
    assert.deepEqual(countFilters, { status: "available" });
    assert.equal(res.statusCode, 200);
  });

  it("allows explicit property status filters", async () => {
    let findFilters;
    mock.method(Property, "find", (filters) => {
      findFilters = filters;

      return {
        populate() {
          return this;
        },
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return Promise.resolve([]);
        },
      };
    });
    mock.method(Property, "countDocuments", () => Promise.resolve(0));

    const req = { query: { status: "taken" } };
    const res = createResponse();

    await listProperties(req, res, () => {});

    assert.deepEqual(findFilters, { status: "taken" });
    assert.equal(res.statusCode, 200);
  });

  it("rejects invalid property status filters", async () => {
    const req = { query: { status: "rented" } };
    const res = createResponse();
    let nextError;

    await listProperties(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "status must be one of: draft, available, taken, archived");
  });

  it("lists the current owner's properties across statuses", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    let findFilters;
    let countFilters;
    mock.method(Property, "find", (filters) => {
      findFilters = filters;

      return {
        populate() {
          return this;
        },
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return Promise.resolve([]);
        },
      };
    });
    mock.method(Property, "countDocuments", (filters) => {
      countFilters = filters;
      return Promise.resolve(0);
    });

    const req = {
      query: {},
      user: { _id: ownerId, role: "landlord" },
    };
    const res = createResponse();

    await listMyProperties(req, res, () => {});

    assert.deepEqual(findFilters, { owner: ownerId });
    assert.deepEqual(countFilters, { owner: ownerId });
    assert.equal(res.statusCode, 200);
  });

  it("filters the current owner's properties by status", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    let findFilters;
    mock.method(Property, "find", (filters) => {
      findFilters = filters;

      return {
        populate() {
          return this;
        },
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return Promise.resolve([]);
        },
      };
    });
    mock.method(Property, "countDocuments", () => Promise.resolve(0));

    const req = {
      query: { status: "taken" },
      user: { _id: ownerId, role: "agency" },
    };
    const res = createResponse();

    await listMyProperties(req, res, () => {});

    assert.deepEqual(findFilters, { owner: ownerId, status: "taken" });
    assert.equal(res.statusCode, 200);
  });

  it("lets admins list all managed properties", async () => {
    let findFilters;
    let countFilters;
    mock.method(Property, "find", (filters) => {
      findFilters = filters;

      return {
        populate() {
          return this;
        },
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return Promise.resolve([]);
        },
      };
    });
    mock.method(Property, "countDocuments", (filters) => {
      countFilters = filters;
      return Promise.resolve(0);
    });

    const req = {
      query: {},
      user: { _id: new mongoose.Types.ObjectId(), role: "admin" },
    };
    const res = createResponse();

    await listMyProperties(req, res, () => {});

    assert.deepEqual(findFilters, {});
    assert.deepEqual(countFilters, {});
    assert.equal(res.statusCode, 200);
  });

  it("rejects invalid owner property status filters", async () => {
    const req = {
      query: { status: "leased" },
      user: { _id: new mongoose.Types.ObjectId(), role: "landlord" },
    };
    const res = createResponse();
    let nextError;

    await listMyProperties(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "status must be one of: draft, available, taken, archived");
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
