import httpStatus from "../constants/httpStatus.js";
import Notification from "../models/Notification.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const listNotifications = asyncHandler(async (req, res) => {
  const filters = {
    user: req.user._id,
  };

  if (req.query.unread === "true") {
    filters.readAt = null;
  }

  const notifications = await Notification.find(filters).sort("-createdAt").limit(100);

  res.status(httpStatus.OK).json({
    data: notifications,
  });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, "Notification not found");
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  res.status(httpStatus.OK).json({
    data: notification,
  });
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, readAt: null }, { readAt: new Date() });

  res.status(httpStatus.OK).json({
    data: { unread: 0 },
  });
});

export { listNotifications, markAllNotificationsRead, markNotificationRead };
