import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { registerDeviceToken, removeDeviceToken } from "../../controllers/deviceTokenController.js";
import DeviceToken from "../../models/DeviceToken.js";

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

describe("deviceTokenController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("upserts a device token for the current user", async () => {
    const userId = new mongoose.Types.ObjectId();
    const created = { _id: new mongoose.Types.ObjectId(), user: userId, token: "abc", platform: "ios" };

    const findOneAndUpdate = mock.method(DeviceToken, "findOneAndUpdate", async (filter, update) => {
      assert.deepEqual(filter, { token: "abc" });
      assert.deepEqual(update, { user: userId, token: "abc", platform: "ios" });
      return created;
    });

    const req = { user: { _id: userId }, body: { token: "abc", platform: "ios" } };
    const res = createResponse();

    await registerDeviceToken(req, res, (error) => {
      throw error;
    });

    assert.equal(findOneAndUpdate.mock.callCount(), 1);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data, created);
  });

  it("rejects registering without a token", async () => {
    const req = { user: { _id: new mongoose.Types.ObjectId() }, body: {} };
    const res = createResponse();
    let nextError;

    await registerDeviceToken(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "token is required");
  });

  it("removes a device token for the current user", async () => {
    const userId = new mongoose.Types.ObjectId();
    const deleteOne = mock.method(DeviceToken, "deleteOne", async (filter) => {
      assert.deepEqual(filter, { user: userId, token: "abc" });
      return { deletedCount: 1 };
    });

    const req = { user: { _id: userId }, body: { token: "abc" } };
    const res = createResponse();

    await removeDeviceToken(req, res, (error) => {
      throw error;
    });

    assert.equal(deleteOne.mock.callCount(), 1);
    assert.equal(res.statusCode, 200);
  });

  it("rejects removing without a token", async () => {
    const req = { user: { _id: new mongoose.Types.ObjectId() }, body: {} };
    const res = createResponse();
    let nextError;

    await removeDeviceToken(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "token is required");
  });
});
