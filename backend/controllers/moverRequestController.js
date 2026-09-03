import httpStatus from "../constants/httpStatus.js";
import Mover from "../models/Mover.js";
import MoverRequest from "../models/MoverRequest.js";
import {
  notifyMoverRequestCreated,
  notifyMoverRequestStatusChanged,
} from "../services/notificationService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { calculateMoverPriceEstimate } from "../utils/moverPricing.js";
import { formatPagination, parsePaginationParams } from "../utils/pagination.js";
import { haversineDistanceKm } from "../utils/propertyFilters.js";
import { sanitizeText } from "../utils/sanitizeText.js";
import { assertValidTransition } from "../utils/statusTransitions.js";

const allowedFromByTarget = {
  accepted: ["pending"],
  declined: ["pending"],
  cancelled: ["pending", "accepted"],
  completed: ["accepted"],
};

const populatePaths = [
  { path: "mover", select: "name phone email serviceTypes location basePrice" },
  { path: "property", select: "title location" },
  { path: "tenant", select: "name email phone role" },
  { path: "moverAccount", select: "name email phone role" },
  { path: "respondedBy", select: "name email role" },
];

const populateMoverRequest = (query) => query.populate(populatePaths);

// Attaches a computed pickup-to-dropoff distance for the mover's benefit, rather than
// storing it, so it stays correct if the destination property's location ever changes.
// Left untouched (no `distanceKm` key added) when either point is unavailable, so plain
// mocked objects in tests compare equal without needing a `.toObject()` method.
const attachDistanceKm = (moverRequest) => {
  const plain = typeof moverRequest.toObject === "function" ? moverRequest.toObject() : moverRequest;
  const pickupCoordinates = plain.pickupLocation?.coordinates;
  const dropoffCoordinates = plain.property?.location?.coordinates?.coordinates;

  if (pickupCoordinates?.length === 2 && dropoffCoordinates?.length === 2) {
    return { ...plain, distanceKm: Number(haversineDistanceKm(pickupCoordinates, dropoffCoordinates).toFixed(1)) };
  }

  return plain;
};

// Weighs distance vs. the tenant's home-size selection into a single price
// estimate (see utils/moverPricing.js) - left untouched, same as
// attachDistanceKm above, when either input isn't available yet.
const attachPriceEstimate = (moverRequest) => {
  const priceEstimate = calculateMoverPriceEstimate({
    distanceKm: moverRequest.distanceKm,
    homeSize: moverRequest.homeSize,
    basePrice: moverRequest.mover?.basePrice,
  });

  return priceEstimate === null ? moverRequest : { ...moverRequest, priceEstimate };
};

const createMoverRequest = asyncHandler(async (req, res) => {
  const mover = await Mover.findById(req.body.mover);

  if (!mover) {
    throw new ApiError(httpStatus.NOT_FOUND, "Mover not found");
  }

  if (!mover.user) {
    throw new ApiError(httpStatus.BAD_REQUEST, "This mover does not have an active account yet");
  }

  const hasPickupCoordinates = req.body.pickupLat !== undefined && req.body.pickupLng !== undefined;

  const moverRequest = await MoverRequest.create({
    mover: mover._id,
    moverAccount: mover.user,
    tenant: req.user._id,
    property: req.body.property || null,
    homeSize: req.body.homeSize,
    message: sanitizeText(req.body.message),
    preferredDate: req.body.preferredDate,
    pickupLocation: hasPickupCoordinates
      ? { type: "Point", coordinates: [req.body.pickupLng, req.body.pickupLat] }
      : undefined,
  });

  await populateMoverRequest(moverRequest);
  await notifyMoverRequestCreated({ mover, moverRequest });

  res.status(httpStatus.CREATED).json({
    data: attachPriceEstimate(attachDistanceKm(moverRequest)),
  });
});

const listMyMoverRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const filters = { tenant: req.user._id };

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const [moverRequests, total] = await Promise.all([
    populateMoverRequest(MoverRequest.find(filters).sort("-createdAt").skip(skip).limit(limit)).lean(),
    MoverRequest.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: moverRequests.map((moverRequest) => attachPriceEstimate(attachDistanceKm(moverRequest))),
    pagination: formatPagination(page, limit, total),
  });
});

const listReceivedMoverRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const filters = { moverAccount: req.user._id };

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const [moverRequests, total] = await Promise.all([
    populateMoverRequest(MoverRequest.find(filters).sort("-createdAt").skip(skip).limit(limit)).lean(),
    MoverRequest.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: moverRequests.map((moverRequest) => attachPriceEstimate(attachDistanceKm(moverRequest))),
    pagination: formatPagination(page, limit, total),
  });
});

const updateMoverRequestStatus = asyncHandler(async (req, res) => {
  const moverRequest = await MoverRequest.findById(req.params.id);

  if (!moverRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, "Mover request not found");
  }

  const isTenant = moverRequest.tenant.equals(req.user._id);
  const isMover = moverRequest.moverAccount.equals(req.user._id);

  if (req.body.status === "cancelled") {
    if (!isTenant && !isMover) {
      throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to cancel this mover request");
    }
  } else if (!isMover) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to manage this mover request");
  }

  assertValidTransition(moverRequest.status, req.body.status, allowedFromByTarget);

  moverRequest.status = req.body.status;
  moverRequest.response = sanitizeText(req.body.response);
  moverRequest.respondedBy = req.user._id;
  moverRequest.respondedAt = new Date();

  await moverRequest.save();
  await populateMoverRequest(moverRequest);
  await notifyMoverRequestStatusChanged(moverRequest);

  res.status(httpStatus.OK).json({
    data: attachPriceEstimate(attachDistanceKm(moverRequest)),
  });
});

export {
  createMoverRequest,
  listMyMoverRequests,
  listReceivedMoverRequests,
  updateMoverRequestStatus,
};
