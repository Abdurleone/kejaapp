import Notification from "../models/Notification.js";

const createNotification = (payload) => Notification.create(payload);

const notifyAgencyVerificationDecision = (verification) => {
  const approved = verification.status === "approved";

  return createNotification({
    user: verification.user,
    type: "agency",
    title: approved ? "Agency verification approved" : "Agency verification rejected",
    message: approved
      ? "Your agency verification has been approved."
      : verification.rejectionReason || "Your agency verification was rejected.",
    data: {
      agencyVerification: verification._id,
      status: verification.status,
    },
  });
};

const notifyPropertyReviewCreated = ({ property, review }) =>
  createNotification({
    user: property.owner,
    type: "review",
    title: "Your property received a new review",
    message: `${property.title} received a ${review.rating}-star review.`,
    data: {
      property: property._id,
      review: review._id,
      rating: review.rating,
    },
  });

const notifyViewingRequestCreated = ({ property, viewingRequest }) =>
  createNotification({
    user: property.owner,
    type: "viewing",
    title: "New property viewing request",
    message: `${property.title} has a new viewing request.`,
    data: {
      property: property._id,
      viewingRequest: viewingRequest._id,
      requestedDate: viewingRequest.requestedDate,
      status: viewingRequest.status,
    },
  });

const notifyViewingRequestStatusChanged = (viewingRequest) =>
  createNotification({
    user: viewingRequest.requester._id || viewingRequest.requester,
    type: "viewing",
    title: "Viewing request updated",
    message: `Your viewing request was ${viewingRequest.status}.`,
    data: {
      property: viewingRequest.property._id || viewingRequest.property,
      viewingRequest: viewingRequest._id,
      status: viewingRequest.status,
      reason: viewingRequest.decisionReason,
    },
  });

const notifyPropertyInquiryCreated = ({ property, inquiry }) =>
  createNotification({
    user: property.owner,
    type: "inquiry",
    title: "New property inquiry",
    message: `${property.title} received a new inquiry.`,
    data: {
      property: property._id,
      inquiry: inquiry._id,
      contactPreference: inquiry.contactPreference,
      status: inquiry.status,
    },
  });

const notifyPropertyInquiryResponded = (inquiry) =>
  createNotification({
    user: inquiry.sender._id || inquiry.sender,
    type: "inquiry",
    title: "Property inquiry response",
    message: `Your inquiry about ${inquiry.property.title} was responded to.`,
    data: {
      property: inquiry.property._id || inquiry.property,
      inquiry: inquiry._id,
      status: inquiry.status,
    },
  });

export {
  createNotification,
  notifyAgencyVerificationDecision,
  notifyPropertyInquiryCreated,
  notifyPropertyInquiryResponded,
  notifyPropertyReviewCreated,
  notifyViewingRequestCreated,
  notifyViewingRequestStatusChanged,
};
