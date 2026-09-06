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

  const scheduledViewings = await ViewingRequest.find({
    status: "approved",
    requestedDate: { $lt: now, $gte: lookbackStart },
    reviewPromptSentAt: null,
  }).populate("property", "title");

  // "Open" viewings (property.viewingType === "open") are auto-approved with
  // no requestedDate at all - there's no future date to wait out, so they'd
  // otherwise never match the query above and would sit at "approved"
  // forever, with the tenant never nudged for a review. Treat one as likely
  // completed once it's old enough that a visit would plausibly have
  // happened, anchored on createdAt instead of the requestedDate they don't have.
  const openViewingCutoff = new Date(now.getTime() - env.openViewingCompletionDelayMs);
  const openViewings = await ViewingRequest.find({
    status: "approved",
    requestedDate: null,
    createdAt: { $lt: openViewingCutoff, $gte: lookbackStart },
    reviewPromptSentAt: null,
  }).populate("property", "title");

  const pastViewings = [...scheduledViewings, ...openViewings];

  if (pastViewings.length === 0) {
    return 0;
  }

  const propertyId = (viewingRequest) => viewingRequest.property._id || viewingRequest.property;
  const existingReviews = await Review.find(
    {
      property: { $in: pastViewings.map(propertyId) },
      user: { $in: pastViewings.map((viewingRequest) => viewingRequest.requester) },
    },
    { property: 1, user: 1 }
  ).lean();
  const reviewedPairs = new Set(existingReviews.map(({ property, user }) => `${property}:${user}`));

  // A legitimate approved -> cancelled transition (via
  // updateViewingRequestStatus) can land in the window between the find()
  // calls above and this loop reaching a given item - re-checking the live
  // status immediately before acting on it stops that race from silently
  // un-cancelling a viewing back to "completed".
  const isStillApproved = async (id) => {
    const current = await ViewingRequest.findById(id, "status").lean();
    return Boolean(current) && current.status === "approved";
  };

  // Sequential, one notify-then-save per viewing request (not a batch
  // Promise.all followed by a separate bulk updateMany): if one
  // notification fails mid-run, only the requests not yet processed stay
  // eligible for the next run - a batch-then-bulk-update approach would
  // leave every already-notified request's reviewPromptSentAt unset too,
  // causing them to be re-notified on every subsequent run indefinitely.
  for (const viewingRequest of pastViewings) {
    // Checked once before the notification (so a since-cancelled viewing
    // isn't prompted at all) and again immediately before the save (in case
    // the cancellation lands in the narrower gap while the notification was
    // in flight) - either check failing means someone else already moved
    // this viewing on, so it's left untouched for this run.
    if (!(await isStillApproved(viewingRequest._id))) {
      continue;
    }

    if (!reviewedPairs.has(`${propertyId(viewingRequest)}:${viewingRequest.requester}`)) {
      await notifyReviewPrompt(viewingRequest);
    }

    if (!(await isStillApproved(viewingRequest._id))) {
      continue;
    }

    viewingRequest.status = "completed";
    viewingRequest.reviewPromptSentAt = new Date();
    await viewingRequest.save();
  }

  return pastViewings.length;
};

export { run };
