import Inquiry from "../models/Inquiry.js";
// Registers the "Property" model so populate("property", ...) below can resolve it -
// this job runs from a standalone script (not the Express app), which never
// otherwise imports Property.
import "../models/Property.js";
import { notifyStaleInquiry } from "../services/notificationService.js";

const staleThresholdMs = 48 * 60 * 60 * 1000;

const run = async () => {
  const cutoff = new Date(Date.now() - staleThresholdMs);
  const staleInquiries = await Inquiry.find({
    status: "open",
    createdAt: { $lte: cutoff },
    nudgedAt: null,
  }).populate("property", "title");

  for (const inquiry of staleInquiries) {
    await notifyStaleInquiry(inquiry);
    inquiry.nudgedAt = new Date();
    await inquiry.save();
  }

  return staleInquiries.length;
};

export { run };
