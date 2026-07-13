import httpStatus from "../constants/httpStatus.js";
import Property from "../models/Property.js";
import ViewingRequest from "../models/ViewingRequest.js";
import {
  notifyViewingRequestCreated,
  notifyViewingRequestStatusChanged,
} from "../services/notificationService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { formatPagination, parsePaginationParams } from "../utils/pagination.js";

const activeViewingStatuses = ["pending", "approved"];

const populateViewingRequest = (query) =>
  query
    .populate("property", "title location price listedBy status viewingType viewingInstructions isAvailable")
    .populate("requester", "name email phone role")
    .populate("owner", "name email phone role")
    .populate("reviewedBy", "name email role");

const ensurePropertyManager = (property, user) => {
  const isOwner = property.owner._id
    ? property.owner._id.equals(user._id)
    : property.owner.equals(user._id);

  if (!isOwner) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to manage viewing requests for this property");
  }
};

const createViewingRequest = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.body.property);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  if (property.status !== "available") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Property is not available for viewing requests");
  }

  if (property.owner.equals(req.user._id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "You cannot request a viewing for your own property");
  }

  if (property.viewingType === "scheduled" && !req.body.requestedDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, "requestedDate is required for scheduled viewings");
  }

  const existingActiveRequest = await ViewingRequest.findOne({
    property: property._id,
    requester: req.user._id,
    status: { $in: activeViewingStatuses },
  });

  if (existingActiveRequest) {
    throw new ApiError(httpStatus.CONFLICT, "You already have an active viewing request for this property");
  }

  const viewingRequest = await ViewingRequest.create({
    property: property._id,
    requester: req.user._id,
    owner: property.owner,
    requestedDate: req.body.requestedDate,
    message: req.body.message,
    status: property.viewingType === "open" ? "approved" : "pending",
  });

  await viewingRequest.populate("property", "title location price listedBy status viewingType viewingInstructions isAvailable");
  await viewingRequest.populate("requester", "name email phone role");
  await viewingRequest.populate("owner", "name email phone role");
  await notifyViewingRequestCreated({ property, viewingRequest });

  res.status(httpStatus.CREATED).json({
    data: viewingRequest,
  });
});

const listMyViewingRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const statusFilter = req.query.status ? { status: req.query.status } : {};
  const filters = { requester: req.user._id, ...statusFilter };

  const [viewingRequests, total] = await Promise.all([
    populateViewingRequest(ViewingRequest.find(filters).sort("-createdAt").skip(skip).limit(limit)),
    ViewingRequest.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: viewingRequests,
    pagination: formatPagination(page, limit, total),
  });
});

const listPropertyViewingRequests = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  ensurePropertyManager(property, req.user);

  const { page, limit, skip } = parsePaginationParams(req.query);
  const statusFilter = req.query.status ? { status: req.query.status } : {};
  const filters = { property: property._id, ...statusFilter };

  const [viewingRequests, total] = await Promise.all([
    populateViewingRequest(ViewingRequest.find(filters).sort("-createdAt").skip(skip).limit(limit)),
    ViewingRequest.countDocuments(filters),
  ]);

  res.status(httpStatus.OK).json({
    data: viewingRequests,
    pagination: formatPagination(page, limit, total),
  });
});

const updateViewingRequestStatus = asyncHandler(async (req, res) => {
  const viewingRequest = await ViewingRequest.findById(req.params.id).populate("property");

  if (!viewingRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, "Viewing request not found");
  }

  const requesterId = viewingRequest.requester._id || viewingRequest.requester;
  const isRequester = requesterId.equals(req.user._id);
  const isOwner = viewingRequest.owner.equals(req.user._id);

  if (req.body.status === "cancelled") {
    if (!isRequester && !isOwner) {
      throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to cancel this viewing request");
    }
  } else if (!isOwner) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to manage this viewing request");
  }

  viewingRequest.status = req.body.status;
  viewingRequest.decisionReason = req.body.reason;
  viewingRequest.reviewedBy = req.user._id;
  viewingRequest.reviewedAt = new Date();

  await viewingRequest.save();
  await viewingRequest.populate("property", "title location price listedBy status viewingType viewingInstructions isAvailable");
  await viewingRequest.populate("requester", "name email phone role");
  await viewingRequest.populate("owner", "name email phone role");
  await viewingRequest.populate("reviewedBy", "name email role");
  await notifyViewingRequestStatusChanged(viewingRequest);

  res.status(httpStatus.OK).json({
    data: viewingRequest,
  });
});

export {
  createViewingRequest,
  listMyViewingRequests,
  listPropertyViewingRequests,
  updateViewingRequestStatus,
};
