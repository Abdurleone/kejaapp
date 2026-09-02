import httpStatus from "../constants/httpStatus.js";
import { invalidateNamespace } from "../middlewares/responseCache.js";
import Property from "../models/Property.js";
import Review from "../models/Review.js";
import ViewingRequest from "../models/ViewingRequest.js";
import { notifyPropertyReviewCreated } from "../services/notificationService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { formatPagination, parsePaginationParams } from "../utils/pagination.js";
import { sanitizeText } from "../utils/sanitizeText.js";

const listPropertyReviews = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  const { page, limit, skip } = parsePaginationParams(req.query);
  // Public/tenant-facing - a hidden review (admin upheld a report against it)
  // is excluded here the same way its rating is already excluded from
  // Property.ratingAverage (see Review.updatePropertyRating). Nothing about
  // "hidden" is exposed to this response either, so a filtered-out review
  // simply doesn't exist as far as this endpoint's caller can tell.
  const filters = { property: req.params.id, hidden: { $ne: true } };

  const [reviews, total] = await Promise.all([
    Review.find(filters)
      // Excludes report/hidden* explicitly, not just by omission - who
      // reported a review and why is an admin-moderation detail, not
      // something the general public (including other tenants) should see
      // on an otherwise-visible review.
      .select("-report -hidden -hiddenBy -hiddenAt")
      .populate("user", "name role")
      .populate("ownerResponse.respondedBy", "name role")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: reviews,
    pagination: formatPagination(page, limit, total),
  });
});

const listMyPropertyReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const filters = {};

  if (req.user.role !== "admin") {
    const properties = await Property.find({ owner: req.user._id }).select("_id");
    filters.property = { $in: properties.map((property) => property._id) };
  }

  const [reviews, total] = await Promise.all([
    Review.find(filters)
      .populate("property", "title owner ratingAverage ratingCount")
      .populate("user", "name role")
      .populate("ownerResponse.respondedBy", "name role")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: reviews,
    pagination: formatPagination(page, limit, total),
  });
});

const createReview = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.body.property);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  if (property.owner.equals(req.user._id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "You cannot review your own property");
  }

  // A completed viewing is the only signal this codebase has that a tenant
  // actually visited the property, not just browsed the listing - the same
  // status promptPostViewingReviews.js's own nudge job already waits for
  // (see its "mark completed, then notify" logic), so this check can never
  // reject someone that job would have prompted.
  const completedViewing = await ViewingRequest.findOne({
    property: req.body.property,
    requester: req.user._id,
    status: "completed",
  });

  if (!completedViewing) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You can only review a property after a completed viewing"
    );
  }

  const existingReview = await Review.findOne({
    property: req.body.property,
    user: req.user._id,
  });

  if (existingReview) {
    throw new ApiError(httpStatus.CONFLICT, "You have already reviewed this property");
  }

  const review = await Review.create({
    property: req.body.property,
    user: req.user._id,
    rating: req.body.rating,
    comment: sanitizeText(req.body.comment),
  });

  await review.populate("user", "name role");
  await review.populate("ownerResponse.respondedBy", "name role");
  await notifyPropertyReviewCreated({ property, review });
  await invalidateNamespace("properties");

  res.status(httpStatus.CREATED).json({
    data: review,
  });
});

const respondToReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id).populate("property", "title owner");

  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, "Review not found");
  }

  if (!review.property.owner.equals(req.user._id)) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized for this review");
  }

  review.ownerResponse = {
    message: sanitizeText(req.body.message),
    respondedBy: req.user._id,
    respondedAt: new Date(),
  };

  await review.save();
  await review.populate("property", "title owner ratingAverage ratingCount");
  await review.populate("user", "name role");
  await review.populate("ownerResponse.respondedBy", "name role");
  await invalidateNamespace("properties");

  res.status(httpStatus.OK).json({
    data: review,
  });
});

// Any signed-in user except the review's own author can flag it - there's no
// role restriction (a tenant, another tenant, or the property owner might all
// have a legitimate reason to report one), matching how the in-app Feedback
// tab is available to every role today.
const reportReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, "Review not found");
  }

  if (review.user.equals(req.user._id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "You cannot report your own review");
  }

  review.report = {
    reason: sanitizeText(req.body.reason),
    reportedBy: req.user._id,
    reportedAt: new Date(),
  };

  await review.save();
  await review.populate("report.reportedBy", "name role");

  res.status(httpStatus.OK).json({
    data: review,
  });
});

// Admin's moderation queue - only reviews with an active, unresolved report.
// A hidden review drops out here even if `report` is still set, since hiding
// is itself the resolution (see hideReview) - re-showing an already-decided
// review would make this look like a growing backlog of nothing.
const listReportedReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const filters = { "report.reportedAt": { $ne: null }, hidden: { $ne: true } };

  const [reviews, total] = await Promise.all([
    Review.find(filters)
      .populate("property", "title owner")
      .populate("user", "name role")
      .populate("report.reportedBy", "name role")
      .sort("-report.reportedAt")
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: reviews,
    pagination: formatPagination(page, limit, total),
  });
});

// Deliberately doesn't delete the review - see the Code of Ethics' "neither
// the owner nor an admin can delete a review" principle. Hiding is the
// closest an admin ever gets to suppressing one, and only after a report was
// actually upheld, not as a routine content-moderation action.
const hideReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, "Review not found");
  }

  review.hidden = true;
  review.hiddenBy = req.user._id;
  review.hiddenAt = new Date();

  await review.save();
  await invalidateNamespace("properties");

  res.status(httpStatus.OK).json({
    data: review,
  });
});

// The review stays fully visible - this is "investigated, report didn't
// hold up," not a lesser version of hiding it.
const dismissReport = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, "Review not found");
  }

  review.report = { reason: null, reportedBy: null, reportedAt: null };

  await review.save();

  res.status(httpStatus.OK).json({
    data: review,
  });
});

export {
  createReview,
  dismissReport,
  hideReview,
  listMyPropertyReviews,
  listPropertyReviews,
  listReportedReviews,
  reportReview,
  respondToReview,
};
