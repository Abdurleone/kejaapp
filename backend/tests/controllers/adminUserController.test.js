import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  deleteUser,
  getUser,
  getUserSummary,
  listUserStatusHistory,
  listUsers,
  updateUserStatus,
} from "../../controllers/adminUserController.js";
import AgencyVerification from "../../models/AgencyVerification.js";
import AuthSession from "../../models/AuthSession.js";
import DeviceToken from "../../models/DeviceToken.js";
import Favorite from "../../models/Favorite.js";
import Feedback from "../../models/Feedback.js";
import Inquiry from "../../models/Inquiry.js";
import Mover from "../../models/Mover.js";
import MoverRequest from "../../models/MoverRequest.js";
import MoverVerification from "../../models/MoverVerification.js";
import Notification from "../../models/Notification.js";
import Property from "../../models/Property.js";
import PropertyImageFingerprint from "../../models/PropertyImageFingerprint.js";
import Review from "../../models/Review.js";
import SavedSearch from "../../models/SavedSearch.js";
import User from "../../models/User.js";
import UserStatusLog from "../../models/UserStatusLog.js";
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

describe("adminUserController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("lists users with role and search filters", async () => {
    let findFilters;
    const expectedUsers = [{ email: "agency@example.com", role: "agency" }];
    mock.method(User, "find", (filters) => {
      findFilters = filters;

      return {
        select() {
          return this;
        },
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return { lean: () => Promise.resolve(expectedUsers) };
        },
      };
    });
    mock.method(User, "countDocuments", async () => 1);
    const req = {
      query: {
        role: "agency",
        search: "agency",
      },
    };
    const res = createResponse();

    await listUsers(req, res, (error) => {
      throw error;
    });

    assert.equal(findFilters.role, "agency");
    assert.equal(findFilters.$or.length, 3);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, expectedUsers);
    assert.equal(res.body.pagination.total, 1);
  });

  it("escapes regex metacharacters in the search filter (ReDoS guard)", async () => {
    const pathological = "(a+)+$";
    let findFilters;
    mock.method(User, "find", (filters) => {
      findFilters = filters;

      return {
        select() {
          return this;
        },
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return { lean: () => Promise.resolve([]) };
        },
      };
    });
    mock.method(User, "countDocuments", async () => 0);
    const req = { query: { search: pathological } };
    const res = createResponse();

    await listUsers(req, res, (error) => {
      throw error;
    });

    const start = Date.now();
    assert.equal(findFilters.$or[0].name.test("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!"), false);
    assert.ok(Date.now() - start < 50);
  });

  it("rejects invalid user role filters", async () => {
    const req = { query: { role: "owner" } };
    const res = createResponse();
    let nextError;

    await listUsers(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "role must be one of: tenant, landlord, agency, admin");
  });

  it("returns not found for missing users", async () => {
    mock.method(User, "findById", () => ({
      select: async () => null,
    }));
    const req = {
      params: {
        id: new mongoose.Types.ObjectId().toString(),
      },
    };
    const res = createResponse();
    let nextError;

    await getUser(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "User not found");
  });

  it("returns a tenant user summary", async () => {
    const userId = new mongoose.Types.ObjectId();
    const user = {
      _id: userId,
      email: "tenant@example.com",
      role: "tenant",
    };

    mock.method(User, "findById", () => ({
      select: async () => user,
    }));
    mock.method(Notification, "countDocuments", async () => 2);
    mock.method(UserViolation, "aggregate", async () => [{ _id: "open", count: 1 }]);
    mock.method(Favorite, "countDocuments", async () => 3);
    mock.method(Inquiry, "aggregate", async () => [
      { _id: "open", count: 1 },
      { _id: "responded", count: 2 },
    ]);
    mock.method(ViewingRequest, "aggregate", async () => [
      { _id: "pending", count: 1 },
      { _id: "approved", count: 1 },
    ]);

    const req = { params: { id: userId.toString() } };
    const res = createResponse();

    await getUserSummary(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.user.email, "tenant@example.com");
    assert.equal(res.body.data.summary.notifications.unread, 2);
    assert.equal(res.body.data.summary.violations.open, 1);
    assert.equal(res.body.data.summary.tenant.savedProperties, 3);
    assert.equal(res.body.data.summary.tenant.inquiries.responded, 2);
    assert.equal(res.body.data.summary.tenant.viewings.approved, 1);
  });

  it("returns an agency user summary with owner and verification context", async () => {
    const userId = new mongoose.Types.ObjectId();
    const user = {
      _id: userId,
      email: "agency@example.com",
      role: "agency",
    };
    let verificationFilters;

    mock.method(User, "findById", () => ({
      select: async () => user,
    }));
    mock.method(Notification, "countDocuments", async () => 0);
    mock.method(UserViolation, "aggregate", async () => []);
    mock.method(Property, "aggregate", async () => [
      { _id: "draft", count: 1 },
      { _id: "available", count: 2 },
      { _id: "taken", count: 1 },
    ]);
    mock.method(Inquiry, "aggregate", async () => [
      { _id: "open", count: 4 },
      { _id: "responded", count: 1 },
    ]);
    mock.method(ViewingRequest, "aggregate", async () => [
      { _id: "pending", count: 2 },
      { _id: "approved", count: 1 },
      { _id: "completed", count: 1 },
    ]);
    mock.method(AgencyVerification, "findOne", (filters) => {
      verificationFilters = filters;

      return {
        select: async () => ({
          status: "approved",
          rejectionReason: null,
        }),
      };
    });

    const req = { params: { id: userId.toString() } };
    const res = createResponse();

    await getUserSummary(req, res, (error) => {
      throw error;
    });

    assert.deepEqual(verificationFilters, { user: userId });
    assert.equal(res.body.data.summary.owner.properties.available, 2);
    assert.equal(res.body.data.summary.owner.incomingInquiries.open, 4);
    assert.equal(res.body.data.summary.owner.incomingViewings.completed, 1);
    assert.equal(res.body.data.summary.agency.verificationStatus, "approved");
  });

  it("returns not found for missing user summaries", async () => {
    mock.method(User, "findById", () => ({
      select: async () => null,
    }));
    const req = {
      params: {
        id: new mongoose.Types.ObjectId().toString(),
      },
    };
    const res = createResponse();
    let nextError;

    await getUserSummary(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "User not found");
  });

  it("updates a user account status", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    let logPayload;
    let notificationPayload;
    const user = {
      _id: userId,
      accountStatus: "active",
      accountStatusReason: undefined,
      accountStatusUpdatedAt: undefined,
      saveCalled: false,
      async save() {
        this.saveCalled = true;
      },
    };

    mock.method(User, "findById", () => ({
      select: async () => user,
    }));
    mock.method(UserStatusLog, "create", async (payload) => {
      logPayload = payload;
      return payload;
    });
    mock.method(DeviceToken, "find", async () => []);
    mock.method(Notification, "create", async (payload) => {
      notificationPayload = payload;
      return payload;
    });

    const req = {
      params: { id: userId.toString() },
      body: {
        status: "suspended",
        reason: "Repeated duplicate listing uploads",
      },
      user: { _id: adminId },
    };
    const res = createResponse();

    await updateUserStatus(req, res, (error) => {
      throw error;
    });

    assert.equal(user.accountStatus, "suspended");
    assert.equal(user.accountStatusReason, "Repeated duplicate listing uploads");
    assert.equal(user.accountStatusUpdatedAt instanceof Date, true);
    assert.equal(user.saveCalled, true);
    assert.deepEqual(logPayload, {
      user: userId,
      changedBy: adminId,
      previousStatus: "active",
      newStatus: "suspended",
      reason: "Repeated duplicate listing uploads",
    });
    assert.deepEqual(notificationPayload, {
      user: userId,
      type: "system",
      title: "Account suspended",
      message: "Repeated duplicate listing uploads",
      data: {
        accountStatus: "suspended",
        reason: "Repeated duplicate listing uploads",
      },
    });
    assert.equal(res.body.message, "User status updated");
  });

  it("prevents admins from suspending or banning themselves", async () => {
    const adminId = new mongoose.Types.ObjectId();
    mock.method(User, "findById", () => ({
      select: async () => ({
        _id: adminId,
        accountStatus: "active",
      }),
    }));
    const req = {
      params: { id: adminId.toString() },
      body: { status: "banned" },
      user: { _id: adminId },
    };
    const res = createResponse();
    let nextError;

    await updateUserStatus(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "Admins cannot suspend or ban their own account");
  });

  it("lists user status history", async () => {
    const userId = new mongoose.Types.ObjectId();
    const expectedHistory = [
      {
        previousStatus: "active",
        newStatus: "suspended",
      },
    ];
    let findFilters;

    mock.method(User, "findById", () => ({
      select: async () => ({ _id: userId }),
    }));
    mock.method(UserStatusLog, "find", (filters) => {
      findFilters = filters;

      return {
        populate() {
          return this;
        },
        sort() {
          return this;
        },
        limit() {
          return { lean: () => Promise.resolve(expectedHistory) };
        },
      };
    });

    const req = { params: { id: userId.toString() } };
    const res = createResponse();

    await listUserStatusHistory(req, res, (error) => {
      throw error;
    });

    assert.deepEqual(findFilters, { user: userId });
    assert.deepEqual(res.body.data, expectedHistory);
  });

  it("returns not found for missing user status history", async () => {
    mock.method(User, "findById", () => ({
      select: async () => null,
    }));
    const req = {
      params: {
        id: new mongoose.Types.ObjectId().toString(),
      },
    };
    const res = createResponse();
    let nextError;

    await listUserStatusHistory(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "User not found");
  });

  it("deletes a user and their associated data", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();
    const user = {
      _id: targetId,
      async deleteOne() {},
    };

    mock.method(User, "findById", async () => user);
    mock.method(Property, "find", () => ({
      select: async () => [],
    }));
    mock.method(Review, "distinct", async () => []);

    for (const Model of [
      AuthSession,
      Favorite,
      Inquiry,
      ViewingRequest,
      Review,
      Notification,
      AgencyVerification,
      PropertyImageFingerprint,
      UserViolation,
      UserStatusLog,
      Property,
      Mover,
      MoverVerification,
      MoverRequest,
      Feedback,
      SavedSearch,
      DeviceToken,
    ]) {
      mock.method(Model, "deleteMany", async () => ({ deletedCount: 0 }));
    }
    mock.method(Mover, "updateMany", async () => ({ modifiedCount: 0 }));
    mock.method(UserViolation, "updateMany", async () => ({ modifiedCount: 0 }));

    const req = { params: { id: targetId.toString() }, user: { _id: adminId } };
    const res = createResponse();

    await deleteUser(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, "User and associated data deleted");
  });

  it("refuses to delete the admin's own account through this route", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const req = { params: { id: adminId.toString() }, user: { _id: adminId } };
    const res = createResponse();
    let nextError;

    await deleteUser(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "Use Account settings to delete your own account");
  });

  it("returns not found when deleting a nonexistent user", async () => {
    mock.method(User, "findById", async () => null);
    const req = {
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await deleteUser(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "User not found");
  });
});
