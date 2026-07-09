import assert from "node:assert/strict";
import mongoose from "mongoose";
import { describe, it } from "node:test";
import ViewingRequest from "../../models/ViewingRequest.js";

describe("ViewingRequest model", () => {
  it("defaults new viewing requests to pending", () => {
    const viewingRequest = new ViewingRequest({
      property: new mongoose.Types.ObjectId(),
      requester: new mongoose.Types.ObjectId(),
      owner: new mongoose.Types.ObjectId(),
    });

    assert.equal(viewingRequest.status, "pending");
    assert.equal(viewingRequest.requestedDate, undefined);
    assert.equal(viewingRequest.reviewedAt, null);
    assert.equal(viewingRequest.reviewedBy, null);
    assert.equal(viewingRequest.nudgedAt, null);
    assert.equal(viewingRequest.reminderSentAt, null);
    assert.equal(viewingRequest.reviewPromptSentAt, null);
  });
});
