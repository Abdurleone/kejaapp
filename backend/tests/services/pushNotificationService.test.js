import assert from "node:assert/strict";
import mongoose from "mongoose";
import { Expo } from "expo-server-sdk";
import webpush from "web-push";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { sendPushNotifications, sendWebPushNotifications } from "../../services/pushNotificationService.js";
import DeviceToken from "../../models/DeviceToken.js";
import PushReceipt from "../../models/PushReceipt.js";
import PushSubscription from "../../models/PushSubscription.js";
import env from "../../config/env.js";

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

  it("records a successfully-queued ticket's id for later receipt polling", async () => {
    mock.method(DeviceToken, "find", async () => [{ token: validToken }]);
    mock.method(Expo.prototype, "sendPushNotificationsAsync", async () => [
      { status: "ok", id: "ticket-1" },
    ]);
    const create = mock.method(PushReceipt, "create", async () => ({}));

    await sendPushNotifications(new mongoose.Types.ObjectId(), { title: "Hi", body: "There" });

    assert.equal(create.mock.callCount(), 1);
    assert.deepEqual(create.mock.calls[0].arguments[0], { ticketId: "ticket-1", token: validToken });
  });
});

describe("sendWebPushNotifications", () => {
  const originalVapidPublicKey = env.vapidPublicKey;
  const originalVapidPrivateKey = env.vapidPrivateKey;

  afterEach(() => {
    mock.restoreAll();
    env.vapidPublicKey = originalVapidPublicKey;
    env.vapidPrivateKey = originalVapidPrivateKey;
  });

  it("does nothing when VAPID keys aren't configured", async () => {
    env.vapidPublicKey = "";
    env.vapidPrivateKey = "";
    const find = mock.method(PushSubscription, "find", async () => []);

    await sendWebPushNotifications(new mongoose.Types.ObjectId(), { title: "Hi", body: "There" });

    assert.equal(find.mock.callCount(), 0);
  });

  it("sends a push to each stored subscription for the user", async () => {
    env.vapidPublicKey = "public-key";
    env.vapidPrivateKey = "private-key";
    const subscription = {
      endpoint: "https://push.example.com/abc",
      keys: { p256dh: "p256dh-value", auth: "auth-value" },
    };
    mock.method(PushSubscription, "find", async () => [subscription]);
    const send = mock.method(webpush, "sendNotification", async () => ({}));

    await sendWebPushNotifications(new mongoose.Types.ObjectId(), {
      title: "Hi",
      body: "There",
      data: { foo: "bar" },
    });

    assert.equal(send.mock.callCount(), 1);
    const [target, payload] = send.mock.calls[0].arguments;
    assert.deepEqual(target, { endpoint: subscription.endpoint, keys: subscription.keys });
    assert.deepEqual(JSON.parse(payload), { title: "Hi", body: "There", data: { foo: "bar" } });
  });

  it("prunes a subscription that comes back as 410 Gone", async () => {
    env.vapidPublicKey = "public-key";
    env.vapidPrivateKey = "private-key";
    const subscription = { endpoint: "https://push.example.com/gone", keys: {} };
    mock.method(PushSubscription, "find", async () => [subscription]);
    mock.method(webpush, "sendNotification", async () => {
      const error = new Error("Gone");
      error.statusCode = 410;
      throw error;
    });
    const deleteOne = mock.method(PushSubscription, "deleteOne", async () => ({}));

    await sendWebPushNotifications(new mongoose.Types.ObjectId(), { title: "Hi", body: "There" });

    assert.equal(deleteOne.mock.callCount(), 1);
    assert.deepEqual(deleteOne.mock.calls[0].arguments[0], { endpoint: subscription.endpoint });
  });

  it("surfaces an unexpected send failure to the caller instead of swallowing it", async () => {
    env.vapidPublicKey = "public-key";
    env.vapidPrivateKey = "private-key";
    mock.method(PushSubscription, "find", async () => [
      { endpoint: "https://push.example.com/x", keys: {} },
    ]);
    mock.method(webpush, "sendNotification", async () => {
      throw new Error("Network unreachable");
    });

    await assert.rejects(
      sendWebPushNotifications(new mongoose.Types.ObjectId(), { title: "Hi", body: "There" }),
      /Network unreachable/
    );
  });
});
