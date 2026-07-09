import ViewingRequest from "../models/ViewingRequest.js";
// Registers the "Property" model so populate("property", ...) below can resolve it -
// this job runs from a standalone script (not the Express app), which never
// otherwise imports Property.
import "../models/Property.js";
import Review from "../models/Review.js";
import { notifyReviewPrompt } from "../services/notificationService.js";

// Bounded lookback so a long-stopped scheduler doesn't wake up and dump
// years-old viewings into everyone's inbox the moment it resumes.
const lookbackWindowMs = 14 * 24 * 60 * 60 * 1000;

const run = async () => {
  const now = new Date();
  const lookbackStart = new Date(now.getTime() - lookbackWindowMs);

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
