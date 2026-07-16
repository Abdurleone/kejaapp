import httpStatus from "../constants/httpStatus.js";
import { invalidateNamespace } from "../middlewares/responseCache.js";
import Feedback from "../models/Feedback.js";
import { notifyFeedbackResponded } from "../services/notificationService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { formatPagination, parsePaginationParams } from "../utils/pagination.js";

const createFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.create({
    submitter: req.user._id,
    message: req.body.message,
    allowPublicSharing: req.body.allowPublicSharing || false,
  });

  await feedback.populate("submitter", "name role");

  res.status(httpStatus.CREATED).json({
    data: feedback,
  });
});

const listMyFeedback = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const filters = { submitter: req.user._id };

  const [feedback, total] = await Promise.all([
    Feedback.find(filters)
      .populate("response.respondedBy", "name role")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    Feedback.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: feedback,
    pagination: formatPagination(page, limit, total),
  });
});

const listFeedbackForAdmin = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const filters = {};

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const [feedback, total] = await Promise.all([
    Feedback.find(filters)
      .populate("submitter", "name role")
      .populate("response.respondedBy", "name role")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    Feedback.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: feedback,
    pagination: formatPagination(page, limit, total),
  });
});

const respondToFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    throw new ApiError(httpStatus.NOT_FOUND, "Feedback not found");
  }

  feedback.status = "responded";
  feedback.isPublic = feedback.allowPublicSharing;
  feedback.response = {
    message: req.body.message,
    respondedBy: req.user._id,
    respondedAt: new Date(),
  };

  await feedback.save();
  await notifyFeedbackResponded(feedback);
  await feedback.populate("submitter", "name role");
  await feedback.populate("response.respondedBy", "name role");
  await invalidateNamespace("feedbackPublic");

  res.status(httpStatus.OK).json({
    data: feedback,
  });
});

const listPublicFeedback = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const feedback = await Feedback.find({ isPublic: true })
    .populate("submitter", "name role")
    .sort("-response.respondedAt")
    .limit(limit);

  res.status(httpStatus.OK).json({
    data: feedback,
  });
});

export {
  createFeedback,
  listFeedbackForAdmin,
  listMyFeedback,
  listPublicFeedback,
  respondToFeedback,
};
