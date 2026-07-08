import httpStatus from "../constants/httpStatus.js";
import { invalidateNamespace } from "../middlewares/responseCache.js";
import Feedback from "../models/Feedback.js";
import { notifyFeedbackResponded } from "../services/notificationService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const createFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.create({
    submitter: req.user._id,
    message: req.body.message,
  });

  await feedback.populate("submitter", "name role");

  res.status(httpStatus.CREATED).json({
    data: feedback,
  });
});

const listMyFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.find({ submitter: req.user._id })
    .populate("response.respondedBy", "name role")
    .sort("-createdAt");

  res.status(httpStatus.OK).json({
    data: feedback,
  });
});

const listFeedbackForAdmin = asyncHandler(async (req, res) => {
  const filters = {};

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const feedback = await Feedback.find(filters)
    .populate("submitter", "name role")
    .populate("response.respondedBy", "name role")
    .sort("-createdAt");

  res.status(httpStatus.OK).json({
    data: feedback,
  });
});

const respondToFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    throw new ApiError(httpStatus.NOT_FOUND, "Feedback not found");
  }

  feedback.status = "responded";
  feedback.isPublic = true;
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
