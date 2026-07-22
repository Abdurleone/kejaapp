import httpStatus from "../constants/httpStatus.js";
import Favorite from "../models/Favorite.js";
import Property from "../models/Property.js";
import {
  attachFavoritePropertyCostSummaries,
  attachFavoritePropertyCostSummary,
} from "../services/costService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { formatPagination, parsePaginationParams } from "../utils/pagination.js";

const populateFavorite = (query) =>
  query.populate({
    path: "property",
    populate: {
      path: "owner",
      select: "name email role phone",
    },
  });

const listFavorites = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const filters = { user: req.user._id };

  const [favorites, total] = await Promise.all([
    populateFavorite(Favorite.find(filters).sort("-createdAt").skip(skip).limit(limit)).lean(),
    Favorite.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: attachFavoritePropertyCostSummaries(favorites),
    pagination: formatPagination(page, limit, total),
  });
});

const saveFavorite = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.propertyId);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  const existingFavorite = await Favorite.findOne({
    user: req.user._id,
    property: property._id,
  });

  if (existingFavorite) {
    throw new ApiError(httpStatus.CONFLICT, "Property is already saved");
  }

  const favorite = await Favorite.create({
    user: req.user._id,
    property: property._id,
  });

  await populateFavorite(favorite);

  res.status(httpStatus.CREATED).json({
    data: attachFavoritePropertyCostSummary(favorite),
  });
});

const removeFavorite = asyncHandler(async (req, res) => {
  await Favorite.findOneAndDelete({
    user: req.user._id,
    property: req.params.propertyId,
  });

  res.status(httpStatus.OK).json({
    message: "Property removed from favorites",
  });
});

export { listFavorites, removeFavorite, saveFavorite };
