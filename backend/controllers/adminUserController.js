import httpStatus from "../constants/httpStatus.js";
import AgencyVerification from "../models/AgencyVerification.js";
import Favorite from "../models/Favorite.js";
import Inquiry from "../models/Inquiry.js";
import Notification from "../models/Notification.js";
import Property from "../models/Property.js";
import User from "../models/User.js";
import UserStatusLog from "../models/UserStatusLog.js";
import UserViolation from "../models/UserViolation.js";
import ViewingRequest from "../models/ViewingRequest.js";
import { notifyUserStatusChanged } from "../services/notificationService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { escapeRegExp } from "../utils/regex.js";

const roles = ["tenant", "landlord", "agency", "admin"];

const formatPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

const countByStatus = async (Model, filters, statuses) => {
  const grouped = await Model.aggregate([
    { $match: filters },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const countsByStatus = Object.fromEntries(grouped.map(({ _id, count }) => [_id, count]));

  return Object.fromEntries(statuses.map((status) => [status, countsByStatus[status] || 0]));
};

const buildUserFilters = (query) => {
  const filters = {};

  if (query.role) {
    if (!roles.includes(query.role)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `role must be one of: ${roles.join(", ")}`);
    }

    filters.role = query.role;
  }

  if (query.search) {
    const escapedSearch = escapeRegExp(query.search);

    filters.$or = [
      { name: new RegExp(escapedSearch, "i") },
      { email: new RegExp(escapedSearch, "i") },
      { phone: new RegExp(escapedSearch, "i") },
    ];
  }

  return filters;
};

const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const filters = buildUserFilters(req.query);
  const sort = req.query.sort || "-createdAt";

  const [users, total] = await Promise.all([
    User.find(filters).select("-password").sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: users,
    pagination: formatPagination(page, limit, total),
  });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  res.status(httpStatus.OK).json({
    data: user,
  });
});

const getUserSummary = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const userId = user._id;
  const [unread, violations] = await Promise.all([
    Notification.countDocuments({ user: userId, readAt: null }),
    countByStatus(UserViolation, { user: userId }, ["open", "reviewed", "dismissed"]),
  ]);
  const summary = {
    role: user.role,
    notifications: { unread },
    violations,
  };

  if (user.role === "tenant") {
    const [savedProperties, inquiries, viewings] = await Promise.all([
      Favorite.countDocuments({ user: userId }),
      countByStatus(Inquiry, { sender: userId }, ["open", "responded", "closed"]),
      countByStatus(ViewingRequest, { requester: userId }, [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "completed",
      ]),
    ]);

    summary.tenant = { savedProperties, inquiries, viewings };
  }

  if (["landlord", "agency"].includes(user.role)) {
    const [properties, incomingInquiries, incomingViewings] = await Promise.all([
      countByStatus(Property, { owner: userId }, ["draft", "available", "taken", "archived"]),
      countByStatus(Inquiry, { owner: userId }, ["open", "responded", "closed"]),
      countByStatus(ViewingRequest, { owner: userId }, [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "completed",
      ]),
    ]);

    summary.owner = { properties, incomingInquiries, incomingViewings };
  }

  if (user.role === "agency") {
    const verification = await AgencyVerification.findOne({ user: userId }).select(
      "status rejectionReason"
    );

    summary.agency = {
      verificationStatus: verification?.status || "not_submitted",
      rejectionReason: verification?.rejectionReason || null,
    };
  }

  res.status(httpStatus.OK).json({
    data: {
      user,
      summary,
    },
  });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user._id.toString() === req.user._id.toString() && req.body.status !== "active") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Admins cannot suspend or ban their own account");
  }

  const previousStatus = user.accountStatus || "active";

  user.accountStatus = req.body.status;
  user.accountStatusReason = req.body.reason || undefined;
  user.accountStatusUpdatedAt = new Date();

  await user.save();
  await UserStatusLog.create({
    user: user._id,
    changedBy: req.user._id,
    previousStatus,
    newStatus: req.body.status,
    reason: req.body.reason,
  });
  await notifyUserStatusChanged({
    user,
    status: req.body.status,
    reason: req.body.reason,
  });

  res.status(httpStatus.OK).json({
    message: "User status updated",
    data: user,
  });
});

const listUserStatusHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("_id");

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const history = await UserStatusLog.find({ user: user._id })
    .populate("changedBy", "name email role")
    .sort("-createdAt")
    .limit(100)
    .lean();

  res.status(httpStatus.OK).json({
    data: history,
  });
});

export { getUser, getUserSummary, listUserStatusHistory, listUsers, updateUserStatus };
