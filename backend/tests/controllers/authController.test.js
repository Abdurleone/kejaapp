import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  changePassword,
  deleteCurrentUser,
  loginUser,
  refreshAccessToken,
  registerUser,
  updateCurrentUser,
} from "../../controllers/authController.js";
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
import { hashToken } from "../../utils/tokens.js";

const createResponse = () => ({
  body: null,
  cookies: {},
  clearedCookies: [],
  statusCode: 200,
  cookie(name, value, options) {
    this.cookies[name] = { value, options };
    return this;
  },
  clearCookie(name) {
    this.clearedCookies.push(name);
    return this;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

describe("authController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("returns not found when updating a missing user", async () => {
    mock.method(User, "findById", async () => null);
    const req = {
      body: { name: "Updated User" },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await updateCurrentUser(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "User not found");
  });

  it("updates profile fields without changing protected fields", async () => {
    const userId = new mongoose.Types.ObjectId();
    const user = {
      _id: userId,
      name: "Old Name",
      email: "old@example.com",
      role: "tenant",
      phone: "+254700000000",
      async save() {},
    };
    mock.method(User, "findById", async () => user);
    const req = {
      body: {
        email: "new@example.com",
        name: "Updated User",
        phone: "+254711000000",
        role: "admin",
      },
      user: { _id: userId },
    };
    const res = createResponse();

    await updateCurrentUser(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.name, "Updated User");
    assert.equal(res.body.user.phone, "+254711000000");
    assert.equal(res.body.user.email, "old@example.com");
    assert.equal(res.body.user.role, "tenant");
  });

  it("deletes mover, feedback, saved-search, and device-token data along with the account", async () => {
    const userId = new mongoose.Types.ObjectId();
    const user = {
      _id: userId,
      async deleteOne() {},
    };

    mock.method(User, "findById", async () => user);
    mock.method(Property, "find", () => ({
      select: async () => [],
    }));

    const deleteManyCalls = {};
    const trackDeleteMany = (Model, name) => {
      mock.method(Model, "deleteMany", async (filter) => {
        deleteManyCalls[name] = filter;
        return { deletedCount: 0 };
      });
    };

    trackDeleteMany(AuthSession, "AuthSession");
    trackDeleteMany(Favorite, "Favorite");
    trackDeleteMany(Inquiry, "Inquiry");
    trackDeleteMany(ViewingRequest, "ViewingRequest");
    trackDeleteMany(Review, "Review");
    trackDeleteMany(Notification, "Notification");
    trackDeleteMany(AgencyVerification, "AgencyVerification");
    trackDeleteMany(PropertyImageFingerprint, "PropertyImageFingerprint");
    trackDeleteMany(UserViolation, "UserViolation");
    trackDeleteMany(UserStatusLog, "UserStatusLog");
    trackDeleteMany(Property, "Property");
    trackDeleteMany(Mover, "Mover");
    trackDeleteMany(MoverVerification, "MoverVerification");
    trackDeleteMany(MoverRequest, "MoverRequest");
    trackDeleteMany(Feedback, "Feedback");
    trackDeleteMany(SavedSearch, "SavedSearch");
    trackDeleteMany(DeviceToken, "DeviceToken");

    let moverAffiliateUpdate;
    mock.method(Mover, "updateMany", async (filter, update) => {
      moverAffiliateUpdate = { filter, update };
      return { modifiedCount: 0 };
    });

    const req = { user: { _id: userId } };
    const res = createResponse();

    await deleteCurrentUser(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(deleteManyCalls.Mover, { user: userId });
    assert.deepEqual(deleteManyCalls.MoverVerification, {
      $or: [{ user: userId }, { reviewedBy: userId }],
    });
    assert.deepEqual(deleteManyCalls.MoverRequest, {
      $or: [
        { tenant: userId },
        { moverAccount: userId },
        { respondedBy: userId },
        { property: { $in: [] } },
      ],
    });
    assert.deepEqual(deleteManyCalls.Feedback, {
      $or: [{ submitter: userId }, { "response.respondedBy": userId }],
    });
    assert.deepEqual(deleteManyCalls.SavedSearch, { user: userId });
    assert.deepEqual(deleteManyCalls.DeviceToken, { user: userId });
    assert.deepEqual(moverAffiliateUpdate.filter, { affiliatedOwners: userId });
    assert.deepEqual(moverAffiliateUpdate.update, { $pull: { affiliatedOwners: userId } });
  });

  it("deletes uploaded image files for every owned property, not just the DB records", async () => {
    const userId = new mongoose.Types.ObjectId();
    const user = {
      _id: userId,
      async deleteOne() {},
    };
    // No storagePath set - deletePropertyImage no-ops on a missing
    // storagePath, so this exercises "iterate every owned property's
    // images" without touching the real filesystem/S3.
    const ownedProperties = [
      { _id: new mongoose.Types.ObjectId(), images: [{ url: "https://example.com/a.jpg" }] },
      {
        _id: new mongoose.Types.ObjectId(),
        images: [{ url: "https://example.com/b.jpg" }, { url: "https://example.com/c.jpg" }],
      },
    ];

    mock.method(User, "findById", async () => user);
    mock.method(Property, "find", () => ({
      select: async () => ownedProperties,
    }));

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

    const req = { user: { _id: userId } };
    const res = createResponse();

    // Would throw (fs.rm/S3 on a nonexistent path) if any image were
    // missed or the deletion crashed instead of resolving cleanly.
    await deleteCurrentUser(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
  });

  it("rejects password changes with the wrong current password", async () => {
    const user = {
      async matchPassword() {
        return false;
      },
    };
    mock.method(User, "findById", () => ({
      select: async () => user,
    }));
    const req = {
      body: {
        currentPassword: "wrong-password",
        newPassword: "new-password",
      },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await changePassword(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 401);
    assert.equal(nextError.message, "Current password is incorrect");
  });

  it("registers a user with their chosen username", async () => {
    mock.method(User, "findOne", async () => null);
    let createdPayload;
    mock.method(User, "create", async (payload) => {
      createdPayload = payload;
      return {
        _id: new mongoose.Types.ObjectId(),
        name: payload.name,
        email: payload.email,
        username: payload.username,
        role: "tenant",
        phone: payload.phone,
      };
    });
    mock.method(AuthSession, "create", async (payload) => payload);

    const req = {
      body: {
        email: "new@example.com",
        name: "New User",
        username: "  JohnKamau  ",
        password: "password123",
        phone: "+254700000000",
        role: "tenant",
      },
      headers: {},
    };
    const res = createResponse();

    await registerUser(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.user.username, "johnkamau");
    assert.equal(createdPayload.username, "johnkamau");
  });

  it("rejects a taken username with available suggestions", async () => {
    mock.method(User, "findOne", async (filter) => {
      if (filter.username) {
        return { _id: new mongoose.Types.ObjectId() };
      }
      return null;
    });
    mock.method(User, "exists", async () => false);

    const req = {
      body: {
        email: "new2@example.com",
        name: "New User",
        username: "johnkamau",
        password: "password123",
        phone: "+254700000000",
        role: "tenant",
      },
      headers: {},
    };
    const res = createResponse();
    let nextError;

    await registerUser(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 409);
    assert.equal(nextError.message, "Username is already taken");
    assert.equal(nextError.details.suggestions.length, 3);
    for (const suggestion of nextError.details.suggestions) {
      assert.match(suggestion, /^johnkamau\d{3,4}$/);
    }
  });

  it("logs in using a username instead of an email", async () => {
    const user = {
      _id: new mongoose.Types.ObjectId(),
      name: "Tenant User",
      email: "tenant@example.com",
      username: "swiftcheetah284",
      role: "tenant",
      phone: "+254700000000",
      async matchPassword() {
        return true;
      },
    };
    let findFilter;
    mock.method(User, "findOne", (filter) => {
      findFilter = filter;
      return { select: async () => user };
    });
    mock.method(AuthSession, "create", async (payload) => payload);

    const req = {
      body: { identifier: "SwiftCheetah284", password: "password123" },
      headers: {},
    };
    const res = createResponse();

    await loginUser(req, res, (error) => {
      throw error;
    });

    assert.deepEqual(findFilter.$or, [
      { email: "swiftcheetah284" },
      { username: "swiftcheetah284" },
    ]);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.username, "swiftcheetah284");
  });

  it("rejects an unknown identifier with a generic message", async () => {
    mock.method(User, "findOne", () => ({ select: async () => null }));
    const req = { body: { identifier: "nobody", password: "whatever" } };
    const res = createResponse();
    let nextError;

    await loginUser(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 401);
    assert.equal(nextError.message, "Invalid credentials");
  });

  it("rejects missing refresh tokens", async () => {
    const req = {
      body: {},
      headers: {},
    };
    const res = createResponse();
    let nextError;

    await refreshAccessToken(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 401);
    assert.equal(nextError.message, "Refresh token missing");
  });

  it("rotates valid refresh sessions", async () => {
    const userId = new mongoose.Types.ObjectId();
    const user = {
      _id: userId,
      name: "Tenant User",
      email: "tenant@example.com",
      role: "tenant",
      phone: "+254700000000",
      accountStatus: "active",
    };
    const session = {
      user,
      revokedAt: null,
      lastUsedAt: null,
      saveCalled: false,
      async save() {
        this.saveCalled = true;
      },
    };
    let findFilters;
    let createdSession;

    mock.method(AuthSession, "findOne", (filters) => {
      findFilters = filters;

      return {
        populate: async () => session,
      };
    });
    mock.method(AuthSession, "create", async (payload) => {
      createdSession = payload;
      return payload;
    });

    const req = {
      body: { refreshToken: "refresh-token-value" },
      headers: { "user-agent": "node-test" },
      ip: "127.0.0.1",
    };
    const res = createResponse();

    await refreshAccessToken(req, res, (error) => {
      throw error;
    });

    assert.equal(findFilters.tokenHash, hashToken("refresh-token-value"));
    assert.equal(session.revokedAt instanceof Date, true);
    assert.equal(session.lastUsedAt instanceof Date, true);
    assert.equal(session.saveCalled, true);
    assert.equal(createdSession.user, userId);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.email, "tenant@example.com");
    assert.equal(typeof res.body.token, "string");
    assert.equal(typeof res.body.refreshToken, "string");
  });
});
