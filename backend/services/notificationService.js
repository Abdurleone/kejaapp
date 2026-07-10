import Notification from "../models/Notification.js";
import { sendPushNotifications } from "./pushNotificationService.js";

const createNotification = async (payload) => {
  const notification = await Notification.create(payload);

  try {
    await sendPushNotifications(payload.user, {
      title: payload.title,
      body: payload.message,
      data: payload.data,
    });
  } catch (error) {
    console.error(`Push notification failed: ${error.message}`);
  }

  return notification;
};

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

const notifyMoverVerificationDecision = (verification) => {
  const approved = verification.status === "approved";

  return createNotification({
    user: verification.user,
    type: "mover",
    title: approved ? "Mover verification approved" : "Mover verification rejected",
    message: approved
      ? "Your mover verification has been approved."
      : verification.rejectionReason || "Your mover verification was rejected.",
    data: {
      moverVerification: verification._id,
      status: verification.status,
    },
  });
};

const notifyMoverRequestCreated = ({ mover, moverRequest }) =>
  createNotification({
    user: mover.user,
    type: "mover_request",
    title: "New moving service request",
    message: `${mover.name} received a new service request.`,
    data: {
      mover: mover._id,
      moverRequest: moverRequest._id,
      status: moverRequest.status,
    },
  });

const notifyMoverRequestStatusChanged = (moverRequest) =>
  createNotification({
    user: moverRequest.tenant._id || moverRequest.tenant,
    type: "mover_request",
    title: "Mover request updated",
    message: `Your mover request was ${moverRequest.status}.`,
    data: {
      mover: moverRequest.mover._id || moverRequest.mover,
      moverRequest: moverRequest._id,
      status: moverRequest.status,
    },
  });

const notifyFeedbackResponded = (feedback) =>
  createNotification({
    user: feedback.submitter._id || feedback.submitter,
    type: "feedback",
    title: "Your feedback received a response",
    message: "An admin responded to your platform feedback.",
    data: {
      feedback: feedback._id,
      status: feedback.status,
    },
  });

const notifyStaleInquiry = (inquiry) =>
  createNotification({
    user: inquiry.owner._id || inquiry.owner,
    type: "inquiry",
    title: "Inquiry awaiting your response",
    message: `A tenant is still waiting on your response to their inquiry about ${inquiry.property.title || "a property"}.`,
    data: {
      property: inquiry.property._id || inquiry.property,
      inquiry: inquiry._id,
    },
  });

const notifyStaleViewingRequest = (viewingRequest) =>
  createNotification({
    user: viewingRequest.owner._id || viewingRequest.owner,
    type: "viewing",
    title: "Viewing request awaiting your response",
    message: `A tenant is still waiting on your response to their viewing request for ${viewingRequest.property.title || "a property"}.`,
    data: {
      property: viewingRequest.property._id || viewingRequest.property,
      viewingRequest: viewingRequest._id,
    },
  });

const notifyUpcomingViewing = (viewingRequest) => {
  const propertyId = viewingRequest.property._id || viewingRequest.property;
  const propertyTitle = viewingRequest.property.title || "a property";
  const when = viewingRequest.requestedDate ? new Date(viewingRequest.requestedDate).toLocaleString() : "soon";

  return Promise.all([
    createNotification({
      user: viewingRequest.requester._id || viewingRequest.requester,
      type: "viewing",
      title: "Upcoming viewing reminder",
      message: `Your viewing for ${propertyTitle} is coming up on ${when}.`,
      data: {
        property: propertyId,
        viewingRequest: viewingRequest._id,
      },
    }),
    createNotification({
      user: viewingRequest.owner._id || viewingRequest.owner,
      type: "viewing",
      title: "Upcoming viewing reminder",
      message: `A viewing for ${propertyTitle} is coming up on ${when}.`,
      data: {
        property: propertyId,
        viewingRequest: viewingRequest._id,
      },
    }),
  ]);
};

const notifyReviewPrompt = (viewingRequest) =>
  createNotification({
    user: viewingRequest.requester._id || viewingRequest.requester,
    type: "review",
    title: "How was your visit?",
    message: `Leave a review for ${viewingRequest.property.title || "the property"} you viewed.`,
    data: {
      property: viewingRequest.property._id || viewingRequest.property,
      viewingRequest: viewingRequest._id,
    },
  });

const notifyStaleListing = (property) =>
  createNotification({
    user: property.owner._id || property.owner,
    type: "property",
    title: "Your listing hasn't had any inquiries yet",
    message: `${property.title} hasn't received any inquiries. Consider refreshing its photos or price.`,
    data: {
      property: property._id,
    },
  });

const notifySavedSearchMatch = ({ savedSearch, property }) =>
  createNotification({
    user: savedSearch.user,
    type: "saved_search",
    title: "New listing matches your saved search",
    message: `${property.title} matches a search you saved.`,
    data: {
      property: property._id,
      savedSearch: savedSearch._id,
    },
  });

const notifyUserStatusChanged = ({ user, status, reason }) => {
  const titles = {
    active: "Account restored",
    suspended: "Account suspended",
    banned: "Account banned",
  };
  const messages = {
    active: "Your account has been restored.",
    suspended: "Your account has been suspended.",
    banned: "Your account has been banned.",
  };

  return createNotification({
    user: user._id || user,
    type: "system",
    title: titles[status],
    message: reason || messages[status],
    data: {
      accountStatus: status,
      reason,
    },
  });
};

export {
  createNotification,
  notifyAgencyVerificationDecision,
  notifyFeedbackResponded,
  notifyMoverRequestCreated,
  notifyMoverRequestStatusChanged,
  notifyMoverVerificationDecision,
  notifyPropertyInquiryCreated,
  notifyPropertyInquiryResponded,
  notifyPropertyReviewCreated,
  notifyReviewPrompt,
  notifySavedSearchMatch,
  notifyStaleInquiry,
  notifyStaleListing,
  notifyStaleViewingRequest,
  notifyUpcomingViewing,
  notifyUserStatusChanged,
  notifyViewingRequestCreated,
  notifyViewingRequestStatusChanged,
};
