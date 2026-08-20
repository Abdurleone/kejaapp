import assert from "node:assert/strict";
import mongoose from "mongoose";
import { describe, it } from "node:test";
import Feedback, { feedbackStatuses } from "../../models/Feedback.js";

describe("Feedback model", () => {
  it("defaults new feedback to pending and not public", () => {
    const feedback = new Feedback({
      submitter: new mongoose.Types.ObjectId(),
      message: "KejaApp helped me find my dream home in Kilimani.",
    });

    assert.equal(feedback.status, "pending");
    assert.equal(feedback.isPublic, false);
    assert.equal(feedback.response.respondedBy, null);
    assert.equal(feedback.response.respondedAt, null);
  });

  it("requires a submitter and message", () => {
    const feedback = new Feedback({});
    const error = feedback.validateSync();

    assert.ok(error.errors.submitter);
    assert.ok(error.errors.message);
  });

  it("rejects messages over 1000 characters", () => {
    const feedback = new Feedback({
      submitter: new mongoose.Types.ObjectId(),
      message: "a".repeat(1001),
    });
    const error = feedback.validateSync();

    assert.ok(error.errors.message);
  });

  it("only allows pending/responded statuses", () => {
    assert.deepEqual(feedbackStatuses, ["pending", "responded"]);

    const feedback = new Feedback({
      submitter: new mongoose.Types.ObjectId(),
      message: "Great experience overall.",
      status: "archived",
    });
    const error = feedback.validateSync();

    assert.ok(error.errors.status);
  });

  it("defines the submitter and public-testimonial indexes", () => {
    const indexes = Feedback.schema.indexes();

    const submitterIndex = indexes.find(
      ([fields]) => fields.submitter === 1 && fields.createdAt === -1
    );
    const publicIndex = indexes.find(
      ([fields]) => fields.isPublic === 1 && fields["response.respondedAt"] === -1
    );

    assert.ok(submitterIndex);
    assert.ok(publicIndex);
  });
});
