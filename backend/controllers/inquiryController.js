import httpStatus from "../constants/httpStatus.js";
import Inquiry from "../models/Inquiry.js";
import Property from "../models/Property.js";
import {
  notifyPropertyInquiryCreated,
  notifyPropertyInquiryResponded,
} from "../services/notificationService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const populateInquiry = (query) =>
  query
    .populate("property", "title location price listedBy")
    .populate("sender", "name email phone role")
    .populate("owner", "name email phone role")
    .populate("respondedBy", "name email role");

const ensureInquiryManager = (inquiry, user) => {
  const isOwner = inquiry.owner._id
    ? inquiry.owner._id.equals(user._id)
    : inquiry.owner.equals(user._id);

  if (!isOwner && user.role !== "admin") {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to manage this inquiry");
  }
};

const createInquiry = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.body.property);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  if (property.owner.equals(req.user._id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "You cannot inquire about your own property");
  }

  const inquiry = await Inquiry.create({
    property: property._id,
    sender: req.user._id,
    owner: property.owner,
    subject: req.body.subject,
    message: req.body.message,
    contactPreference: req.body.contactPreference || "in_app",
  });

  await inquiry.populate("property", "title location price listedBy");
  await inquiry.populate("sender", "name email phone role");
  await inquiry.populate("owner", "name email phone role");
  await notifyPropertyInquiryCreated({ property, inquiry });

  res.status(httpStatus.CREATED).json({
    data: inquiry,
  });
});

const listMyInquiries = asyncHandler(async (req, res) => {
  const statusFilter = req.query.status ? { status: req.query.status } : {};
  const inquiries = await populateInquiry(
    Inquiry.find({
      sender: req.user._id,
      ...statusFilter,
    }).sort("-createdAt")
  );

  res.status(httpStatus.OK).json({
    data: inquiries,
  });
});

const listReceivedInquiries = asyncHandler(async (req, res) => {
  const filters = req.user.role === "admin" ? {} : { owner: req.user._id };

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const inquiries = await populateInquiry(Inquiry.find(filters).sort("-createdAt"));

  res.status(httpStatus.OK).json({
    data: inquiries,
  });
});

const listPropertyInquiries = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  const isOwner = property.owner.equals(req.user._id);

  if (!isOwner && req.user.role !== "admin") {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to view inquiries for this property");
  }

  const statusFilter = req.query.status ? { status: req.query.status } : {};
  const inquiries = await populateInquiry(
    Inquiry.find({
      property: property._id,
      ...statusFilter,
    }).sort("-createdAt")
  );

  res.status(httpStatus.OK).json({
    data: inquiries,
  });
});

const updateInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id).populate("property");

  if (!inquiry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Inquiry not found");
  }

  ensureInquiryManager(inquiry, req.user);

  inquiry.status = req.body.status;
  inquiry.response = req.body.response;
  inquiry.respondedBy = req.user._id;
  inquiry.respondedAt = new Date();

  await inquiry.save();
  await inquiry.populate("property", "title location price listedBy");
  await inquiry.populate("sender", "name email phone role");
  await inquiry.populate("owner", "name email phone role");
  await inquiry.populate("respondedBy", "name email role");

  if (inquiry.status === "responded") {
    await notifyPropertyInquiryResponded(inquiry);
  }

  res.status(httpStatus.OK).json({
    data: inquiry,
  });
});

export {
  createInquiry,
  listMyInquiries,
  listPropertyInquiries,
  listReceivedInquiries,
  updateInquiry,
};
