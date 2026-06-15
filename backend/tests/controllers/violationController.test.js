import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  listViolations,
  updateViolationStatus,
} from "../../controllers/violationController.js";
import UserViolation from "../../models/UserViolation.js";

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

describe("violationController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("lists violations with filters", async () => {
    const expectedData = [{ status: "open" }];
    const query = {
      populate() {
        return this;
      },
      sort(sortValue) {
        assert.equal(sortValue, "-createdAt");
        return expectedData;
      },
    };
    mock.method(UserViolation, "find", (filters) => {
      assert.deepEqual(filters, {
        status: "open",
        type: "duplicate_property_image",
      });
      return query;
    });
    const req = {
      query: {
        status: "open",
        type: "duplicate_property_image",
      },
    };
    const res = createResponse();

    await listViolations(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, expectedData);
  });

  it("returns not found when updating a missing violation", async () => {
    mock.method(UserViolation, "findById", async () => null);
    const req = {
      body: { status: "reviewed" },
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await updateViolationStatus(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Violation not found");
  });
});
