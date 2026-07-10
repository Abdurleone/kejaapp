import httpStatus from "../constants/httpStatus.js";
import Mover from "../models/Mover.js";
import MoverRequest from "../models/MoverRequest.js";
import {
  notifyMoverRequestCreated,
  notifyMoverRequestStatusChanged,
} from "../services/notificationService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const populatePaths = [
  { path: "mover", select: "name phone email serviceTypes location basePrice ratingAverage" },
  { path: "property", select: "title location" },
  { path: "tenant", select: "name email phone role" },
  { path: "moverAccount", select: "name email phone role" },
  { path: "respondedBy", select: "name email role" },
];

const populateMoverRequest = (query) => query.populate(populatePaths);

const createMoverRequest = asyncHandler(async (req, res) => {
  const mover = await Mover.findById(req.body.mover);

  if (!mover) {
    throw new ApiError(httpStatus.NOT_FOUND, "Mover not found");
  }

  if (!mover.user) {
    throw new ApiError(httpStatus.BAD_REQUEST, "This mover does not have an active account yet");
  }

  const moverRequest = await MoverRequest.create({
    mover: mover._id,
    moverAccount: mover.user,
    tenant: req.user._id,
    property: req.body.property || null,
    message: req.body.message,
    preferredDate: req.body.preferredDate,
  });

  await populateMoverRequest(moverRequest);
  await notifyMoverRequestCreated({ mover, moverRequest });

  res.status(httpStatus.CREATED).json({
    data: moverRequest,
  });
});

const listMyMoverRequests = asyncHandler(async (req, res) => {
  const statusFilter = req.query.status ? { status: req.query.status } : {};
  const moverRequests = await populateMoverRequest(
    MoverRequest.find({
      tenant: req.user._id,
      ...statusFilter,
    }).sort("-createdAt")
  );

  res.status(httpStatus.OK).json({
    data: moverRequests,
  });
});

const listReceivedMoverRequests = asyncHandler(async (req, res) => {
  const filters = { moverAccount: req.user._id };

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const moverRequests = await populateMoverRequest(MoverRequest.find(filters).sort("-createdAt"));

  res.status(httpStatus.OK).json({
    data: moverRequests,
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

  moverRequest.status = req.body.status;
  moverRequest.response = req.body.response;
  moverRequest.respondedBy = req.user._id;
  moverRequest.respondedAt = new Date();

  await moverRequest.save();
  await populateMoverRequest(moverRequest);
  await notifyMoverRequestStatusChanged(moverRequest);

  res.status(httpStatus.OK).json({
    data: moverRequest,
  });
});

export {
  createMoverRequest,
  listMyMoverRequests,
  listReceivedMoverRequests,
  updateMoverRequestStatus,
};
