import httpStatus from "../constants/httpStatus.js";
import Property from "../models/Property.js";
import Review from "../models/Review.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const listPropertyReviews = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  const reviews = await Review.find({ property: req.params.id })
    .populate("user", "name role")
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

  res.status(httpStatus.CREATED).json({
    data: review,
  });
});

export { createReview, listPropertyReviews };
