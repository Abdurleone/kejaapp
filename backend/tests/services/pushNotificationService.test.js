import assert from "node:assert/strict";
import mongoose from "mongoose";
import { Expo } from "expo-server-sdk";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { sendPushNotifications } from "../../services/pushNotificationService.js";
import DeviceToken from "../../models/DeviceToken.js";

const validToken = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";

describe("pushNotificationService", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("does nothing when the user has no registered devices", async () => {
    mock.method(DeviceToken, "find", async () => []);
    const send = mock.method(Expo.prototype, "sendPushNotificationsAsync", async () => []);

    await sendPushNotifications(new mongoose.Types.ObjectId(), { title: "Hi", body: "There" });

    assert.equal(send.mock.callCount(), 0);
  });

  it("sends a push to each valid Expo push token", async () => {
    mock.method(DeviceToken, "find", async () => [{ token: validToken }]);
    const send = mock.method(Expo.prototype, "sendPushNotificationsAsync", async (messages) =>
      messages.map(() => ({ status: "ok" })),
    );

    await sendPushNotifications(new mongoose.Types.ObjectId(), {
      title: "Hi",
      body: "There",
      data: { foo: "bar" },
    });

    assert.equal(send.mock.callCount(), 1);
    const [messages] = send.mock.calls[0].arguments;
    assert.equal(messages[0].to, validToken);
    assert.equal(messages[0].title, "Hi");
    assert.equal(messages[0].body, "There");
    assert.deepEqual(messages[0].data, { foo: "bar" });
  });

  it("skips tokens that are not valid Expo push tokens", async () => {
    mock.method(DeviceToken, "find", async () => [{ token: "not-a-real-token" }]);
    const send = mock.method(Expo.prototype, "sendPushNotificationsAsync", async () => []);

    await sendPushNotifications(new mongoose.Types.ObjectId(), { title: "Hi", body: "There" });

    assert.equal(send.mock.callCount(), 0);
  });

  it("prunes tokens that come back as DeviceNotRegistered", async () => {
    mock.method(DeviceToken, "find", async () => [{ token: validToken }]);
    mock.method(Expo.prototype, "sendPushNotificationsAsync", async () => [
      { status: "error", details: { error: "DeviceNotRegistered" } },
    ]);
    const deleteOne = mock.method(DeviceToken, "deleteOne", async () => ({}));

    await sendPushNotifications(new mongoose.Types.ObjectId(), { title: "Hi", body: "There" });

    assert.equal(deleteOne.mock.callCount(), 1);
    assert.deepEqual(deleteOne.mock.calls[0].arguments[0], { token: validToken });
  });
});
