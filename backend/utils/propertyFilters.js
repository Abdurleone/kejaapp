import httpStatus from "../constants/httpStatus.js";
import {
  propertyListedByOptions,
  propertyTypes,
  propertyViewingTypes,
} from "../models/Property.js";
import ApiError from "./apiError.js";
import { escapeRegExpQueryParam } from "./regex.js";

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
    if (!propertyTypes.includes(query.type)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `type must be one of: ${propertyTypes.join(", ")}`);
    }

    filters.type = query.type;
  }

  if (query.listedBy) {
    if (!propertyListedByOptions.includes(query.listedBy)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `listedBy must be one of: ${propertyListedByOptions.join(", ")}`
      );
    }

    filters.listedBy = query.listedBy;
  }

  if (query.viewingType) {
    if (!propertyViewingTypes.includes(query.viewingType)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `viewingType must be one of: ${propertyViewingTypes.join(", ")}`
      );
    }

    filters.viewingType = query.viewingType;
  }

  if (query.isAvailable !== undefined) {
    filters.isAvailable = query.isAvailable === "true";
  }

  if (query.county) {
    filters["location.county"] = new RegExp(escapeRegExpQueryParam(query.county, "county"), "i");
  }

  if (query.town) {
    filters["location.town"] = new RegExp(escapeRegExpQueryParam(query.town, "town"), "i");
  }

  if (query.area) {
    filters["location.area"] = new RegExp(escapeRegExpQueryParam(query.area, "area"), "i");
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

  if (query.bedrooms) {
    const bedrooms = Number(query.bedrooms);

    if (!Number.isFinite(bedrooms) || bedrooms < 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "bedrooms must be a non-negative number");
    }

    // "N+ bedrooms", not an exact match - matches how saved searches already
    // describe this filter to the user (e.g. "2+ bed").
    filters.bedrooms = { $gte: bedrooms };
  }

  if (query.search) {
    filters.$text = { $search: query.search };
  }

  return filters;
};

const haversineDistanceKm = ([lng1, lat1], [lng2, lat2]) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
};

export { buildPropertyFilters, earthRadiusKm, haversineDistanceKm, parseGeoQueryNumber };
