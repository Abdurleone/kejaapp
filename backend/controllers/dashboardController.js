import AgencyVerification from "../models/AgencyVerification.js";
import Favorite from "../models/Favorite.js";
import Feedback, { feedbackStatuses } from "../models/Feedback.js";
import Inquiry from "../models/Inquiry.js";
import MoverRequest, { moverRequestStatuses } from "../models/MoverRequest.js";
import MoverVerification from "../models/MoverVerification.js";
import Notification from "../models/Notification.js";
import Property from "../models/Property.js";
import UserViolation from "../models/UserViolation.js";
import ViewingRequest from "../models/ViewingRequest.js";
import asyncHandler from "../utils/asyncHandler.js";
import httpStatus from "../constants/httpStatus.js";

const countByStatus = async (Model, filters, statuses) => {
  const grouped = await Model.aggregate([
    { $match: filters },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const countsByStatus = Object.fromEntries(grouped.map(({ _id, count }) => [_id, count]));

  return Object.fromEntries(statuses.map((status) => [status, countsByStatus[status] || 0]));
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

  if (["landlord", "agency"].includes(req.user.role)) {
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

  if (req.user.role === "agency") {
    const verification = await AgencyVerification.findOne({ user: userId }).select("status rejectionReason");

    summary.agency = {
      verificationStatus: verification?.status || "not_submitted",
      rejectionReason: verification?.rejectionReason || null,
    };
  }

  if (req.user.role === "mover") {
    const [verification, receivedRequests] = await Promise.all([
      MoverVerification.findOne({ user: userId }).select("status rejectionReason"),
      countByStatus(MoverRequest, { moverAccount: userId }, moverRequestStatuses),
    ]);

    summary.mover = {
      verificationStatus: verification?.status || "not_submitted",
      rejectionReason: verification?.rejectionReason || null,
      receivedRequests,
    };
  }

  if (req.user.role === "admin") {
    const [agencyVerifications, moverVerifications, violations, feedback] = await Promise.all([
      countByStatus(AgencyVerification, {}, ["pending", "approved", "rejected"]),
      countByStatus(MoverVerification, {}, ["pending", "approved", "rejected"]),
      countByStatus(UserViolation, {}, ["open", "reviewed", "dismissed"]),
      countByStatus(Feedback, {}, feedbackStatuses),
    ]);

    summary.admin = { agencyVerifications, moverVerifications, violations, feedback };
  }

  res.status(httpStatus.OK).json({
    data: summary,
  });
});

export { getDashboardSummary };
