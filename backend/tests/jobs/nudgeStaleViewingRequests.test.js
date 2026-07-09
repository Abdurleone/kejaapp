import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { run } from "../../jobs/nudgeStaleViewingRequests.js";
import DeviceToken from "../../models/DeviceToken.js";
import Notification from "../../models/Notification.js";
import ViewingRequest from "../../models/ViewingRequest.js";

describe("nudgeStaleViewingRequests job", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("notifies owners of stale pending viewing requests and marks them nudged", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    let filters;
    const viewingRequest = {
      _id: new mongoose.Types.ObjectId(),
      owner: ownerId,
      property: { _id: new mongoose.Types.ObjectId(), title: "Modern Kilimani Apartment" },
      nudgedAt: null,
      async save() {},
    };

    mock.method(ViewingRequest, "find", (query) => {
      filters = query;
      return {
        populate() {
          return Promise.resolve([viewingRequest]);
        },
      };
    });
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const processedCount = await run();

    assert.equal(filters.status, "pending");
    assert.equal(filters.nudgedAt, null);
    assert.ok(filters.createdAt.$lte instanceof Date);
    assert.equal(create.mock.callCount(), 1);
    assert.ok(viewingRequest.nudgedAt instanceof Date);
    assert.equal(processedCount, 1);
  });

  it("does nothing when there are no stale viewing requests", async () => {
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
