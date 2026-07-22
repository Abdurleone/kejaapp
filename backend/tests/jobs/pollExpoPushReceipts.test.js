import assert from "node:assert/strict";
import mongoose from "mongoose";
import { Expo } from "expo-server-sdk";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { run } from "../../jobs/pollExpoPushReceipts.js";
import DeviceToken from "../../models/DeviceToken.js";
import PushReceipt from "../../models/PushReceipt.js";

const buildPending = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  ticketId: "ticket-1",
  token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  createdAt: new Date(),
  ...overrides,
});

describe("pollExpoPushReceipts job", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("does nothing when there are no pending receipts", async () => {
    mock.method(PushReceipt, "find", () => ({ sort: () => ({ limit: async () => [] }) }));
    const getReceipts = mock.method(Expo.prototype, "getPushNotificationReceiptsAsync", async () => ({}));

    const processedCount = await run();

    assert.equal(getReceipts.mock.callCount(), 0);
    assert.equal(processedCount, 0);
  });

  it("clears a pending receipt once it comes back ok", async () => {
    const pending = buildPending();

    mock.method(PushReceipt, "find", () => ({ sort: () => ({ limit: async () => [pending] }) }));
    mock.method(Expo.prototype, "getPushNotificationReceiptsAsync", async () => ({
      "ticket-1": { status: "ok" },
    }));
    const deleteOne = mock.method(PushReceipt, "deleteOne", async () => ({}));
    const deviceDeleteOne = mock.method(DeviceToken, "deleteOne", async () => ({}));
    mock.method(PushReceipt, "deleteMany", async () => ({ deletedCount: 0 }));

    const processedCount = await run();

    assert.equal(deleteOne.mock.callCount(), 1);
    assert.deepEqual(deleteOne.mock.calls[0].arguments[0], { _id: pending._id });
    assert.equal(deviceDeleteOne.mock.callCount(), 0);
    assert.equal(processedCount, 1);
  });

  it("prunes the device token when the receipt reports DeviceNotRegistered", async () => {
    const pending = buildPending();

    mock.method(PushReceipt, "find", () => ({ sort: () => ({ limit: async () => [pending] }) }));
    mock.method(Expo.prototype, "getPushNotificationReceiptsAsync", async () => ({
      "ticket-1": { status: "error", details: { error: "DeviceNotRegistered" } },
    }));
    mock.method(PushReceipt, "deleteOne", async () => ({}));
    const deviceDeleteOne = mock.method(DeviceToken, "deleteOne", async () => ({}));
    mock.method(PushReceipt, "deleteMany", async () => ({ deletedCount: 0 }));

    const processedCount = await run();

    assert.equal(deviceDeleteOne.mock.callCount(), 1);
    assert.deepEqual(deviceDeleteOne.mock.calls[0].arguments[0], { token: pending.token });
    assert.equal(processedCount, 1);
  });

  it("leaves a receipt pending when Expo hasn't returned an answer for it yet", async () => {
    const pending = buildPending();

    mock.method(PushReceipt, "find", () => ({ sort: () => ({ limit: async () => [pending] }) }));
    mock.method(Expo.prototype, "getPushNotificationReceiptsAsync", async () => ({}));
    const deleteOne = mock.method(PushReceipt, "deleteOne", async () => ({}));
    mock.method(PushReceipt, "deleteMany", async () => ({ deletedCount: 0 }));

    const processedCount = await run();

    assert.equal(deleteOne.mock.callCount(), 0);
    assert.equal(processedCount, 0);
  });

  it("gives up on receipts past the max age even with no answer from Expo", async () => {
    const pending = buildPending({ createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) });

    mock.method(PushReceipt, "find", () => ({ sort: () => ({ limit: async () => [pending] }) }));
    mock.method(Expo.prototype, "getPushNotificationReceiptsAsync", async () => ({}));
    mock.method(PushReceipt, "deleteOne", async () => ({}));
    const deleteMany = mock.method(PushReceipt, "deleteMany", async (query) => {
      assert.ok(query.createdAt.$lte instanceof Date);
      return { deletedCount: 1 };
    });

    const processedCount = await run();

    assert.equal(deleteMany.mock.callCount(), 1);
    assert.equal(processedCount, 1);
  });
});
