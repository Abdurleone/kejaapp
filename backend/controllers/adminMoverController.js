import httpStatus from "../constants/httpStatus.js";
import Mover from "../models/Mover.js";
import MoverVerification from "../models/MoverVerification.js";
import { invalidateNamespace } from "../middlewares/responseCache.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { notifyMoverVerificationDecision } from "../services/notificationService.js";

const listMoverVerifications = asyncHandler(async (req, res) => {
  const filters = {};

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const verifications = await MoverVerification.find(filters)
    .populate("user", "name email role phone")
    .populate("reviewedBy", "name email role")
    .sort("-createdAt");

  res.status(httpStatus.OK).json({
    data: verifications,
  });
});

const approveMoverVerification = asyncHandler(async (req, res) => {
  const verification = await MoverVerification.findById(req.params.id);

  if (!verification) {
    throw new ApiError(httpStatus.NOT_FOUND, "Mover verification not found");
  }

  verification.status = "approved";
  verification.reviewedBy = req.user._id;
  verification.reviewedAt = new Date();
  verification.rejectionReason = undefined;

  await verification.save();
  await Mover.findOneAndUpdate({ user: verification.user }, { verified: true });
  await invalidateNamespace("movers");
  await notifyMoverVerificationDecision(verification);
  await verification.populate("user", "name email role phone");
  await verification.populate("reviewedBy", "name email role");

  res.status(httpStatus.OK).json({
    data: verification,
  });
});

const rejectMoverVerification = asyncHandler(async (req, res) => {
  const verification = await MoverVerification.findById(req.params.id);

  if (!verification) {
    throw new ApiError(httpStatus.NOT_FOUND, "Mover verification not found");
  }

  verification.status = "rejected";
  verification.reviewedBy = req.user._id;
  verification.reviewedAt = new Date();
  verification.rejectionReason = req.body.reason;

  await verification.save();
  await Mover.findOneAndUpdate({ user: verification.user }, { verified: false });
  await invalidateNamespace("movers");
  await notifyMoverVerificationDecision(verification);
  await verification.populate("user", "name email role phone");
  await verification.populate("reviewedBy", "name email role");

  res.status(httpStatus.OK).json({
    data: verification,
  });
});

export {
  approveMoverVerification,
  listMoverVerifications,
  rejectMoverVerification,
};
