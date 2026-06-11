import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "node:test";
import {
  approveAgencyVerification,
  listAgencyVerifications,
  rejectAgencyVerification,
} from "../../controllers/adminAgencyController.js";
import AgencyVerification from "../../models/AgencyVerification.js";

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

describe("adminAgencyController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("lists agency verifications with optional status filter", async () => {
    const expectedData = [{ status: "pending" }];
    const query = {
      populate() {
        return this;
      },
      sort(sortValue) {
        assert.equal(sortValue, "-createdAt");
        return expectedData;
      },
    };
    const find = mock.method(AgencyVerification, "find", (filters) => {
      assert.deepEqual(filters, { status: "pending" });
      return query;
    });
    const req = { query: { status: "pending" } };
    const res = createResponse();

    await listAgencyVerifications(req, res, (error) => {
      throw error;
    });

    assert.equal(find.mock.callCount(), 1);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, expectedData);
  });

  it("returns not found when approving a missing verification", async () => {
    mock.method(AgencyVerification, "findById", async () => null);
    const req = {
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await approveAgencyVerification(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Agency verification not found");
  });

  it("returns not found when rejecting a missing verification", async () => {
    mock.method(AgencyVerification, "findById", async () => null);
    const req = {
      body: { reason: "Missing documents" },
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await rejectAgencyVerification(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Agency verification not found");
  });
});
