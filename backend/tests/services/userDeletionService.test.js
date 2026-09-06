import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { deleteUserCascade } from "../../services/userDeletionService.js";
import AgencyVerification from "../../models/AgencyVerification.js";
import AuthSession from "../../models/AuthSession.js";
import DeviceToken from "../../models/DeviceToken.js";
import Favorite from "../../models/Favorite.js";
import Feedback from "../../models/Feedback.js";
import Inquiry from "../../models/Inquiry.js";
import Mover from "../../models/Mover.js";
import MoverRequest from "../../models/MoverRequest.js";
import MoverVerification from "../../models/MoverVerification.js";
import Notification from "../../models/Notification.js";
import Property from "../../models/Property.js";
import PropertyImageFingerprint from "../../models/PropertyImageFingerprint.js";
import PushSubscription from "../../models/PushSubscription.js";
import Review from "../../models/Review.js";
import SavedSearch from "../../models/SavedSearch.js";
import User from "../../models/User.js";
import UserStatusLog from "../../models/UserStatusLog.js";
import UserViolation from "../../models/UserViolation.js";
import ViewingRequest from "../../models/ViewingRequest.js";

// Models this suite doesn't care about (no actor-reference bug under test
// here) are stubbed as flat no-ops, matching how authController.test.js
// exercises the same cascade.
const stubDeleteMany = (Model) => mock.method(Model, "deleteMany", async () => ({ deletedCount: 0 }));
const stubUpdateMany = (Model) => mock.method(Model, "updateMany", async () => ({ modifiedCount: 0 }));

const stubUnrelatedModels = () => {
  for (const Model of [
    AuthSession,
    Favorite,
    Inquiry,
    ViewingRequest,
    Notification,
    AgencyVerification,
    PropertyImageFingerprint,
    UserViolation,
    UserStatusLog,
    Property,
    Mover,
    MoverVerification,
    MoverRequest,
    SavedSearch,
    DeviceToken,
    PushSubscription,
  ]) {
    stubDeleteMany(Model);
  }
  stubUpdateMany(AgencyVerification);
  stubUpdateMany(UserStatusLog);
  stubUpdateMany(MoverVerification);
  stubUpdateMany(Mover);
  stubUpdateMany(UserViolation);
};

// A tiny in-memory Feedback "collection" so deleteMany/updateMany actually
// mutate documents the same way MongoDB would, instead of just recording
// which filter shape was passed - that's what lets this test prove the
// *outcome* (a different user's feedback survives, admin's own is gone)
// rather than merely re-asserting the query shape.
const createFakeFeedbackStore = (initialDocs) => {
  let docs = initialDocs.map((doc) => ({ ...doc, response: doc.response ? { ...doc.response } : undefined }));

  mock.method(Feedback, "deleteMany", async (filter) => {
    const before = docs.length;
    docs = docs.filter((doc) => String(doc.submitter) !== String(filter.submitter));
    return { deletedCount: before - docs.length };
  });

  mock.method(Feedback, "updateMany", async (filter, update) => {
    const respondedByTarget = filter["response.respondedBy"];
    const submitterNe = filter.submitter?.$ne;
    let modifiedCount = 0;

    for (const doc of docs) {
      const respondedByMatches =
        doc.response && String(doc.response.respondedBy) === String(respondedByTarget);
      const submitterExcluded = submitterNe !== undefined && String(doc.submitter) === String(submitterNe);

      if (respondedByMatches && !submitterExcluded) {
        if (update.$unset && Object.prototype.hasOwnProperty.call(update.$unset, "response.respondedBy")) {
          delete doc.response.respondedBy;
        }
        modifiedCount += 1;
      }
    }

    return { modifiedCount };
  });

  return {
    all: () => docs,
    find: (id) => docs.find((doc) => String(doc._id) === String(id)),
  };
};

const setupBaseCascadeMocks = ({ userId }) => {
  mock.method(User, "findById", async () => ({ _id: userId, async deleteOne() {} }));
  mock.method(Property, "find", () => ({ select: async () => [] }));
  mock.method(Review, "distinct", async () => []);
  mock.method(Review, "updatePropertyRating", async () => {});
  stubDeleteMany(Review);
  stubUpdateMany(Review);
  stubUnrelatedModels();
};

describe("userDeletionService - Feedback cascade", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("deletes an admin's own submitted feedback but only unsets response.respondedBy on someone else's feedback they responded to", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const otherUserId = new mongoose.Types.ObjectId();
    const adminOwnFeedbackId = new mongoose.Types.ObjectId();
    const otherUserFeedbackId = new mongoose.Types.ObjectId();

    setupBaseCascadeMocks({ userId: adminId });

    const feedbackStore = createFakeFeedbackStore([
      {
        _id: adminOwnFeedbackId,
        submitter: adminId,
        message: "Admin's own feedback",
      },
      {
        _id: otherUserFeedbackId,
        submitter: otherUserId,
        message: "Feedback from a different, still-existing user",
        response: { message: "Thanks!", respondedBy: adminId },
      },
    ]);

    await deleteUserCascade(adminId);

    // The admin's own submitted feedback is gone.
    assert.equal(feedbackStore.find(adminOwnFeedbackId), undefined);

    // The other user's feedback document survives, with only the responder
    // reference cleared - not the whole document destroyed.
    const survivingFeedback = feedbackStore.find(otherUserFeedbackId);
    assert.ok(survivingFeedback, "the other user's feedback document must still exist");
    assert.equal(survivingFeedback.submitter.toString(), otherUserId.toString());
    assert.equal(
      Object.prototype.hasOwnProperty.call(survivingFeedback.response, "respondedBy"),
      false
    );
    assert.equal(feedbackStore.all().length, 1);
  });

  it("leaves an unrelated user's feedback and response untouched", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const unrelatedUserId = new mongoose.Types.ObjectId();
    const otherAdminId = new mongoose.Types.ObjectId();
    const unrelatedFeedbackId = new mongoose.Types.ObjectId();

    setupBaseCascadeMocks({ userId: adminId });

    const feedbackStore = createFakeFeedbackStore([
      {
        _id: unrelatedFeedbackId,
        submitter: unrelatedUserId,
        response: { message: "Handled", respondedBy: otherAdminId },
      },
    ]);

    await deleteUserCascade(adminId);

    const untouched = feedbackStore.find(unrelatedFeedbackId);
    assert.ok(untouched);
    assert.equal(untouched.response.respondedBy.toString(), otherAdminId.toString());
  });
});
