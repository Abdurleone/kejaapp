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
});

const mockNoExistingReviews = () => mock.method(Review, "find", () => ({ lean: async () => [] }));

const mockExistingReview = (viewingRequest) =>
  mock.method(Review, "find", () => ({
    lean: async () => [{ property: viewingRequest.property._id, user: viewingRequest.requester }],
  }));

describe("promptPostViewingReviews job", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  // The job runs two sequential ViewingRequest.find() calls - scheduled
  // viewings (by requestedDate) first, then open viewings (by createdAt).
  // Returning `result` on the first call and `[]` on the second isolates
  // each test to just the scheduled-viewing branch, unless noted otherwise.
  const mockScheduledOnly = (result) => {
    let callIndex = 0;
    const filtersByCall = [];

    mock.method(ViewingRequest, "find", (query) => {
      filtersByCall.push(query);
      const data = callIndex === 0 ? result : [];
      callIndex += 1;
      return {
        populate() {
          return Promise.resolve(data);
        },
      };
    });

    return filtersByCall;
  };

  it("prompts a review, flips status to completed, and marks it processed", async () => {
    const viewingRequest = buildViewingRequest();
    const filtersByCall = mockScheduledOnly([viewingRequest]);
    mockNoExistingReviews();
    let updateManyFilter;
    let updateManyUpdate;
    mock.method(ViewingRequest, "updateMany", async (filter, update) => {
      updateManyFilter = filter;
      updateManyUpdate = update;
      return { acknowledged: true };
    });
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    const [scheduledFilters] = filtersByCall;
    assert.equal(scheduledFilters.status, "approved");
    assert.equal(scheduledFilters.reviewPromptSentAt, null);
    assert.ok(scheduledFilters.requestedDate.$lt instanceof Date);
    assert.ok(scheduledFilters.requestedDate.$gte instanceof Date);
    assert.equal(create.mock.callCount(), 1);
    assert.deepEqual(updateManyFilter, { _id: { $in: [viewingRequest._id] } });
    assert.equal(updateManyUpdate.$set.status, "completed");
    assert.ok(updateManyUpdate.$set.reviewPromptSentAt instanceof Date);
    assert.equal(processedCount, 1);
  });

  it("skips the notification but still marks processed when a review already exists", async () => {
    const viewingRequest = buildViewingRequest();
    mockScheduledOnly([viewingRequest]);
    mockExistingReview(viewingRequest);
    mock.method(ViewingRequest, "updateMany", async () => ({ acknowledged: true }));
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(create.mock.callCount(), 0);
    assert.equal(processedCount, 1);
  });

  it("does nothing when there are no past viewings", async () => {
    mockScheduledOnly([]);
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(create.mock.callCount(), 0);
    assert.equal(processedCount, 0);
  });

  it("also picks up an old-enough open viewing (no requestedDate), anchored on createdAt", async () => {
    const openViewing = buildViewingRequest();
    let callIndex = 0;
    const filtersByCall = [];

    mock.method(ViewingRequest, "find", (query) => {
      filtersByCall.push(query);
      const data = callIndex === 0 ? [] : [openViewing];
      callIndex += 1;
      return {
        populate() {
          return Promise.resolve(data);
        },
      };
    });
    mockNoExistingReviews();
    mock.method(ViewingRequest, "updateMany", async () => ({ acknowledged: true }));
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    const [, openFilters] = filtersByCall;
    assert.equal(openFilters.status, "approved");
    assert.equal(openFilters.requestedDate, null);
    assert.equal(openFilters.reviewPromptSentAt, null);
    assert.ok(openFilters.createdAt.$lt instanceof Date);
    assert.ok(openFilters.createdAt.$gte instanceof Date);
    assert.equal(create.mock.callCount(), 1);
    assert.equal(processedCount, 1);
  });

  it("processes both a scheduled and an open viewing in the same run", async () => {
    const scheduledViewing = buildViewingRequest();
    const openViewing = buildViewingRequest();
    let callIndex = 0;

    mock.method(ViewingRequest, "find", () => {
      const data = callIndex === 0 ? [scheduledViewing] : [openViewing];
      callIndex += 1;
      return {
        populate() {
          return Promise.resolve(data);
        },
      };
    });
    mockNoExistingReviews();
    mock.method(ViewingRequest, "updateMany", async () => ({ acknowledged: true }));
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(create.mock.callCount(), 2);
    assert.equal(processedCount, 2);
  });
});
