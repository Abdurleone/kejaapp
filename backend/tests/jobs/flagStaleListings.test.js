import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { run } from "../../jobs/flagStaleListings.js";
import DeviceToken from "../../models/DeviceToken.js";
import Inquiry from "../../models/Inquiry.js";
import Notification from "../../models/Notification.js";
import Property from "../../models/Property.js";

const buildProperty = () => ({
  _id: new mongoose.Types.ObjectId(),
  owner: new mongoose.Types.ObjectId(),
  title: "Modern Kilimani Apartment",
  status: "available",
  freshnessNudgeSentAt: null,
  async save() {},
});

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
    mock.method(Inquiry, "countDocuments", async () => 0);
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(filters.status, "available");
    assert.equal(filters.freshnessNudgeSentAt, null);
    assert.ok(filters.createdAt.$lte instanceof Date);
    assert.equal(create.mock.callCount(), 1);
    assert.ok(property.freshnessNudgeSentAt instanceof Date);
    assert.equal(processedCount, 1);
  });

  it("skips the notification but still marks processed when the listing already has inquiries", async () => {
    const property = buildProperty();

    mock.method(Property, "find", async () => [property]);
    mock.method(Inquiry, "countDocuments", async () => 3);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(create.mock.callCount(), 0);
    assert.ok(property.freshnessNudgeSentAt instanceof Date);
    assert.equal(processedCount, 1);
  });

  it("does nothing when there are no stale listings", async () => {
    mock.method(Property, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(create.mock.callCount(), 0);
    assert.equal(processedCount, 0);
  });
});
