import httpStatus from "../constants/httpStatus.js";
import { invalidateNamespace } from "../middlewares/responseCache.js";
import Property from "../models/Property.js";
import Review from "../models/Review.js";
import { notifyPropertyReviewCreated } from "../services/notificationService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const listPropertyReviews = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  const reviews = await Review.find({ property: req.params.id })
    .populate("user", "name role")
    .populate("ownerResponse.respondedBy", "name role")
    .sort("-createdAt");

  res.status(httpStatus.OK).json({
    data: reviews,
  });
});

const listMyPropertyReviews = asyncHandler(async (req, res) => {
  const filters = {};

  if (req.user.role !== "admin") {
    const properties = await Property.find({ owner: req.user._id }).select("_id");
    filters.property = { $in: properties.map((property) => property._id) };
  }

  const reviews = await Review.find(filters)
    .populate("property", "title owner ratingAverage ratingCount")
    .populate("user", "name role")
    .populate("ownerResponse.respondedBy", "name role")
    .sort("-createdAt");

  res.status(httpStatus.OK).json({
    data: reviews,
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
    comment: req.body.comment,
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
    message: req.body.message,
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

export { createReview, listMyPropertyReviews, listPropertyReviews, respondToReview };
