import ViewingRequest from "../models/ViewingRequest.js";
// Registers the "Property" model so populate("property", ...) below can resolve it -
// this job runs from a standalone script (not the Express app), which never
// otherwise imports Property.
import "../models/Property.js";
import Review from "../models/Review.js";
import { notifyReviewPrompt } from "../services/notificationService.js";
import env from "../config/env.js";

const run = async () => {
  const now = new Date();
  // Bounded lookback so a long-stopped scheduler doesn't wake up and dump
  // years-old viewings into everyone's inbox the moment it resumes.
  const lookbackStart = new Date(now.getTime() - env.reviewPromptLookbackMs);

  const pastViewings = await ViewingRequest.find({
    status: "approved",
    requestedDate: { $lt: now, $gte: lookbackStart },
    reviewPromptSentAt: null,
  }).populate("property", "title");

  for (const viewingRequest of pastViewings) {
    const alreadyReviewed = await Review.exists({
      property: viewingRequest.property._id || viewingRequest.property,
      user: viewingRequest.requester,
    });

    if (!alreadyReviewed) {
      await notifyReviewPrompt(viewingRequest);
    }

    viewingRequest.status = "completed";
    viewingRequest.reviewPromptSentAt = new Date();
    await viewingRequest.save();
  }

  return pastViewings.length;
};

export { run };
