import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  createViewingRequest,
  listMyViewingRequests,
  updateViewingRequestStatus,
} from "../../controllers/viewingController.js";
import Property from "../../models/Property.js";
import ViewingRequest from "../../models/ViewingRequest.js";

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

// Chainable, thenable stand-in for a Mongoose Query - resolves to `result`
// whenever awaited, regardless of how many chained methods were called
// first (mirrors that populateViewingRequest() wraps .sort().skip().limit()).
const mockPopulatedFind = (result) => ({
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
    return this;
  },
  then(resolve) {
    resolve(result);
  },
});

describe("viewingController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("returns not found when requesting a viewing for a missing property", async () => {
    mock.method(Property, "findById", async () => null);
    const req = {
      body: { property: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await createViewingRequest(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Property not found");
  });

  it("rejects viewing requests for a user's own property", async () => {
    const userId = new mongoose.Types.ObjectId();
    mock.method(Property, "findById", async () => ({
      _id: new mongoose.Types.ObjectId(),
      owner: userId,
      status: "available",
      isAvailable: true,
    }));
    const req = {
      body: { property: new mongoose.Types.ObjectId().toString() },
      user: { _id: userId },
    };
    const res = createResponse();
    let nextError;

    await createViewingRequest(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "You cannot request a viewing for your own property");
  });

  it("requires requested dates for scheduled viewings", async () => {
    const userId = new mongoose.Types.ObjectId();
    const propertyId = new mongoose.Types.ObjectId();
    mock.method(Property, "findById", async () => ({
      _id: propertyId,
      owner: new mongoose.Types.ObjectId(),
      status: "available",
      isAvailable: true,
      viewingType: "scheduled",
    }));
    const req = {
      body: { property: propertyId.toString() },
      user: { _id: userId },
    };
    const res = createResponse();
    let nextError;

    await createViewingRequest(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "requestedDate is required for scheduled viewings");
  });

  it("rejects duplicate active viewing requests", async () => {
    const userId = new mongoose.Types.ObjectId();
    const propertyId = new mongoose.Types.ObjectId();
    mock.method(Property, "findById", async () => ({
      _id: propertyId,
      owner: new mongoose.Types.ObjectId(),
      status: "available",
      isAvailable: true,
      viewingType: "open",
    }));
    mock.method(ViewingRequest, "findOne", async () => ({ _id: new mongoose.Types.ObjectId() }));
    const req = {
      body: { property: propertyId.toString() },
      user: { _id: userId },
    };
    const res = createResponse();
    let nextError;

    await createViewingRequest(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 409);
    assert.equal(nextError.message, "You already have an active viewing request for this property");
  });

  it("returns not found when updating a missing viewing request", async () => {
    mock.method(ViewingRequest, "findById", () => ({
      populate: async () => null,
    }));
    const req = {
      body: { status: "approved" },
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId(), role: "landlord" },
    };
    const res = createResponse();
    let nextError;

    await updateViewingRequestStatus(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Viewing request not found");
  });

  it("paginates a tenant's own viewing requests with default page/limit", async () => {
    let findFilters;
    let countFilters;
    mock.method(ViewingRequest, "find", (filters) => {
      findFilters = filters;
      return mockPopulatedFind([{ _id: "v1" }]);
    });
    mock.method(ViewingRequest, "countDocuments", (filters) => {
      countFilters = filters;
      return Promise.resolve(7);
    });

    const userId = new mongoose.Types.ObjectId();
    const req = { query: {}, user: { _id: userId } };
    const res = createResponse();

    await listMyViewingRequests(req, res, () => {});

    assert.deepEqual(findFilters, { requester: userId });
    assert.deepEqual(countFilters, { requester: userId });
    assert.deepEqual(res.body.data, [{ _id: "v1" }]);
    assert.deepEqual(res.body.pagination, { page: 1, limit: 20, total: 7, pages: 1 });
  });
});
