import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  changePassword,
  loginUser,
  refreshAccessToken,
  registerUser,
  updateCurrentUser,
} from "../../controllers/authController.js";
import AuthSession from "../../models/AuthSession.js";
import User from "../../models/User.js";
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

  it("assigns a generated username during registration", async () => {
    mock.method(User, "findOne", async () => null);
    mock.method(User, "exists", async () => false);
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
    assert.match(res.body.user.username, /^[a-z]+[a-z]+\d{3,4}$/);
    assert.equal(createdPayload.username, res.body.user.username);
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
