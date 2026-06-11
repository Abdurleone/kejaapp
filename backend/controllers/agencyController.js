import httpStatus from "../constants/httpStatus.js";
import AgencyVerification from "../models/AgencyVerification.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const submitAgencyVerification = asyncHandler(async (req, res) => {
  if (req.user.role !== "agency" && req.user.role !== "admin") {
    throw new ApiError(httpStatus.FORBIDDEN, "Only agency accounts can request agency verification");
  }

  const verification = await AgencyVerification.findOneAndUpdate(
    { user: req.user._id },
    {
      ...req.body,
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
