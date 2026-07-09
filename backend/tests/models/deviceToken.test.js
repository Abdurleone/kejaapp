import assert from "node:assert/strict";
import mongoose from "mongoose";
import { describe, it } from "node:test";
import DeviceToken from "../../models/DeviceToken.js";

describe("DeviceToken model", () => {
  it("stores a user reference, token, and platform", () => {
    const user = new mongoose.Types.ObjectId();
    const deviceToken = new DeviceToken({
      user,
      token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
      platform: "android",
    });

    assert.equal(deviceToken.user, user);
    assert.equal(deviceToken.token, "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]");
    assert.equal(deviceToken.platform, "android");
  });

  it("requires a user and a token", () => {
    const deviceToken = new DeviceToken({});
    const error = deviceToken.validateSync();

    assert.ok(error.errors.user);
    assert.ok(error.errors.token);
  });
});
