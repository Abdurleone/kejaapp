import httpStatus from "../constants/httpStatus.js";
import Mover from "../models/Mover.js";
import Property from "../models/Property.js";
import { propertyStatuses } from "../models/Property.js";
import {
  attachCostSummaries,
  attachCostSummary,
  calculatePropertyCosts,
} from "../services/costService.js";
import { deletePropertyImage, storePropertyImage } from "../services/fileStorageService.js";
import {
  fingerprintPropertyImage,
  removePropertyImageFingerprint,
} from "../services/imageFingerprintService.js";
import { invalidateNamespace } from "../middlewares/responseCache.js";
import {
  clearPropertyViolationEvidence,
  deletePropertyImages,
  deletePropertyReferences,
} from "../services/propertyCascadeService.js";
import { notifyMatchingSavedSearches } from "../services/savedSearchMatchingService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { buildPropertyFilters, earthRadiusKm, parseGeoQueryNumber } from "../utils/propertyFilters.js";
import { sanitizeText } from "../utils/sanitizeText.js";

const formatPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

// Property.contact (with its own preferredMethod) is the intended
// public-facing way to reach an owner - the unauthenticated list/detail
// endpoints must not leak the owner's actual account email/phone regardless
// of that preference. Authenticated owner-facing endpoints below (an owner
// managing their own listing) keep the fuller projection.
const publicOwnerProjection = "name role verified";
const ownerProjection = "name email role phone verified";

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

// Every free-text field a caller can set on a property, sanitized in one
// place so create/update (both routed through this same picker) can't drift
// out of sync with each other the way two separate hand-written sanitize
// calls eventually would.
const sanitizePropertyPayload = (payload) => {
  if (payload.title !== undefined) {
    payload.title = sanitizeText(payload.title);
  }

  if (payload.description !== undefined) {
    payload.description = sanitizeText(payload.description);
  }

  if (payload.viewingInstructions !== undefined) {
    payload.viewingInstructions = sanitizeText(payload.viewingInstructions);
  }

  if (payload.amenities !== undefined) {
    payload.amenities = payload.amenities.map(sanitizeText);
  }

  if (payload.location !== undefined) {
    payload.location = {
      ...payload.location,
      county: sanitizeText(payload.location.county),
      town: sanitizeText(payload.location.town),
      area: sanitizeText(payload.location.area),
    };
  }

  if (payload.contact !== undefined) {
    payload.contact = {
      ...payload.contact,
      notes: sanitizeText(payload.contact.notes),
      availableHours: sanitizeText(payload.contact.availableHours),
    };
  }

  return payload;
};

const pickPropertyPayload = (body) =>
  sanitizePropertyPayload(
    propertyFields.reduce((payload, field) => {
      if (body[field] !== undefined) {
        payload[field] = body[field];
      }

      return payload;
    }, {})
  );

const ensurePropertyOwner = (property, user) => {
  const isOwner = property.owner._id
    ? property.owner._id.equals(user._id)
    : property.owner.equals(user._id);

  if (!isOwner) {
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
      .populate("owner", publicOwnerProjection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
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
  const filters = { owner: req.user._id };
  const sort = req.query.sort || "-createdAt";

  if (req.query.status) {
    if (!propertyStatuses.includes(req.query.status)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `status must be one of: ${propertyStatuses.join(", ")}`);
    }

    filters.status = req.query.status;
  }

  const [properties, total] = await Promise.all([
    Property.find(filters)
      .populate("owner", ownerProjection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
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

  const populatedProperty = await property.populate("owner", ownerProjection);
  await invalidateNamespace("properties");
  await notifyMatchingSavedSearches(populatedProperty);

  res.status(httpStatus.CREATED).json({
    data: attachCostSummary(populatedProperty),
  });
});

const getProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id).populate("owner", publicOwnerProjection);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  res.status(httpStatus.OK).json({
    data: attachCostSummary(property),
  });
});

const listPropertyMovers = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  const radiusKm =
    req.query.radiusKm === undefined ? 10 : parseGeoQueryNumber(req.query.radiusKm, "radiusKm");

  if (radiusKm <= 0 || radiusKm > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, "radiusKm must be greater than 0 and less than or equal to 100");
  }

  const affiliates = await Mover.find({
    affiliatedOwners: property.owner,
    verified: true,
  }).sort("-ratingAverage name");

  const affiliateIds = affiliates.map((mover) => mover._id);
  const coordinates = property.location?.coordinates?.coordinates;

  let nearby = [];

  if (coordinates?.length === 2) {
    const [longitude, latitude] = coordinates;

    nearby = await Mover.find({
      verified: true,
      _id: { $nin: affiliateIds },
      "location.coordinates": {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusKm / earthRadiusKm],
        },
      },
    }).sort("-ratingAverage name");
  }

  res.status(httpStatus.OK).json({
    data: { affiliates, nearby },
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
  await property.populate("owner", ownerProjection);
  await invalidateNamespace("properties");

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
    alt: sanitizeText(req.body.alt),
  });
  const image = property.images[property.images.length - 1];

  await property.save();
  const imageReview = await fingerprintPropertyImage({
    image,
    property,
    uploadedBy: req.user._id,
  });
  await property.populate("owner", ownerProjection);
  await invalidateNamespace("properties");

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
    alt: sanitizeText(req.body.alt),
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
  await property.populate("owner", ownerProjection);
  await invalidateNamespace("properties");

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

  await deletePropertyImage({ storagePath: image.storagePath });
  image.deleteOne();
  await removePropertyImageFingerprint({
    imageId: req.params.imageId,
    propertyId: property._id,
  });
  await property.save();
  await property.populate("owner", ownerProjection);
  await invalidateNamespace("properties");

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

  // Deleting the property document alone left every one of these dangling:
  // uploaded image files (disk/S3), inquiries, viewing requests, reviews,
  // favorites, image fingerprints, mover requests, and violation-evidence
  // references. deleteCurrentUser cascades the same models for every property
  // a deleted user owns - see services/propertyCascadeService.js for the
  // shared registry both call sites cascade from.
  await Promise.all([
    ...deletePropertyImages([property]),
    ...deletePropertyReferences(property._id),
    ...clearPropertyViolationEvidence([property._id]),
  ]);

  await property.deleteOne();
  await invalidateNamespace("properties");

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
  listPropertyMovers,
  removePropertyImage,
  uploadPropertyImage,
  updateProperty,
};
