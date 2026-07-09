import httpStatus from "../constants/httpStatus.js";
import { propertyStatuses } from "../models/Property.js";
import ApiError from "./apiError.js";

const earthRadiusKm = 6378.1;

const parseGeoQueryNumber = (value, field) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${field} must be a number`);
  }

  return number;
};

const buildPropertyFilters = (query) => {
  const filters = {
    status: "available",
  };

  if (query.type) {
    filters.type = query.type;
  }

  if (query.listedBy) {
    filters.listedBy = query.listedBy;
  }

  if (query.status) {
    if (!propertyStatuses.includes(query.status)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `status must be one of: ${propertyStatuses.join(", ")}`);
    }

    filters.status = query.status;
  }

  if (query.viewingType) {
    filters.viewingType = query.viewingType;
  }

  if (query.isAvailable !== undefined) {
    filters.isAvailable = query.isAvailable === "true";
  }

  if (query.county) {
    filters["location.county"] = new RegExp(query.county, "i");
  }

  if (query.town) {
    filters["location.town"] = new RegExp(query.town, "i");
  }

  if (query.area) {
    filters["location.area"] = new RegExp(query.area, "i");
  }

  if (query.lat !== undefined || query.lng !== undefined || query.radiusKm !== undefined) {
    if (query.lat === undefined || query.lng === undefined) {
      throw new ApiError(httpStatus.BAD_REQUEST, "lat and lng are required for radius search");
    }

    const latitude = parseGeoQueryNumber(query.lat, "lat");
    const longitude = parseGeoQueryNumber(query.lng, "lng");
    const radiusKm = query.radiusKm === undefined ? 5 : parseGeoQueryNumber(query.radiusKm, "radiusKm");

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

  if (query.minRent || query.maxRent) {
    filters["price.rent"] = {};

    if (query.minRent) {
      const minRent = Number(query.minRent);

      if (!Number.isFinite(minRent)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "minRent must be a number");
      }

      filters["price.rent"].$gte = minRent;
    }

    if (query.maxRent) {
      const maxRent = Number(query.maxRent);

      if (!Number.isFinite(maxRent)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "maxRent must be a number");
      }

      filters["price.rent"].$lte = maxRent;
    }
  }

  if (query.search) {
    filters.$text = { $search: query.search };
  }

  return filters;
};

export { buildPropertyFilters, earthRadiusKm, parseGeoQueryNumber };
