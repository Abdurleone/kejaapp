import httpStatus from "../constants/httpStatus.js";
import UserViolation from "../models/UserViolation.js";
import { enforceViolationThreshold } from "../services/accountModerationService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const violationFilterFields = ["status", "type", "severity", "user"];

const buildViolationFilters = (query) =>
  violationFilterFields.reduce((filters, field) => {
    if (query[field]) {
      filters[field] = query[field];
    }

    return filters;
  }, {});

const listViolations = asyncHandler(async (req, res) => {
  const violations = await UserViolation.find(buildViolationFilters(req.query))
    .populate("user", "name email role accountStatus")
    .populate("evidence.property", "title")
    .populate("evidence.matchedProperty", "title")
    .populate("reviewedBy", "name email")
    .sort(req.query.sort || "-createdAt");

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

  const moderation = req.body.status === "reviewed"
    ? await enforceViolationThreshold(violation.user)
    : { banned: false };

  res.status(httpStatus.OK).json({
    data: violation,
    moderation,
  });
});

export { listViolations, updateViolationStatus };
