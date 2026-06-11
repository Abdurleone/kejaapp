import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "node:test";
import {
  changePassword,
  updateCurrentUser,
} from "../../controllers/authController.js";
import User from "../../models/User.js";

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
});
