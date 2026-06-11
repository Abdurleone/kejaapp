import httpStatus from "../constants/httpStatus.js";
import Property from "../models/Property.js";
import { propertyStatuses } from "../models/Property.js";
import {
  attachCostSummaries,
  attachCostSummary,
  calculatePropertyCosts,
} from "../services/costService.js";
import { storePropertyImage } from "../services/fileStorageService.js";
import {
  fingerprintPropertyImage,
  removePropertyImageFingerprint,
} from "../services/imageFingerprintService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

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

const formatPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

const propertyFields = [
  "title",
  "description",
  "type",
  "price",
  "location",
  "bedrooms",
  "bathrooms",
  "amenities",
  "images",
  "listedBy",
  "status",
  "viewingType",
  "viewingInstructions",
  "contact",
  "isAvailable",
];

const pickPropertyPayload = (body) =>
  propertyFields.reduce((payload, field) => {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }

    return payload;
  }, {});

const ensurePropertyOwner = (property, user) => {
  const isOwner = property.owner._id
    ? property.owner._id.equals(user._id)
    : property.owner.equals(user._id);

  if (!isOwner && user.role !== "admin") {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to manage this property");
  }
};

const listProperties = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const filters = buildPropertyFilters(req.query);
  const sort = req.query.sort || "-createdAt";

  const [properties, total] = await Promise.all([
    Property.find(filters)
      .populate("owner", "name email role phone")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Property.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: attachCostSummaries(properties),
    pagination: formatPagination(page, limit, total),
  });
});

const listMyProperties = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const filters = {
    owner: req.user._id,
  };
  const sort = req.query.sort || "-createdAt";

  if (req.query.status) {
    if (!propertyStatuses.includes(req.query.status)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `status must be one of: ${propertyStatuses.join(", ")}`);
    }

    filters.status = req.query.status;
  }

  const [properties, total] = await Promise.all([
    Property.find(filters)
      .populate("owner", "name email role phone")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Property.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: attachCostSummaries(properties),
    pagination: formatPagination(page, limit, total),
  });
});

const calculatePropertyCost = asyncHandler(async (req, res) => {
  res.status(httpStatus.OK).json({
    data: {
      costSummary: calculatePropertyCosts(req.body.price),
    },
  });
});

const createProperty = asyncHandler(async (req, res) => {
  const property = await Property.create({
    ...pickPropertyPayload(req.body),
    owner: req.user._id,
    listedBy: req.body.listedBy || (req.user.role === "agency" ? "agency" : "owner"),
  });

  const populatedProperty = await property.populate("owner", "name email role phone");

  res.status(httpStatus.CREATED).json({
    data: attachCostSummary(populatedProperty),
  });
});

const getProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id).populate("owner", "name email role phone");

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  res.status(httpStatus.OK).json({
    data: attachCostSummary(property),
  });
});

const updateProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  ensurePropertyOwner(property, req.user);

  Object.assign(property, pickPropertyPayload(req.body));
  await property.save();
  await property.populate("owner", "name email role phone");

  res.status(httpStatus.OK).json({
    data: attachCostSummary(property),
  });
});

const addPropertyImage = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  ensurePropertyOwner(property, req.user);

  property.images.push({
    url: req.body.url,
    alt: req.body.alt,
  });
  const image = property.images[property.images.length - 1];

  await property.save();
  const imageReview = await fingerprintPropertyImage({
    image,
    property,
    uploadedBy: req.user._id,
  });
  await property.populate("owner", "name email role phone");

  res.status(httpStatus.CREATED).json({
    data: attachCostSummary(property),
    imageReview: {
      status: imageReview.fingerprint.status,
      violation: imageReview.violation?._id || null,
    },
  });
});

const uploadPropertyImage = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  ensurePropertyOwner(property, req.user);

  property.images.push({
    url: "pending-upload",
    alt: req.body.alt,
  });
  const image = property.images[property.images.length - 1];
  const storedImage = await storePropertyImage({
    propertyId: property._id,
    imageId: image._id,
    fileName: req.body.fileName,
    mimeType: req.body.mimeType,
    data: req.body.data,
  });

  Object.assign(image, storedImage);

  await property.save();
  const imageReview = await fingerprintPropertyImage({
    image,
    property,
    uploadedBy: req.user._id,
  });
  await property.populate("owner", "name email role phone");

  res.status(httpStatus.CREATED).json({
    data: attachCostSummary(property),
    imageReview: {
      status: imageReview.fingerprint.status,
      violation: imageReview.violation?._id || null,
    },
  });
});

const removePropertyImage = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  ensurePropertyOwner(property, req.user);

  const image = property.images.id(req.params.imageId);

  if (!image) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property image not found");
  }

  image.deleteOne();
  await removePropertyImageFingerprint({
    imageId: req.params.imageId,
    propertyId: property._id,
  });
  await property.save();
  await property.populate("owner", "name email role phone");

  res.status(httpStatus.OK).json({
    data: attachCostSummary(property),
  });
});

const deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  ensurePropertyOwner(property, req.user);

  await property.deleteOne();

  res.status(httpStatus.OK).json({
    message: "Property deleted",
  });
});

export {
  addPropertyImage,
  calculatePropertyCost,
  createProperty,
  deleteProperty,
  getProperty,
  listMyProperties,
  listProperties,
  removePropertyImage,
  uploadPropertyImage,
  updateProperty,
};
