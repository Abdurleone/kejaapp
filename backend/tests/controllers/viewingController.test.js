import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  createViewingRequest,
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
});
