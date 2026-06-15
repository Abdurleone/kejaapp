import User from "../models/User.js";
import UserStatusLog from "../models/UserStatusLog.js";
import { notifyUserStatusChanged } from "../services/notificationService.js";

// ... inside updateViolationStatus controller after violation.save()

if (violation.status === "reviewed") {
  // Count how many 'reviewed' (confirmed) violations this user has
  const confirmedCount = await UserViolation.countDocuments({
    user: violation.user,
    status: "reviewed"
  });

  const VIOLATION_THRESHOLD = 4;

  if (confirmedCount >= VIOLATION_THRESHOLD) {
    const userToBan = await User.findById(violation.user);
    
    if (userToBan && userToBan.accountStatus !== "banned") {
      const reason = `Automatic ban: reached ${VIOLATION_THRESHOLD} confirmed violations.`;
      
      userToBan.accountStatus = "banned";
      userToBan.accountStatusReason = reason;
      userToBan.accountStatusUpdatedAt = new Date();
      await userToBan.save();

      // Create an audit log for the automatic ban
      await UserStatusLog.create({
        user: userToBan._id,
        changedBy: req.user._id, // The admin who reviewed the 4th violation
        previousStatus: "active",
        newStatus: "banned",
        reason: reason
      });

      // Send the Push Notification we prepared
      await notifyUserStatusChanged({
        user: userToBan,
        status: "banned",
        reason: reason
      });
    }
  }
}
