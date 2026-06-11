import httpStatus from "../constants/httpStatus.js";
import Mover from "../models/Mover.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const serviceTypes = ["local", "long_distance", "packing", "storage", "office", "furniture"];

const formatPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

const parseNumberFilter = (value, field) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${field} must be a number`);
  }

  return number;
};

const buildMoverFilters = (query) => {
  const filters = {};

  if (query.serviceType) {
    if (!serviceTypes.includes(query.serviceType)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `serviceType must be one of: ${serviceTypes.join(", ")}`);
    }

    filters.serviceTypes = query.serviceType;
  }

  if (query.county) {
    filters["location.county"] = new RegExp(query.county, "i");
  }

  if (query.town) {
    filters["location.town"] = new RegExp(query.town, "i");
  }

  if (query.area) {
    filters["location.areasServed"] = new RegExp(query.area, "i");
  }

  if (query.isAvailable !== undefined) {
    filters.isAvailable = query.isAvailable === "true";
  }

  if (query.verified !== undefined) {
    filters.verified = query.verified === "true";
  }

  if (query.minRating) {
    filters.ratingAverage = {
      $gte: parseNumberFilter(query.minRating, "minRating"),
    };
  }

  if (query.maxBasePrice) {
    filters.basePrice = {
      $lte: parseNumberFilter(query.maxBasePrice, "maxBasePrice"),
    };
  }

  if (query.search) {
    filters.$text = { $search: query.search };
  }

  return filters;
};

const listMovers = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const filters = buildMoverFilters(req.query);
  const sort = req.query.sort || "-verified -ratingAverage name";

  const [movers, total] = await Promise.all([
    Mover.find(filters).sort(sort).skip(skip).limit(limit),
    Mover.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: movers,
    pagination: formatPagination(page, limit, total),
  });
});

export { listMovers };
