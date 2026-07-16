import httpStatus from "../constants/httpStatus.js";
import SavedSearch from "../models/SavedSearch.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const isValidLatitude = (value) => typeof value === "number" && value >= -90 && value <= 90;
const isValidLongitude = (value) => typeof value === "number" && value >= -180 && value <= 180;

const savedSearchFields = ["lat", "lng", "radiusKm", "minRent", "maxRent", "county", "town", "type", "bedrooms"];

const pickSavedSearchPayload = (body) =>
  savedSearchFields.reduce((payload, field) => {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }

    return payload;
  }, {});

const createSavedSearch = asyncHandler(async (req, res) => {
  const payload = pickSavedSearchPayload(req.body);

  if ((payload.lat !== undefined) !== (payload.lng !== undefined)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "lat and lng must be provided together");
  }

  if (payload.lat !== undefined && !isValidLatitude(payload.lat)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "lat must be a number between -90 and 90");
  }

  if (payload.lng !== undefined && !isValidLongitude(payload.lng)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "lng must be a number between -180 and 180");
  }

  if (payload.radiusKm !== undefined && (payload.lat === undefined || payload.lng === undefined)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "radiusKm requires lat and lng to also be provided");
  }

  const savedSearch = await SavedSearch.create({
    ...payload,
    user: req.user._id,
  });

  res.status(httpStatus.CREATED).json({
    data: savedSearch,
  });
});

const listMySavedSearches = asyncHandler(async (req, res) => {
  const savedSearches = await SavedSearch.find({ user: req.user._id }).sort("-createdAt");

  res.status(httpStatus.OK).json({
    data: savedSearches,
  });
});

const deleteSavedSearch = asyncHandler(async (req, res) => {
  const savedSearch = await SavedSearch.findOne({ _id: req.params.id, user: req.user._id });

  if (!savedSearch) {
    throw new ApiError(httpStatus.NOT_FOUND, "Saved search not found");
  }

  await savedSearch.deleteOne();

  res.status(httpStatus.OK).json({
    message: "Saved search deleted",
  });
});

export { createSavedSearch, deleteSavedSearch, listMySavedSearches };
