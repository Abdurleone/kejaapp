import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  createMoverRequest,
  listMyMoverRequests,
  listReceivedMoverRequests,
  updateMoverRequestStatus,
} from "../../controllers/moverRequestController.js";
import Mover from "../../models/Mover.js";
import MoverRequest from "../../models/MoverRequest.js";

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

describe("moverRequestController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("returns not found when requesting a missing mover", async () => {
    mock.method(Mover, "findById", async () => null);
    const req = {
      body: { mover: new mongoose.Types.ObjectId().toString(), message: "Need help moving" },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await createMoverRequest(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Mover not found");
  });

  it("rejects requests to a mover with no linked account yet", async () => {
    mock.method(Mover, "findById", async () => ({
      _id: new mongoose.Types.ObjectId(),
      name: "Lakeview Relocations Kisumu",
      user: null,
    }));
    const req = {
      body: { mover: new mongoose.Types.ObjectId().toString(), message: "Need help moving" },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await createMoverRequest(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "This mover does not have an active account yet");
  });

  it("lists the tenant's own mover requests", async () => {
    const expectedData = [{ status: "pending" }];
    const query = {
      sort(sortValue) {
        assert.equal(sortValue, "-createdAt");
        return this;
      },
      populate() {
        return expectedData;
      },
    };
    const tenantId = new mongoose.Types.ObjectId();
    const find = mock.method(MoverRequest, "find", (filters) => {
      assert.deepEqual(filters, { tenant: tenantId });
      return query;
    });
    const req = { query: {}, user: { _id: tenantId } };
    const res = createResponse();

    await listMyMoverRequests(req, res, (error) => {
      throw error;
    });

    assert.equal(find.mock.callCount(), 1);
    assert.deepEqual(res.body.data, expectedData);
  });

  it("lists mover requests received by the signed-in mover", async () => {
    const expectedData = [{ status: "accepted" }];
    const query = {
      sort() {
        return this;
      },
      populate() {
        return expectedData;
      },
    };
    const moverAccountId = new mongoose.Types.ObjectId();
    mock.method(MoverRequest, "find", (filters) => {
      assert.deepEqual(filters, { moverAccount: moverAccountId, status: "accepted" });
      return query;
    });
    const req = { query: { status: "accepted" }, user: { _id: moverAccountId } };
    const res = createResponse();

    await listReceivedMoverRequests(req, res, (error) => {
      throw error;
    });

    assert.deepEqual(res.body.data, expectedData);
  });

  it("returns not found when updating a missing mover request", async () => {
    mock.method(MoverRequest, "findById", async () => null);
    const req = {
      body: { status: "accepted" },
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await updateMoverRequestStatus(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Mover request not found");
  });

  it("rejects a cancel attempt from someone who isn't the tenant or mover", async () => {
    mock.method(MoverRequest, "findById", async () => ({
      tenant: new mongoose.Types.ObjectId(),
      moverAccount: new mongoose.Types.ObjectId(),
    }));
    const req = {
      body: { status: "cancelled" },
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await updateMoverRequestStatus(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 403);
    assert.equal(nextError.message, "Not authorized to cancel this mover request");
  });

  it("rejects an accept/decline attempt from anyone other than the mover", async () => {
    const tenantId = new mongoose.Types.ObjectId();
    mock.method(MoverRequest, "findById", async () => ({
      tenant: tenantId,
      moverAccount: new mongoose.Types.ObjectId(),
    }));
    const req = {
      body: { status: "accepted" },
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: tenantId },
    };
    const res = createResponse();
    let nextError;

    await updateMoverRequestStatus(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 403);
    assert.equal(nextError.message, "Not authorized to manage this mover request");
  });
});
