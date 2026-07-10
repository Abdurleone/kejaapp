import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  addPropertyImage,
  listMyProperties,
  listProperties,
  listPropertyMovers,
  removePropertyImage,
} from "../../controllers/propertyController.js";
import Mover from "../../models/Mover.js";
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

  it("scopes admins to their own properties too, since admins do not manage listings", async () => {
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

    const adminId = new mongoose.Types.ObjectId();
    const req = {
      query: {},
      user: { _id: adminId, role: "admin" },
    };
    const res = createResponse();

    await listMyProperties(req, res, () => {});

    assert.deepEqual(findFilters, { owner: adminId });
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

  it("returns not found when listing movers for a missing property", async () => {
    mock.method(Property, "findById", async () => null);
    const req = { params: { id: new mongoose.Types.ObjectId().toString() }, query: {} };
    const res = createResponse();
    let nextError;

    await listPropertyMovers(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Property not found");
  });

  it("returns affiliate and nearby movers for a property, excluding duplicates", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const property = {
      _id: new mongoose.Types.ObjectId(),
      owner: ownerId,
      location: {
        coordinates: {
          type: "Point",
          coordinates: [36.782, -1.2921],
        },
      },
    };
    mock.method(Property, "findById", async () => property);

    const affiliateMover = { _id: new mongoose.Types.ObjectId(), name: "Affiliate Movers" };
    const nearbyMover = { _id: new mongoose.Types.ObjectId(), name: "Nearby Movers" };
    let secondCallFilters;
    let callCount = 0;

    mock.method(Mover, "find", (filters) => {
      callCount += 1;

      if (callCount === 1) {
        assert.deepEqual(filters, { affiliatedOwners: ownerId, verified: true });
        return { sort: async () => [affiliateMover] };
      }

      secondCallFilters = filters;
      return { sort: async () => [nearbyMover] };
    });

    const req = { params: { id: property._id.toString() }, query: {} };
    const res = createResponse();

    await listPropertyMovers(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data.affiliates, [affiliateMover]);
    assert.deepEqual(res.body.data.nearby, [nearbyMover]);
    assert.equal(secondCallFilters.verified, true);
    assert.deepEqual(secondCallFilters._id.$nin, [affiliateMover._id]);
    assert.ok(secondCallFilters["location.coordinates"].$geoWithin.$centerSphere);
  });

  it("returns no nearby movers when the property has no coordinates", async () => {
    const property = {
      _id: new mongoose.Types.ObjectId(),
      owner: new mongoose.Types.ObjectId(),
      location: {},
    };
    mock.method(Property, "findById", async () => property);
    mock.method(Mover, "find", () => ({ sort: async () => [] }));

    const req = { params: { id: property._id.toString() }, query: {} };
    const res = createResponse();

    await listPropertyMovers(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data.nearby, []);
  });
});
