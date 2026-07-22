import { Expo } from "expo-server-sdk";
import DeviceToken from "../models/DeviceToken.js";
import PushReceipt from "../models/PushReceipt.js";

const expo = new Expo();

// Expo only guarantees receipts stay available for roughly a day after the
// ticket was issued. If a ticket id somehow never gets a definitive receipt
// back by then (an Expo outage, a malformed id, etc.), give up on it rather
// than polling forever.
const receiptMaxAgeMs = 24 * 60 * 60 * 1000;

// Bounds memory/DB load per run if the queue ever backs up. Oldest-first so a
// backlog drains in order across runs instead of newest tickets starving old
// ones; nothing is lost - unprocessed receipts just wait for the next run.
const receiptBatchSize = 1000;

const run = async () => {
  const pendingReceipts = await PushReceipt.find({}).sort("createdAt").limit(receiptBatchSize);

  if (pendingReceipts.length === 0) {
    return 0;
  }

  const pendingByTicketId = new Map(pendingReceipts.map((pending) => [pending.ticketId, pending]));
  const chunks = expo.chunkPushNotificationReceiptIds(pendingReceipts.map((pending) => pending.ticketId));
  let processedCount = 0;

  for (const chunk of chunks) {
    const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

    for (const [ticketId, receipt] of Object.entries(receipts)) {
      const pending = pendingByTicketId.get(ticketId);

      if (!pending) {
        continue;
      }

      if (receipt.status === "error" && receipt.details?.error === "DeviceNotRegistered") {
        await DeviceToken.deleteOne({ token: pending.token });
      }

      await PushReceipt.deleteOne({ _id: pending._id });
      processedCount += 1;
    }
  }

  const cutoff = new Date(Date.now() - receiptMaxAgeMs);
  const expiredResult = await PushReceipt.deleteMany({ createdAt: { $lte: cutoff } });
  processedCount += expiredResult.deletedCount || 0;

  return processedCount;
};

export { run };
