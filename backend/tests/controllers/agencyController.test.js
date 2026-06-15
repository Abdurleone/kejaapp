import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  getAgencyStatus,
  submitAgencyVerification,
} from "../../controllers/agencyController.js";
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

describe("agencyController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("rejects agency verification from non-agency users", async () => {
    const req = {
      body: {},
      user: { _id: new mongoose.Types.ObjectId(), role: "tenant" },
    };
    const res = createResponse();
    let nextError;

    await submitAgencyVerification(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 403);
    assert.equal(nextError.message, "Only agency accounts can request agency verification");
  });

  it("prevents duplicate active agency verification requests", async () => {
    mock.method(AgencyVerification, "findOne", async () => ({ status: "pending" }));
    const req = {
      body: {},
      user: { _id: new mongoose.Types.ObjectId(), role: "agency" },
    };
    const res = createResponse();
    let nextError;

    await submitAgencyVerification(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 409);
    assert.equal(nextError.message, "Agency verification request is already active");
  });

  it("allows rejected agency verifications to be resubmitted", async () => {
    const expectedVerification = { status: "pending" };
    const update = mock.method(AgencyVerification, "findOneAndUpdate", async () => expectedVerification);
    mock.method(AgencyVerification, "findOne", async () => ({ status: "rejected" }));
    const req = {
      body: {
        agencyName: "Demo Homes Agency",
      },
      user: { _id: new mongoose.Types.ObjectId(), role: "agency" },
    };
    const res = createResponse();

    await submitAgencyVerification(req, res, (error) => {
      throw error;
    });

    assert.equal(update.mock.callCount(), 1);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, expectedVerification);
  });

  it("returns not submitted status when an agency has no verification", async () => {
    mock.method(AgencyVerification, "findOne", async () => null);
    const req = {
      user: { _id: new mongoose.Types.ObjectId(), role: "agency" },
    };
    const res = createResponse();

    await getAgencyStatus(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, { status: "not_submitted" });
  });
});
