import ViewingRequest from "../models/ViewingRequest.js";
// Registers the "Property" model so populate("property", ...) below can resolve it -
// this job runs from a standalone script (not the Express app), which never
// otherwise imports Property.
import "../models/Property.js";
import { notifyUpcomingViewing } from "../services/notificationService.js";
import env from "../config/env.js";

const run = async () => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + env.viewingReminderWindowMs);

  const upcomingViewings = await ViewingRequest.find({
    status: "approved",
    requestedDate: { $gte: now, $lte: windowEnd },
    reminderSentAt: null,
  }).populate("property", "title");

  for (const viewingRequest of upcomingViewings) {
    await notifyUpcomingViewing(viewingRequest);
    viewingRequest.reminderSentAt = new Date();
    await viewingRequest.save();
  }

  return upcomingViewings.length;
};

export { run };
