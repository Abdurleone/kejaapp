import ViewingRequest from "../models/ViewingRequest.js";
// Registers the "Property" model so populate("property", ...) below can resolve it -
// this job runs from a standalone script (not the Express app), which never
// otherwise imports Property.
import "../models/Property.js";
import { notifyStaleViewingRequest } from "../services/notificationService.js";
import env from "../config/env.js";

const run = async () => {
  const cutoff = new Date(Date.now() - env.staleNudgeThresholdMs);
  const staleViewingRequests = await ViewingRequest.find({
    status: "pending",
    createdAt: { $lte: cutoff },
    nudgedAt: null,
  }).populate("property", "title");

  for (const viewingRequest of staleViewingRequests) {
    await notifyStaleViewingRequest(viewingRequest);
    viewingRequest.nudgedAt = new Date();
    await viewingRequest.save();
  }

  return staleViewingRequests.length;
};

export { run };
