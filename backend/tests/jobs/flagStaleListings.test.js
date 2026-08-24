import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { run } from "../../jobs/flagStaleListings.js";
import DeviceToken from "../../models/DeviceToken.js";
import Inquiry from "../../models/Inquiry.js";
import Notification from "../../models/Notification.js";
import Property from "../../models/Property.js";

const buildProperty = () => {
  const property = {
    _id: new mongoose.Types.ObjectId(),
    owner: new mongoose.Types.ObjectId(),
    title: "Modern Kilimani Apartment",
    status: "available",
    freshnessNudgeSentAt: null,
    saveCallCount: 0,
  };

  property.save = async function () {
    property.saveCallCount += 1;
  };

  return property;
};

describe("flagStaleListings job", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("nudges the owner of a stale listing with zero inquiries and marks it processed", async () => {
    let filters;
    const property = buildProperty();

    mock.method(Property, "find", async (query) => {
      filters = query;
      return [property];
    });
    mock.method(Inquiry, "aggregate", async () => []);
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(filters.status, "available");
    assert.equal(filters.freshnessNudgeSentAt, null);
    assert.ok(filters.createdAt.$lte instanceof Date);
    assert.equal(create.mock.callCount(), 1);
    assert.ok(property.freshnessNudgeSentAt instanceof Date);
    assert.equal(property.saveCallCount, 1);
    assert.equal(processedCount, 1);
  });

  it("skips the notification but still marks processed when the listing already has inquiries", async () => {
    const property = buildProperty();

    mock.method(Property, "find", async () => [property]);
    mock.method(Inquiry, "aggregate", async () => [{ _id: property._id, count: 3 }]);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(create.mock.callCount(), 0);
    assert.ok(property.freshnessNudgeSentAt instanceof Date);
    assert.equal(property.saveCallCount, 1);
    assert.equal(processedCount, 1);
  });

  it("does nothing when there are no stale listings", async () => {
    mock.method(Property, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(create.mock.callCount(), 0);
    assert.equal(processedCount, 0);
  });

  it("leaves only the failed property (and anything after it) eligible for retry when a mid-batch notification throws - does not re-notify ones already processed", async () => {
    // Regression test: this job used to batch every notify() call via
    // Promise.all, then bulk-updateMany every candidate's
    // freshnessNudgeSentAt in one separate step - so a single failure
    // anywhere in the batch skipped the bulk update entirely, leaving even
    // the properties that succeeded unmarked and re-notified on every
    // subsequent run. The fix processes properties one at a time,
    // notify-then-save, so a failure partway through only leaves the
    // properties from that point onward eligible for retry.
    const firstProperty = buildProperty();
    const secondProperty = buildProperty();
    const thirdProperty = buildProperty();

    mock.method(Property, "find", async () => [firstProperty, secondProperty, thirdProperty]);
    mock.method(Inquiry, "aggregate", async () => []);
    mock.method(DeviceToken, "find", async () => []);
    mock.method(Notification, "create", async (payload) => {
      if (payload.data.property === secondProperty._id) {
        throw new Error("transient write failure");
      }

      return payload;
    });

    await assert.rejects(() => run(), /transient write failure/);

    assert.ok(firstProperty.freshnessNudgeSentAt instanceof Date);
    assert.equal(firstProperty.saveCallCount, 1);
    assert.equal(secondProperty.freshnessNudgeSentAt, null);
    assert.equal(secondProperty.saveCallCount, 0);
    assert.equal(thirdProperty.freshnessNudgeSentAt, null);
    assert.equal(thirdProperty.saveCallCount, 0);
  });
});
