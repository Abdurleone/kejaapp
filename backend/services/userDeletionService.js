import AgencyVerification from "../models/AgencyVerification.js";
import AuthSession from "../models/AuthSession.js";
import DeviceToken from "../models/DeviceToken.js";
import Favorite from "../models/Favorite.js";
import Feedback from "../models/Feedback.js";
import Inquiry from "../models/Inquiry.js";
import Mover from "../models/Mover.js";
import MoverRequest from "../models/MoverRequest.js";
import MoverVerification from "../models/MoverVerification.js";
import Notification from "../models/Notification.js";
import Property from "../models/Property.js";
import PropertyImageFingerprint from "../models/PropertyImageFingerprint.js";
import PushSubscription from "../models/PushSubscription.js";
import Review from "../models/Review.js";
import SavedSearch from "../models/SavedSearch.js";
import User from "../models/User.js";
import UserStatusLog from "../models/UserStatusLog.js";
import UserViolation from "../models/UserViolation.js";
import ViewingRequest from "../models/ViewingRequest.js";
import { invalidateNamespace } from "../middlewares/responseCache.js";
import ApiError from "../utils/apiError.js";
import httpStatus from "../constants/httpStatus.js";
import {
  clearPropertyViolationEvidence,
  deleteOwnedPropertyReferences,
  deletePropertyImages,
} from "./propertyCascadeService.js";

// Shared by the self-service "delete my account" flow (authController's
// deleteCurrentUser) and admin-initiated deletion - both need the exact same
// full cascade, not just the User document itself. Extracted so there's one
// place that knows every model with a reference to a user, instead of two
// copies drifting apart as new user-referencing models get added.
export const deleteUserCascade = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const ownedProperties = await Property.find({ owner: userId }).select("_id images");
  const ownedPropertyIds = ownedProperties.map((property) => property._id);

  // Deleting this user's own reviews (below) via deleteMany skips Review's
  // post("deleteOne") hook that recalculates a property's rating - so any
  // review they left on someone *else's* still-existing property would
  // leave that property's ratingAverage/ratingCount stale forever. Capture
  // which other-owned properties are affected before deleting, so their
  // ratings can be recomputed afterward (properties this user owns
  // themselves are being deleted too - no point recomputing those).
  const reviewCleanupFilter = { $or: [{ user: userId }, { "ownerResponse.respondedBy": userId }] };
  const reviewAffectedPropertyIds = await Review.distinct("property", reviewCleanupFilter);
  const ownedPropertyIdSet = new Set(ownedPropertyIds.map((id) => id.toString()));
  const otherOwnersAffectedPropertyIds = reviewAffectedPropertyIds.filter(
    (propertyId) => !ownedPropertyIdSet.has(propertyId.toString())
  );

  // Property-referencing models cascade off the same shared registry
  // deleteProperty uses (services/propertyCascadeService.js), scoped to every
  // property this user owns. Each of these models also has actor fields with
  // no property angle at all (sender/owner/respondedBy etc.) - those are kept
  // here as narrower, model-specific deletes alongside the shared calls.
  await Promise.all([
    AuthSession.deleteMany({ user: userId }),
    ...deletePropertyImages(ownedProperties),
    ...deleteOwnedPropertyReferences(ownedPropertyIds),
    ...clearPropertyViolationEvidence(ownedPropertyIds),
    Favorite.deleteMany({ user: userId }),
    Inquiry.deleteMany({
      $or: [{ sender: userId }, { owner: userId }, { respondedBy: userId }],
    }),
    ViewingRequest.deleteMany({
      $or: [{ requester: userId }, { owner: userId }, { reviewedBy: userId }],
    }),
    Review.deleteMany(reviewCleanupFilter),
    // Same reasoning as AgencyVerification above: a review this user merely
    // hid or reported (as a moderator/reporter), on someone else's review,
    // belongs to a different, still-existing user and must survive - the
    // actor reference is cleared instead of the whole document being
    // deleted. Reviews authored by this user are already handled by the
    // deleteMany above, so those are excluded here to avoid double-handling.
    Review.updateMany(
      { hiddenBy: userId, user: { $ne: userId } },
      { $unset: { hiddenBy: "" } }
    ),
    Review.updateMany(
      { "report.reportedBy": userId, user: { $ne: userId } },
      { $unset: { "report.reportedBy": "" } }
    ),
    Notification.deleteMany({ user: userId }),
    AgencyVerification.deleteMany({ user: userId }),
    // Only the deleted user's own submission is deleted above - a
    // verification they merely reviewed (as an admin) belongs to a
    // different, still-existing user and must survive; the reviewer
    // reference is cleared instead, mirroring how UserViolation's evidence
    // references are unset rather than deleted.
    AgencyVerification.updateMany(
      { reviewedBy: userId, user: { $ne: userId } },
      { $unset: { reviewedBy: "" } }
    ),
    PropertyImageFingerprint.deleteMany({
      $or: [{ uploadedBy: userId }, { matchedUploadedBy: userId }],
    }),
    UserViolation.deleteMany({ user: userId }),
    UserStatusLog.deleteMany({ user: userId }),
    // Same reasoning as AgencyVerification above: a status-change log row
    // where this user was the acting admin, not the subject, is another
    // user's moderation audit trail and must survive account deletion.
    UserStatusLog.updateMany(
      { changedBy: userId, user: { $ne: userId } },
      { $unset: { changedBy: "" } }
    ),
    Property.deleteMany({ owner: userId }),
    Mover.deleteMany({ user: userId }),
    Mover.updateMany(
      { affiliatedOwners: userId },
      { $pull: { affiliatedOwners: userId } }
    ),
    MoverVerification.deleteMany({ user: userId }),
    // Same reasoning as AgencyVerification above.
    MoverVerification.updateMany(
      { reviewedBy: userId, user: { $ne: userId } },
      { $unset: { reviewedBy: "" } }
    ),
    MoverRequest.deleteMany({
      $or: [{ tenant: userId }, { moverAccount: userId }, { respondedBy: userId }],
    }),
    Feedback.deleteMany({ submitter: userId }),
    // Same reasoning as AgencyVerification above: feedback this user merely
    // responded to (as an admin) belongs to a different, still-existing
    // user and must survive account deletion - the responder reference is
    // cleared instead of the whole document being deleted.
    Feedback.updateMany(
      { "response.respondedBy": userId, submitter: { $ne: userId } },
      { $unset: { "response.respondedBy": "" } }
    ),
    SavedSearch.deleteMany({ user: userId }),
    DeviceToken.deleteMany({ user: userId }),
    PushSubscription.deleteMany({ user: userId }),
  ]);

  await Promise.all(
    otherOwnersAffectedPropertyIds.map((propertyId) => Review.updatePropertyRating(propertyId))
  );

  // The cascade above deletes/mutates properties and ratings but never
  // invalidated the response cache backing GET /api/properties(/:id) -
  // without this, a deleted property or a just-recomputed rating could
  // keep serving stale cached data for up to the cache's TTL.
  await invalidateNamespace("properties");

  await user.deleteOne();

  return user;
};
