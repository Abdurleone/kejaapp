import httpStatus from "../constants/httpStatus.js";
import UserViolation from "../models/UserViolation.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const listViolations = asyncHandler(async (req, res) => {
  const filters = {};

  if (req.query.status) {
    filters.status = req.query.status;
  }

  if (req.query.type) {
    filters.type = req.query.type;
  }

  if (req.query.user) {
    filters.user = req.query.user;
  }

  const violations = await UserViolation.find(filters)
    .populate("user", "name email role phone")
    .populate("evidence.property", "title location listedBy status")
    .populate("evidence.matchedProperty", "title location listedBy status")
    .populate("reviewedBy", "name email role")
    .sort("-createdAt");

  res.status(httpStatus.OK).json({
    data: violations,
  });
});

const updateViolationStatus = asyncHandler(async (req, res) => {
  const violation = await UserViolation.findById(req.params.id);

  if (!violation) {
    throw new ApiError(httpStatus.NOT_FOUND, "Violation not found");
  }

  violation.status = req.body.status;
  violation.notes = req.body.notes;
  violation.reviewedBy = req.user._id;
  violation.reviewedAt = new Date();

  await violation.save();
  await violation.populate("user", "name email role phone");
  await violation.populate("evidence.property", "title location listedBy status");
  await violation.populate("evidence.matchedProperty", "title location listedBy status");
  await violation.populate("reviewedBy", "name email role");

  res.status(httpStatus.OK).json({
    data: violation,
  });
});

export { listViolations, updateViolationStatus };
