import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  approveMoverVerification,
  listMoverVerifications,
  rejectMoverVerification,
} from "../../controllers/adminMoverController.js";
import MoverVerification from "../../models/MoverVerification.js";

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

describe("adminMoverController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("lists mover verifications with optional status filter", async () => {
    const expectedData = [{ status: "pending" }];
    const query = {
      populate() {
        return this;
      },
      sort(sortValue) {
        assert.equal(sortValue, "-createdAt");
        return this;
      },
      skip() {
        return this;
      },
      limit() {
        return expectedData;
      },
    };
    const find = mock.method(MoverVerification, "find", (filters) => {
      assert.deepEqual(filters, { status: "pending" });
      return query;
    });
    mock.method(MoverVerification, "countDocuments", async () => 1);
    const req = { query: { status: "pending" } };
    const res = createResponse();

    await listMoverVerifications(req, res, (error) => {
      throw error;
    });

    assert.equal(find.mock.callCount(), 1);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, expectedData);
    assert.deepEqual(res.body.pagination, { page: 1, limit: 20, total: 1, pages: 1 });
  });

  it("returns not found when approving a missing verification", async () => {
    mock.method(MoverVerification, "findById", async () => null);
    const req = {
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await approveMoverVerification(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Mover verification not found");
  });

  it("returns not found when rejecting a missing verification", async () => {
    mock.method(MoverVerification, "findById", async () => null);
    const req = {
      body: { reason: "Missing documents" },
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await rejectMoverVerification(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Mover verification not found");
  });
});
