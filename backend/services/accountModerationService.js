import User from "../models/User.js";
import UserStatusLog from "../models/UserStatusLog.js";
import UserViolation from "../models/UserViolation.js";
import { notifyUserStatusChanged } from "./notificationService.js";

const automaticBanThreshold = 4;
const activeViolationStatuses = ["open", "reviewed"];

const enforceViolationThreshold = async (userId) => {
  const violationCount = await UserViolation.countDocuments({
    user: userId,
    status: { $in: activeViolationStatuses },
  });

  if (violationCount < automaticBanThreshold) {
    return {
      banned: false,
      violationCount,
    };
  }

  const user = await User.findById(userId);

  if (!user || user.accountStatus === "banned") {
    return {
      banned: false,
      violationCount,
    };
  }

  const previousStatus = user.accountStatus || "active";
  const reason = `Account automatically banned after ${violationCount} active violations`;

  user.accountStatus = "banned";
  user.accountStatusReason = reason;
  user.accountStatusUpdatedAt = new Date();
  await user.save();

  await UserStatusLog.create({
    user: user._id,
    changedBy: null,
    previousStatus,
    newStatus: "banned",
    reason,
  });
  await notifyUserStatusChanged({
    user,
    status: "banned",
    reason,
  });

  return {
    banned: true,
    violationCount,
  };
};

export { automaticBanThreshold, enforceViolationThreshold };
