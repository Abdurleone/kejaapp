import { Expo } from "expo-server-sdk";
import DeviceToken from "../models/DeviceToken.js";
import PushReceipt from "../models/PushReceipt.js";

const expo = new Expo();

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

export { sendPushNotifications };
