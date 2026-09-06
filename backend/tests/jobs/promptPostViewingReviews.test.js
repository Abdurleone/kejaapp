import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { run } from "../../jobs/promptPostViewingReviews.js";
import DeviceToken from "../../models/DeviceToken.js";
import Notification from "../../models/Notification.js";
import Review from "../../models/Review.js";
import ViewingRequest from "../../models/ViewingRequest.js";

const buildViewingRequest = () => {
  const viewingRequest = {
    _id: new mongoose.Types.ObjectId(),
    requester: new mongoose.Types.ObjectId(),
    owner: new mongoose.Types.ObjectId(),
    property: { _id: new mongoose.Types.ObjectId(), title: "Modern Kilimani Apartment" },
    status: "approved",
    reviewPromptSentAt: null,
    saveCallCount: 0,
  };

  viewingRequest.save = async function () {
    viewingRequest.saveCallCount += 1;
  };

  return viewingRequest;
};

const mockNoExistingReviews = () => mock.method(Review, "find", () => ({ lean: async () => [] }));

const mockExistingReview = (viewingRequest) =>
  mock.method(Review, "find", () => ({
    lean: async () => [{ property: viewingRequest.property._id, user: viewingRequest.requester }],
  }));

// The job re-checks each viewing request's live status via findById right
// before notifying and again right before saving, to guard against a
// concurrent approved -> cancelled transition (see the race test below).
// Most tests aren't exercising that race, so this default just always
// reports "approved" - the status the fixtures already start in.
const mockFindByIdApproved = () =>
  mock.method(ViewingRequest, "findById", () => ({ lean: async () => ({ status: "approved" }) }));

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
    mockFindByIdApproved();
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    const [scheduledFilters] = filtersByCall;
    assert.equal(scheduledFilters.status, "approved");
    assert.equal(scheduledFilters.reviewPromptSentAt, null);
    assert.ok(scheduledFilters.requestedDate.$lt instanceof Date);
    assert.ok(scheduledFilters.requestedDate.$gte instanceof Date);
    assert.equal(create.mock.callCount(), 1);
    assert.equal(viewingRequest.status, "completed");
    assert.ok(viewingRequest.reviewPromptSentAt instanceof Date);
    assert.equal(viewingRequest.saveCallCount, 1);
    assert.equal(processedCount, 1);
  });

  it("skips the notification but still marks processed when a review already exists", async () => {
    const viewingRequest = buildViewingRequest();
    mockScheduledOnly([viewingRequest]);
    mockExistingReview(viewingRequest);
    mockFindByIdApproved();
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(create.mock.callCount(), 0);
    assert.equal(viewingRequest.status, "completed");
    assert.equal(viewingRequest.saveCallCount, 1);
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

  it("leaves only the failed viewing request (and anything after it) eligible for retry when a mid-batch notification throws - does not re-notify ones already processed", async () => {
    // Regression test: this job used to batch every notify() call via
    // Promise.all, then bulk-updateMany every candidate's status/
    // reviewPromptSentAt in one separate step - so a single failure
    // anywhere in the batch skipped the bulk update entirely, leaving even
    // the requests that succeeded unmarked and re-notified on every
    // subsequent run. The fix processes requests one at a time,
    // notify-then-save, so a failure partway through only leaves the
    // requests from that point onward eligible for retry.
    const firstViewing = buildViewingRequest();
    const secondViewing = buildViewingRequest();
    const thirdViewing = buildViewingRequest();

    mockScheduledOnly([firstViewing, secondViewing, thirdViewing]);
    mockNoExistingReviews();
    mockFindByIdApproved();
    mock.method(DeviceToken, "find", async () => []);
    mock.method(Notification, "create", async (payload) => {
      if (payload.data.viewingRequest === secondViewing._id) {
        throw new Error("transient write failure");
      }

      return payload;
    });

    await assert.rejects(() => run(), /transient write failure/);

    assert.equal(firstViewing.status, "completed");
    assert.equal(firstViewing.saveCallCount, 1);
    assert.equal(secondViewing.status, "approved");
    assert.equal(secondViewing.saveCallCount, 0);
    assert.equal(thirdViewing.status, "approved");
    assert.equal(thirdViewing.saveCallCount, 0);
  });

  it("does not revert a viewing back to completed if it was cancelled after the job's initial fetch (race with updateViewingRequestStatus)", async () => {
    // Regression test: previously the job unconditionally set
    // status = "completed" and saved, so a legitimate approved -> cancelled
    // transition landing between the job's initial find() and this item's
    // turn in the loop got silently clobbered back to "completed" - letting
    // a tenant review a viewing that was actually cancelled. The fix
    // re-checks the live status (via findById) immediately before notifying
    // and again immediately before saving.
    const firstViewing = buildViewingRequest();
    const raceViewing = buildViewingRequest();

    mockScheduledOnly([firstViewing, raceViewing]);
    mockNoExistingReviews();
    mock.method(DeviceToken, "find", async () => []);

    const notifiedViewingRequestIds = [];
    mock.method(Notification, "create", async (payload) => {
      notifiedViewingRequestIds.push(payload.data.viewingRequest);

      if (payload.data.viewingRequest === firstViewing._id) {
        // Simulate a concurrent updateViewingRequestStatus call landing
        // while the job is still mid-flight on an earlier item - by the
        // time the loop reaches raceViewing, it's already cancelled in the
        // "database" (here, the fixture the mocked findById below reads
        // live from).
        raceViewing.status = "cancelled";
      }

      return payload;
    });

    // findById reads the fixtures' current .status directly, so a mutation
    // made above (mid-run) is visible to the job's re-check exactly like a
    // fresh read from MongoDB would be.
    mock.method(ViewingRequest, "findById", (id) => {
      const doc = id === firstViewing._id ? firstViewing : id === raceViewing._id ? raceViewing : null;
      return { lean: async () => (doc ? { status: doc.status } : null) };
    });

    const processedCount = await run();

    assert.equal(firstViewing.status, "completed");
    assert.equal(firstViewing.saveCallCount, 1);

    // Cancelled mid-run, before the loop reached it - must stay cancelled,
    // not get clobbered back to "completed", and shouldn't even have
    // triggered a review-prompt notification.
    assert.equal(raceViewing.status, "cancelled");
    assert.equal(raceViewing.saveCallCount, 0);
    assert.ok(!notifiedViewingRequestIds.includes(raceViewing._id));

    assert.equal(processedCount, 2);
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
    mockFindByIdApproved();
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
    mockFindByIdApproved();
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(create.mock.callCount(), 2);
    assert.equal(scheduledViewing.saveCallCount, 1);
    assert.equal(openViewing.saveCallCount, 1);
    assert.equal(processedCount, 2);
  });
});
