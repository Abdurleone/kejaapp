import httpStatus from "../constants/httpStatus.js";
import { roles } from "../constants/rbac.js";
import Mover from "../models/Mover.js";
import { invalidateNamespace } from "../middlewares/responseCache.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { earthRadiusKm, parseGeoQueryNumber } from "../utils/propertyFilters.js";
import { escapeRegExpQueryParam } from "../utils/regex.js";
import { sanitizeText } from "../utils/sanitizeText.js";

const serviceTypes = ["local", "long_distance", "packing", "storage", "office", "furniture"];

const moverProfileFields = ["name", "phone", "email", "serviceTypes", "location", "basePrice", "isAvailable"];

const sanitizeMoverProfilePayload = (payload) => {
  if (payload.name !== undefined) {
    payload.name = sanitizeText(payload.name);
  }

  if (payload.location !== undefined) {
    payload.location = {
      ...payload.location,
      county: sanitizeText(payload.location.county),
      town: sanitizeText(payload.location.town),
      areasServed: payload.location.areasServed?.map(sanitizeText),
    };
  }

  return payload;
};

const pickMoverProfilePayload = (body) =>
  sanitizeMoverProfilePayload(
    moverProfileFields.reduce((payload, field) => {
      if (body[field] !== undefined) {
        payload[field] = body[field];
      }

      return payload;
    }, {})
  );

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
    filters["location.county"] = new RegExp(escapeRegExpQueryParam(query.county, "county"), "i");
  }

  if (query.town) {
    filters["location.town"] = new RegExp(escapeRegExpQueryParam(query.town, "town"), "i");
  }

  if (query.area) {
    filters["location.areasServed"] = new RegExp(escapeRegExpQueryParam(query.area, "area"), "i");
  }

  if (query.isAvailable !== undefined) {
    filters.isAvailable = query.isAvailable === "true";
  }

  if (query.verified !== undefined) {
    filters.verified = query.verified === "true";
  }

  if (query.maxBasePrice) {
    filters.basePrice = {
      $lte: parseNumberFilter(query.maxBasePrice, "maxBasePrice"),
    };
  }

  if (query.search) {
    filters.$text = { $search: query.search };
  }

  if (query.lat !== undefined || query.lng !== undefined || query.radiusKm !== undefined) {
    if (query.lat === undefined || query.lng === undefined) {
      throw new ApiError(httpStatus.BAD_REQUEST, "lat and lng are required for radius search");
    }

    const latitude = parseGeoQueryNumber(query.lat, "lat");
    const longitude = parseGeoQueryNumber(query.lng, "lng");
    const radiusKm = query.radiusKm === undefined ? 10 : parseGeoQueryNumber(query.radiusKm, "radiusKm");

    if (latitude < -90 || latitude > 90) {
      throw new ApiError(httpStatus.BAD_REQUEST, "lat must be between -90 and 90");
    }

    if (longitude < -180 || longitude > 180) {
      throw new ApiError(httpStatus.BAD_REQUEST, "lng must be between -180 and 180");
    }

    if (radiusKm <= 0 || radiusKm > 100) {
      throw new ApiError(httpStatus.BAD_REQUEST, "radiusKm must be greater than 0 and less than or equal to 100");
    }

    filters["location.coordinates"] = {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], radiusKm / earthRadiusKm],
      },
    };
  }

  return filters;
};

const listMovers = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const filters = buildMoverFilters(req.query);
  const sort = req.query.sort || "-verified name";

  const [movers, total] = await Promise.all([
    Mover.find(filters).sort(sort).skip(skip).limit(limit),
    Mover.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: movers,
    pagination: formatPagination(page, limit, total),
  });
});

const getMover = asyncHandler(async (req, res) => {
  const mover = await Mover.findById(req.params.id);

  if (!mover) {
    throw new ApiError(httpStatus.NOT_FOUND, "Mover not found");
  }

  res.status(httpStatus.OK).json({
    data: mover,
  });
});

const submitMoverProfile = asyncHandler(async (req, res) => {
  if (req.user.role !== roles.mover) {
    throw new ApiError(httpStatus.FORBIDDEN, "Only mover accounts can manage a mover profile");
  }

  const mover = await Mover.findOneAndUpdate(
    { user: req.user._id },
    {
      ...pickMoverProfilePayload(req.body),
      user: req.user._id,
    },
    {
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    }
  );

  await invalidateNamespace("movers");

  res.status(httpStatus.OK).json({
    data: mover,
  });
});

const getMoverProfile = asyncHandler(async (req, res) => {
  const mover = await Mover.findOne({ user: req.user._id });

  if (!mover) {
    res.status(httpStatus.OK).json({
      data: { status: "not_submitted" },
    });
    return;
  }

  res.status(httpStatus.OK).json({
    data: mover,
  });
});

const affiliateMover = asyncHandler(async (req, res) => {
  const mover = await Mover.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { affiliatedOwners: req.user._id } },
    { new: true }
  );

  if (!mover) {
    throw new ApiError(httpStatus.NOT_FOUND, "Mover not found");
  }

  await invalidateNamespace("movers");

  res.status(httpStatus.OK).json({
    data: mover,
  });
});

const unaffiliateMover = asyncHandler(async (req, res) => {
  const mover = await Mover.findByIdAndUpdate(
    req.params.id,
    { $pull: { affiliatedOwners: req.user._id } },
    { new: true }
  );

  if (!mover) {
    throw new ApiError(httpStatus.NOT_FOUND, "Mover not found");
  }

  await invalidateNamespace("movers");

  res.status(httpStatus.OK).json({
    data: mover,
  });
});

export {
  affiliateMover,
  getMover,
  getMoverProfile,
  listMovers,
  submitMoverProfile,
  unaffiliateMover,
};
