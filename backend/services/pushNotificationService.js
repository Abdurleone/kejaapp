import { Expo } from "expo-server-sdk";
import webpush from "web-push";
import env from "../config/env.js";
import DeviceToken from "../models/DeviceToken.js";
import PushReceipt from "../models/PushReceipt.js";
import PushSubscription from "../models/PushSubscription.js";

const expo = new Expo();

if (env.vapidPublicKey && env.vapidPrivateKey) {
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
}

// Tickets are just Expo's immediate submission acknowledgment - a malformed
// or already-known-dead token can surface "DeviceNotRegistered" here, but
// most cases only reveal that after the underlying push service (APNs/FCM)
// processes it, which requires a separate later receipt-polling step. A
// successfully-queued ticket's id is persisted so
// backend/jobs/pollExpoPushReceipts.js can check back later and prune those
// tokens too; this only handles the fast-path cases in the meantime.
const recordTicketOutcomes = async (messages, tickets) => {
  await Promise.all(
    tickets.map((ticket, index) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        return DeviceToken.deleteOne({ token: messages[index].to });
      }

      if (ticket.status === "ok" && ticket.id) {
        return PushReceipt.create({ ticketId: ticket.id, token: messages[index].to });
      }

      return null;
    })
  );
};

const sendPushNotifications = async (userId, { title, body, data }) => {
  const deviceTokens = await DeviceToken.find({ user: userId });

  const messages = deviceTokens
    .filter((deviceToken) => Expo.isExpoPushToken(deviceToken.token))
    .map((deviceToken) => ({
      to: deviceToken.token,
      sound: "default",
      title,
      body,
      data,
    }));

  if (messages.length === 0) {
    return;
  }

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    await recordTicketOutcomes(chunk, tickets);
  }
};

// Same delivery mechanism as Expo above, for web browser subscriptions - a
// structurally different shape ({endpoint, keys}) that doesn't fit into
// DeviceToken's plain-string token field, so it's stored separately in
// PushSubscription. No-ops entirely if VAPID keys aren't configured, mirroring
// redisUrl/clamavHost's "empty = disabled" convention elsewhere in this app.
const sendWebPushNotifications = async (userId, { title, body, data }) => {
  if (!env.vapidPublicKey || !env.vapidPrivateKey) {
    return;
  }

  const subscriptions = await PushSubscription.find({ user: userId });
  const payload = JSON.stringify({ title, body, data });

  // allSettled, not all: one subscription's failure must not stop delivery
  // to the user's other browsers/devices.
  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, payload)
    )
  );

  const unexpectedErrors = [];

  await Promise.all(
    results.map((result, index) => {
      if (result.status === "fulfilled") {
        return null;
      }

      // 404/410 means the browser/OS has permanently invalidated this
      // subscription (e.g. the user cleared site data) - prune it, mirroring
      // the Expo path's DeviceNotRegistered cleanup above.
      if (result.reason?.statusCode === 404 || result.reason?.statusCode === 410) {
        return PushSubscription.deleteOne({ endpoint: subscriptions[index].endpoint });
      }

      unexpectedErrors.push(result.reason);
      return null;
    })
  );

  // Surfaced to the caller's own non-blocking try/catch instead of swallowed,
  // matching how a thrown error from Expo's SDK would already propagate.
  if (unexpectedErrors.length > 0) {
    throw unexpectedErrors[0];
  }
};

export { sendPushNotifications, sendWebPushNotifications };
