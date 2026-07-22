import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { getDashboardSummary } from "../../controllers/dashboardController.js";
import AgencyVerification from "../../models/AgencyVerification.js";
import Favorite from "../../models/Favorite.js";
import Feedback from "../../models/Feedback.js";
import Inquiry from "../../models/Inquiry.js";
import MoverRequest from "../../models/MoverRequest.js";
import MoverVerification from "../../models/MoverVerification.js";
import Notification from "../../models/Notification.js";
import Property from "../../models/Property.js";
import UserViolation from "../../models/UserViolation.js";
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

describe("dashboardController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("returns tenant dashboard counts", async () => {
    mock.method(Notification, "countDocuments", async () => 2);
    mock.method(Favorite, "countDocuments", async () => 3);
    mock.method(Inquiry, "aggregate", async () => [{ _id: "open", count: 1 }]);
    mock.method(ViewingRequest, "aggregate", async () => [{ _id: "approved", count: 1 }]);
    const req = {
      user: {
        _id: new mongoose.Types.ObjectId(),
        role: "tenant",
      },
    };
    const res = createResponse();

    await getDashboardSummary(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.role, "tenant");
    assert.equal(res.body.data.notifications.unread, 2);
    assert.equal(res.body.data.tenant.savedProperties, 3);
    assert.equal(res.body.data.tenant.inquiries.open, 1);
    assert.equal(res.body.data.tenant.viewings.approved, 1);
  });

  it("returns agency owner and verification counts", async () => {
    mock.method(Notification, "countDocuments", async () => 0);
    mock.method(Property, "aggregate", async () => [{ _id: "available", count: 2 }]);
    mock.method(Inquiry, "aggregate", async () => []);
    mock.method(ViewingRequest, "aggregate", async () => []);
    mock.method(AgencyVerification, "findOne", () => ({
      select: async () => ({
        status: "approved",
        rejectionReason: null,
      }),
    }));
    const req = {
      user: {
        _id: new mongoose.Types.ObjectId(),
        role: "agency",
      },
    };
    const res = createResponse();

    await getDashboardSummary(req, res, (error) => {
      throw error;
    });

    assert.equal(res.body.data.owner.properties.available, 2);
    assert.equal(res.body.data.agency.verificationStatus, "approved");
  });

  it("returns mover verification status and received request counts", async () => {
    mock.method(Notification, "countDocuments", async () => 0);
    mock.method(MoverVerification, "findOne", () => ({
      select: async () => ({
        status: "pending",
        rejectionReason: null,
      }),
    }));
    mock.method(MoverRequest, "aggregate", async () => [{ _id: "pending", count: 3 }]);
    const req = {
      user: {
        _id: new mongoose.Types.ObjectId(),
        role: "mover",
      },
    };
    const res = createResponse();

    await getDashboardSummary(req, res, (error) => {
      throw error;
    });

    assert.equal(res.body.data.mover.verificationStatus, "pending");
    assert.equal(res.body.data.mover.receivedRequests.pending, 3);
  });

  it("returns admin moderation counts", async () => {
    mock.method(Notification, "countDocuments", async () => 0);
    mock.method(Property, "aggregate", async () => []);
    mock.method(Inquiry, "aggregate", async () => []);
    mock.method(ViewingRequest, "aggregate", async () => []);
    mock.method(AgencyVerification, "aggregate", async () => [{ _id: "pending", count: 4 }]);
    mock.method(MoverVerification, "aggregate", async () => [{ _id: "pending", count: 7 }]);
    mock.method(UserViolation, "aggregate", async () => [{ _id: "open", count: 5 }]);
    mock.method(Feedback, "aggregate", async () => [{ _id: "pending", count: 6 }]);
    const req = {
      user: {
        _id: new mongoose.Types.ObjectId(),
        role: "admin",
      },
    };
    const res = createResponse();

    await getDashboardSummary(req, res, (error) => {
      throw error;
    });

    assert.equal(res.body.data.admin.agencyVerifications.pending, 4);
    assert.equal(res.body.data.admin.moverVerifications.pending, 7);
    assert.equal(res.body.data.admin.violations.open, 5);
    assert.equal(res.body.data.admin.feedback.pending, 6);
    assert.equal(res.body.data.owner, undefined);
  });
});
