import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { getDashboardSummary } from "../../controllers/dashboardController.js";
import AgencyVerification from "../../models/AgencyVerification.js";
import Favorite from "../../models/Favorite.js";
import Inquiry from "../../models/Inquiry.js";
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
    mock.method(Inquiry, "countDocuments", async (filters) => (filters.status === "open" ? 1 : 0));
    mock.method(ViewingRequest, "countDocuments", async (filters) => (filters.status === "approved" ? 1 : 0));
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
    mock.method(Property, "countDocuments", async (filters) => (filters.status === "available" ? 2 : 0));
    mock.method(Inquiry, "countDocuments", async () => 0);
    mock.method(ViewingRequest, "countDocuments", async () => 0);
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

  it("returns admin moderation counts", async () => {
    mock.method(Notification, "countDocuments", async () => 0);
    mock.method(Property, "countDocuments", async () => 0);
    mock.method(Inquiry, "countDocuments", async () => 0);
    mock.method(ViewingRequest, "countDocuments", async () => 0);
    mock.method(AgencyVerification, "countDocuments", async (filters) =>
      filters.status === "pending" ? 4 : 0
    );
    mock.method(UserViolation, "countDocuments", async (filters) => (filters.status === "open" ? 5 : 0));
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
    assert.equal(res.body.data.admin.violations.open, 5);
  });
});
