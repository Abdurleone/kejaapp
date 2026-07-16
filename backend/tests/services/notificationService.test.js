import assert from "node:assert/strict";
import mongoose from "mongoose";
import { Expo } from "expo-server-sdk";
import { describe, it, mock } from "../helpers/nodeTestCompat.js";
import DeviceToken from "../../models/DeviceToken.js";
import Notification from "../../models/Notification.js";
import {
  notifyAgencyVerificationDecision,
  notifyFeedbackResponded,
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
} from "../../services/notificationService.js";

describe("notificationService", () => {
  // Every notify* helper funnels through createNotification, which best-effort
  // looks up the recipient's device tokens to send a push notification -
  // mock this once so none of the tests below need a real DB connection.
  mock.method(DeviceToken, "find", async () => []);

  it("creates an approval notification for agency verification", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const verification = {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      status: "approved",
    };

    const notification = await notifyAgencyVerificationDecision(verification);

    assert.equal(create.mock.callCount(), 1);
    assert.equal(notification.type, "agency");
    assert.equal(notification.title, "Agency verification approved");
    assert.equal(notification.data.status, "approved");
    create.mock.restore();
  });

  it("creates a rejection notification with the rejection reason", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const verification = {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      status: "rejected",
      rejectionReason: "Documents were unclear",
    };

    const notification = await notifyAgencyVerificationDecision(verification);

    assert.equal(create.mock.callCount(), 1);
    assert.equal(notification.type, "agency");
    assert.equal(notification.title, "Agency verification rejected");
    assert.equal(notification.message, "Documents were unclear");
    assert.equal(notification.data.status, "rejected");
    create.mock.restore();
  });

  it("creates a notification for a new property review", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const property = {
      _id: new mongoose.Types.ObjectId(),
      owner: new mongoose.Types.ObjectId(),
      title: "Modern Kilimani Apartment",
    };
    const review = {
      _id: new mongoose.Types.ObjectId(),
      rating: 5,
    };

    const notification = await notifyPropertyReviewCreated({ property, review });

    assert.equal(create.mock.callCount(), 1);
    assert.equal(notification.user, property.owner);
    assert.equal(notification.type, "review");
    assert.equal(notification.title, "Your property received a new review");
    assert.equal(notification.data.property, property._id);
    assert.equal(notification.data.review, review._id);
    assert.equal(notification.data.rating, 5);
    create.mock.restore();
  });

  it("creates a notification for a new viewing request", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const property = {
      _id: new mongoose.Types.ObjectId(),
      owner: new mongoose.Types.ObjectId(),
      title: "Modern Kilimani Apartment",
    };
    const viewingRequest = {
      _id: new mongoose.Types.ObjectId(),
      requestedDate: new Date("2026-07-01T10:00:00.000Z"),
      status: "pending",
    };

    const notification = await notifyViewingRequestCreated({ property, viewingRequest });

    assert.equal(create.mock.callCount(), 1);
    assert.equal(notification.user, property.owner);
    assert.equal(notification.type, "viewing");
    assert.equal(notification.title, "New property viewing request");
    assert.equal(notification.data.property, property._id);
    assert.equal(notification.data.viewingRequest, viewingRequest._id);
    assert.equal(notification.data.status, "pending");
    create.mock.restore();
  });

  it("creates a notification when a viewing request status changes", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const propertyId = new mongoose.Types.ObjectId();
    const viewingRequest = {
      _id: new mongoose.Types.ObjectId(),
      property: {
        _id: propertyId,
      },
      requester: new mongoose.Types.ObjectId(),
      status: "approved",
      decisionReason: "See you at 10 AM",
    };

    const notification = await notifyViewingRequestStatusChanged(viewingRequest);

    assert.equal(create.mock.callCount(), 1);
    assert.equal(notification.user, viewingRequest.requester);
    assert.equal(notification.type, "viewing");
    assert.equal(notification.title, "Viewing request updated");
    assert.equal(notification.data.property, propertyId);
    assert.equal(notification.data.status, "approved");
    assert.equal(notification.data.reason, "See you at 10 AM");
    create.mock.restore();
  });

  it("creates a notification for a new property inquiry", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const property = {
      _id: new mongoose.Types.ObjectId(),
      owner: new mongoose.Types.ObjectId(),
      title: "Modern Kilimani Apartment",
    };
    const inquiry = {
      _id: new mongoose.Types.ObjectId(),
      contactPreference: "phone",
      status: "open",
    };

    const notification = await notifyPropertyInquiryCreated({ property, inquiry });

    assert.equal(create.mock.callCount(), 1);
    assert.equal(notification.user, property.owner);
    assert.equal(notification.type, "inquiry");
    assert.equal(notification.title, "New property inquiry");
    assert.equal(notification.data.property, property._id);
    assert.equal(notification.data.inquiry, inquiry._id);
    assert.equal(notification.data.contactPreference, "phone");
    create.mock.restore();
  });

  it("creates a notification when a property inquiry is responded to", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const propertyId = new mongoose.Types.ObjectId();
    const inquiry = {
      _id: new mongoose.Types.ObjectId(),
      property: {
        _id: propertyId,
        title: "Modern Kilimani Apartment",
      },
      sender: new mongoose.Types.ObjectId(),
      status: "responded",
    };

    const notification = await notifyPropertyInquiryResponded(inquiry);

    assert.equal(create.mock.callCount(), 1);
    assert.equal(notification.user, inquiry.sender);
    assert.equal(notification.type, "inquiry");
    assert.equal(notification.title, "Property inquiry response");
    assert.equal(notification.data.property, propertyId);
    assert.equal(notification.data.status, "responded");
    create.mock.restore();
  });

  it("creates a notification when an account status changes", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const user = {
      _id: new mongoose.Types.ObjectId(),
    };

    const notification = await notifyUserStatusChanged({
      user,
      status: "suspended",
      reason: "Repeated duplicate listing uploads",
    });

    assert.equal(create.mock.callCount(), 1);
    assert.equal(notification.user, user._id);
    assert.equal(notification.type, "system");
    assert.equal(notification.title, "Account suspended");
    assert.equal(notification.message, "Repeated duplicate listing uploads");
    assert.equal(notification.data.accountStatus, "suspended");
    create.mock.restore();
  });

  it("creates a notification when feedback receives an admin response", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const feedback = {
      _id: new mongoose.Types.ObjectId(),
      submitter: new mongoose.Types.ObjectId(),
      status: "responded",
    };

    const notification = await notifyFeedbackResponded(feedback);

    assert.equal(create.mock.callCount(), 1);
    assert.equal(notification.user, feedback.submitter);
    assert.equal(notification.type, "feedback");
    assert.equal(notification.data.feedback, feedback._id);
    assert.equal(notification.data.status, "responded");
    create.mock.restore();
  });

  it("creates a notification when a new listing matches a saved search", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const savedSearch = {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
    };
    const property = {
      _id: new mongoose.Types.ObjectId(),
      title: "Modern Kilimani Apartment",
    };

    const notification = await notifySavedSearchMatch({ savedSearch, property });

    assert.equal(create.mock.callCount(), 1);
    assert.equal(notification.user, savedSearch.user);
    assert.equal(notification.type, "saved_search");
    assert.equal(notification.data.property, property._id);
    assert.equal(notification.data.savedSearch, savedSearch._id);
    create.mock.restore();
  });

  it("creates a notification nudging the owner about a stale inquiry", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const ownerId = new mongoose.Types.ObjectId();
    const propertyId = new mongoose.Types.ObjectId();
    const inquiry = {
      _id: new mongoose.Types.ObjectId(),
      owner: ownerId,
      property: { _id: propertyId, title: "Modern Kilimani Apartment" },
    };

    const notification = await notifyStaleInquiry(inquiry);

    assert.equal(create.mock.callCount(), 1);
    assert.equal(notification.user, ownerId);
    assert.equal(notification.type, "inquiry");
    assert.match(notification.message, /Modern Kilimani Apartment/);
    assert.equal(notification.data.property, propertyId);
    assert.equal(notification.data.inquiry, inquiry._id);
    create.mock.restore();
  });

  it("creates a notification nudging the owner about a stale viewing request", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const ownerId = new mongoose.Types.ObjectId();
    const propertyId = new mongoose.Types.ObjectId();
    const viewingRequest = {
      _id: new mongoose.Types.ObjectId(),
      owner: ownerId,
      property: { _id: propertyId, title: "Modern Kilimani Apartment" },
    };

    const notification = await notifyStaleViewingRequest(viewingRequest);

    assert.equal(create.mock.callCount(), 1);
    assert.equal(notification.user, ownerId);
    assert.equal(notification.type, "viewing");
    assert.match(notification.message, /Modern Kilimani Apartment/);
    assert.equal(notification.data.property, propertyId);
    assert.equal(notification.data.viewingRequest, viewingRequest._id);
    create.mock.restore();
  });

  it("creates reminder notifications for both sides of an upcoming viewing", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const requesterId = new mongoose.Types.ObjectId();
    const ownerId = new mongoose.Types.ObjectId();
    const propertyId = new mongoose.Types.ObjectId();
    const viewingRequest = {
      _id: new mongoose.Types.ObjectId(),
      requester: requesterId,
      owner: ownerId,
      property: { _id: propertyId, title: "Modern Kilimani Apartment" },
      requestedDate: new Date("2026-07-10T10:00:00.000Z"),
    };

    const [tenantNotification, ownerNotification] = await notifyUpcomingViewing(viewingRequest);

    assert.equal(create.mock.callCount(), 2);
    assert.equal(tenantNotification.user, requesterId);
    assert.equal(ownerNotification.user, ownerId);
    assert.equal(tenantNotification.type, "viewing");
    assert.equal(ownerNotification.type, "viewing");
    assert.match(tenantNotification.message, /Modern Kilimani Apartment/);
    assert.equal(tenantNotification.data.viewingRequest, viewingRequest._id);
    assert.equal(ownerNotification.data.viewingRequest, viewingRequest._id);
    create.mock.restore();
  });

  it("creates a review-prompt notification for the requester after a viewing", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const requesterId = new mongoose.Types.ObjectId();
    const propertyId = new mongoose.Types.ObjectId();
    const viewingRequest = {
      _id: new mongoose.Types.ObjectId(),
      requester: requesterId,
      property: { _id: propertyId, title: "Modern Kilimani Apartment" },
    };

    const notification = await notifyReviewPrompt(viewingRequest);

    assert.equal(create.mock.callCount(), 1);
    assert.equal(notification.user, requesterId);
    assert.equal(notification.type, "review");
    assert.match(notification.message, /Modern Kilimani Apartment/);
    assert.equal(notification.data.property, propertyId);
    assert.equal(notification.data.viewingRequest, viewingRequest._id);
    create.mock.restore();
  });

  it("still creates the notification even when sending a push notification fails, and logs it (via the shared logger, which also calls console.error)", async () => {
    mock.method(Notification, "create", async (payload) => payload);
    mock.method(DeviceToken, "find", async () => [{ token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" }]);
    mock.method(Expo.prototype, "sendPushNotificationsAsync", async () => {
      throw new Error("Expo push service unreachable");
    });
    const consoleErrorCalls = [];
    mock.method(console, "error", (message) => {
      consoleErrorCalls.push(message);
    });

    const notification = await notifyFeedbackResponded({
      _id: new mongoose.Types.ObjectId(),
      submitter: new mongoose.Types.ObjectId(),
      status: "responded",
    });

    assert.equal(notification.type, "feedback");
    assert.ok(consoleErrorCalls.some((message) => /Push notification failed: Expo push service unreachable/.test(message)));
    // Restore the DeviceToken mock back to the no-tokens default for any later tests.
    mock.method(DeviceToken, "find", async () => []);
  });

  it("creates a notification nudging the owner about a listing with no inquiries", async () => {
    const create = mock.method(Notification, "create", async (payload) => payload);
    const ownerId = new mongoose.Types.ObjectId();
    const property = {
      _id: new mongoose.Types.ObjectId(),
      owner: ownerId,
      title: "Modern Kilimani Apartment",
    };

    const notification = await notifyStaleListing(property);

    assert.equal(create.mock.callCount(), 1);
    assert.equal(notification.user, ownerId);
    assert.equal(notification.type, "property");
    assert.match(notification.message, /Modern Kilimani Apartment/);
    assert.equal(notification.data.property, property._id);
    create.mock.restore();
  });

});
