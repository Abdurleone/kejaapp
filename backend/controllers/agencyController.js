import httpStatus from "../constants/httpStatus.js";
import { roles } from "../constants/rbac.js";
import AgencyVerification from "../models/AgencyVerification.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sanitizeText } from "../utils/sanitizeText.js";

const submitAgencyVerification = asyncHandler(async (req, res) => {
  if (req.user.role !== roles.agency) {
    throw new ApiError(httpStatus.FORBIDDEN, "Only agency accounts can request agency verification");
  }

  const existingVerification = await AgencyVerification.findOne({ user: req.user._id });

  if (existingVerification && ["pending", "approved"].includes(existingVerification.status)) {
    throw new ApiError(httpStatus.CONFLICT, "Agency verification request is already active");
  }

  const verification = await AgencyVerification.findOneAndUpdate(
    { user: req.user._id },
    {
      ...req.body,
      agencyName: sanitizeText(req.body.agencyName),
      registrationNumber: sanitizeText(req.body.registrationNumber),
      officeAddress: sanitizeText(req.body.officeAddress),
      user: req.user._id,
      status: "pending",
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: undefined,
    },
    {
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    }
  );

  res.status(httpStatus.OK).json({
    data: verification,
  });
});

const getAgencyStatus = asyncHandler(async (req, res) => {
  const verification = await AgencyVerification.findOne({ user: req.user._id });

  if (!verification) {
    res.status(httpStatus.OK).json({
      data: {
        status: "not_submitted",
      },
    });
    return;
  }

  res.status(httpStatus.OK).json({
    data: verification,
  });
});

export { getAgencyStatus, submitAgencyVerification };
