import AgencyVerification from "../models/AgencyVerification.js";
import Favorite from "../models/Favorite.js";
import Inquiry from "../models/Inquiry.js";
import Notification from "../models/Notification.js";
import Property from "../models/Property.js";
import UserViolation from "../models/UserViolation.js";
import ViewingRequest from "../models/ViewingRequest.js";
import asyncHandler from "../utils/asyncHandler.js";
import httpStatus from "../constants/httpStatus.js";

const countByStatus = async (Model, filters, statuses) => {
  const counts = await Promise.all(
    statuses.map(async (status) => [status, await Model.countDocuments({ ...filters, status })])
  );

  return Object.fromEntries(counts);
};

const getDashboardSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const summary = {
    role: req.user.role,
    notifications: {
      unread: await Notification.countDocuments({ user: userId, readAt: null }),
    },
  };

  if (req.user.role === "tenant") {
    summary.tenant = {
      savedProperties: await Favorite.countDocuments({ user: userId }),
      inquiries: await countByStatus(Inquiry, { sender: userId }, ["open", "responded", "closed"]),
      viewings: await countByStatus(ViewingRequest, { requester: userId }, [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "completed",
      ]),
    };
  }

  if (["landlord", "agency"].includes(req.user.role)) {
    summary.owner = {
      properties: await countByStatus(Property, { owner: userId }, [
        "draft",
        "available",
        "taken",
        "archived",
      ]),
      incomingInquiries: await countByStatus(Inquiry, { owner: userId }, [
        "open",
        "responded",
        "closed",
      ]),
      incomingViewings: await countByStatus(ViewingRequest, { owner: userId }, [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "completed",
      ]),
    };
  }

  if (req.user.role === "agency") {
    const verification = await AgencyVerification.findOne({ user: userId }).select("status rejectionReason");

    summary.agency = {
      verificationStatus: verification?.status || "not_submitted",
      rejectionReason: verification?.rejectionReason || null,
    };
  }

  if (req.user.role === "admin") {
    summary.admin = {
      agencyVerifications: await countByStatus(AgencyVerification, {}, [
        "pending",
        "approved",
        "rejected",
      ]),
      violations: await countByStatus(UserViolation, {}, ["open", "reviewed", "dismissed"]),
    };
  }

  res.status(httpStatus.OK).json({
    data: summary,
  });
});

export { getDashboardSummary };
