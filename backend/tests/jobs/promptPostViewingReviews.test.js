import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { run } from "../../jobs/promptPostViewingReviews.js";
import DeviceToken from "../../models/DeviceToken.js";
import Notification from "../../models/Notification.js";
import Review from "../../models/Review.js";
import ViewingRequest from "../../models/ViewingRequest.js";

const buildViewingRequest = () => ({
  _id: new mongoose.Types.ObjectId(),
  requester: new mongoose.Types.ObjectId(),
  owner: new mongoose.Types.ObjectId(),
  property: { _id: new mongoose.Types.ObjectId(), title: "Modern Kilimani Apartment" },
  status: "approved",
  reviewPromptSentAt: null,
  async save() {},
});

describe("promptPostViewingReviews job", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("prompts a review, flips status to completed, and marks it processed", async () => {
    let filters;
    const viewingRequest = buildViewingRequest();

    mock.method(ViewingRequest, "find", (query) => {
      filters = query;
      return {
        populate() {
          return Promise.resolve([viewingRequest]);
        },
      };
    });
    mock.method(Review, "exists", async () => false);
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(filters.status, "approved");
    assert.equal(filters.reviewPromptSentAt, null);
    assert.ok(filters.requestedDate.$lt instanceof Date);
    assert.ok(filters.requestedDate.$gte instanceof Date);
    assert.equal(create.mock.callCount(), 1);
    assert.equal(viewingRequest.status, "completed");
    assert.ok(viewingRequest.reviewPromptSentAt instanceof Date);
    assert.equal(processedCount, 1);
  });

  it("skips the notification but still marks processed when a review already exists", async () => {
    const viewingRequest = buildViewingRequest();

    mock.method(ViewingRequest, "find", () => ({
      populate() {
        return Promise.resolve([viewingRequest]);
      },
    }));
    mock.method(Review, "exists", async () => true);
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(create.mock.callCount(), 0);
    assert.equal(viewingRequest.status, "completed");
    assert.ok(viewingRequest.reviewPromptSentAt instanceof Date);
    assert.equal(processedCount, 1);
  });

  it("does nothing when there are no past viewings", async () => {
    mock.method(ViewingRequest, "find", () => ({
      populate() {
        return Promise.resolve([]);
      },
    }));
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(create.mock.callCount(), 0);
    assert.equal(processedCount, 0);
  });
});
