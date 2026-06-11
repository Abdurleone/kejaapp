import assert from "node:assert/strict";
import mongoose from "mongoose";
import { describe, it, mock } from "node:test";
import Notification from "../../models/Notification.js";
import {
  notifyAgencyVerificationDecision,
  notifyPropertyInquiryCreated,
  notifyPropertyInquiryResponded,
  notifyPropertyReviewCreated,
  notifyUserStatusChanged,
  notifyViewingRequestCreated,
  notifyViewingRequestStatusChanged,
} from "../../services/notificationService.js";

describe("notificationService", () => {
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

});
