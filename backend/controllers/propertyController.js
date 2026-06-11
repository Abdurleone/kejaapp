import httpStatus from "../constants/httpStatus.js";
import Property from "../models/Property.js";
import {
  attachCostSummaries,
  attachCostSummary,
  calculatePropertyCosts,
} from "../services/costService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const buildPropertyFilters = (query) => {
  const filters = {};

  if (query.type) {
    filters.type = query.type;
  }

  if (query.listedBy) {
    filters.listedBy = query.listedBy;
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
  "viewingType",
  "viewingInstructions",
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

  await property.save();
  await property.populate("owner", "name email role phone");

  res.status(httpStatus.CREATED).json({
    data: attachCostSummary(property),
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
  listProperties,
  removePropertyImage,
  updateProperty,
};
