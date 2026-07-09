import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { run } from "../../jobs/nudgeStaleInquiries.js";
import DeviceToken from "../../models/DeviceToken.js";
import Inquiry from "../../models/Inquiry.js";
import Notification from "../../models/Notification.js";

describe("nudgeStaleInquiries job", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("notifies owners of stale open inquiries and marks them nudged", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    let filters;
    const inquiry = {
      _id: new mongoose.Types.ObjectId(),
      owner: ownerId,
      property: { _id: new mongoose.Types.ObjectId(), title: "Modern Kilimani Apartment" },
      nudgedAt: null,
      async save() {},
    };

    mock.method(Inquiry, "find", (query) => {
      filters = query;
      return {
        populate() {
          return Promise.resolve([inquiry]);
        },
      };
    });
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(filters.status, "open");
    assert.equal(filters.nudgedAt, null);
    assert.ok(filters.createdAt.$lte instanceof Date);
    assert.equal(create.mock.callCount(), 1);
    assert.ok(inquiry.nudgedAt instanceof Date);
    assert.equal(processedCount, 1);
  });

  it("does nothing when there are no stale inquiries", async () => {
    mock.method(Inquiry, "find", () => ({
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
