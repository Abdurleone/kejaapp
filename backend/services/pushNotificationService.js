import { Expo } from "expo-server-sdk";
import DeviceToken from "../models/DeviceToken.js";

const expo = new Expo();

// Tickets are just Expo's immediate submission acknowledgment - a malformed
// or already-known-dead token can surface "DeviceNotRegistered" here, but
// most cases only reveal that after the underlying push service (APNs/FCM)
// processes it, which requires a separate later receipt-polling step
// (expo.getPushNotificationReceiptsAsync). Not implemented here - this
// catches the fast-path cases in the meantime.
const pruneInvalidTokens = async (messages, tickets) => {
  await Promise.all(
    tickets.map((ticket, index) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        return DeviceToken.deleteOne({ token: messages[index].to });
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
    await pruneInvalidTokens(chunk, tickets);
  }
};

export { sendPushNotifications };
