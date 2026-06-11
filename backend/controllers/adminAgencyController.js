import httpStatus from "../constants/httpStatus.js";
import AgencyVerification from "../models/AgencyVerification.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { notifyAgencyVerificationDecision } from "../services/notificationService.js";

const listAgencyVerifications = asyncHandler(async (req, res) => {
  const filters = {};

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const verifications = await AgencyVerification.find(filters)
    .populate("user", "name email role phone")
    .populate("reviewedBy", "name email role")
    .sort("-createdAt");

  res.status(httpStatus.OK).json({
    data: verifications,
  });
});

const approveAgencyVerification = asyncHandler(async (req, res) => {
  const verification = await AgencyVerification.findById(req.params.id);

  if (!verification) {
    throw new ApiError(httpStatus.NOT_FOUND, "Agency verification not found");
  }

  verification.status = "approved";
  verification.reviewedBy = req.user._id;
  verification.reviewedAt = new Date();
  verification.rejectionReason = undefined;

  await verification.save();
  await notifyAgencyVerificationDecision(verification);
  await verification.populate("user", "name email role phone");
  await verification.populate("reviewedBy", "name email role");

  res.status(httpStatus.OK).json({
    data: verification,
  });
});

const rejectAgencyVerification = asyncHandler(async (req, res) => {
  const verification = await AgencyVerification.findById(req.params.id);

  if (!verification) {
    throw new ApiError(httpStatus.NOT_FOUND, "Agency verification not found");
  }

  verification.status = "rejected";
  verification.reviewedBy = req.user._id;
  verification.reviewedAt = new Date();
  verification.rejectionReason = req.body.reason;

  await verification.save();
  await notifyAgencyVerificationDecision(verification);
  await verification.populate("user", "name email role phone");
  await verification.populate("reviewedBy", "name email role");

  res.status(httpStatus.OK).json({
    data: verification,
  });
});

export {
  approveAgencyVerification,
  listAgencyVerifications,
  rejectAgencyVerification,
};
