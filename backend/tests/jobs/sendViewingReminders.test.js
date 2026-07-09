import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { run } from "../../jobs/sendViewingReminders.js";
import DeviceToken from "../../models/DeviceToken.js";
import Notification from "../../models/Notification.js";
import ViewingRequest from "../../models/ViewingRequest.js";

describe("sendViewingReminders job", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("reminds both sides of a viewing happening within 24 hours and marks it sent", async () => {
    let filters;
    const viewingRequest = {
      _id: new mongoose.Types.ObjectId(),
      requester: new mongoose.Types.ObjectId(),
      owner: new mongoose.Types.ObjectId(),
      property: { _id: new mongoose.Types.ObjectId(), title: "Modern Kilimani Apartment" },
      requestedDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
      reminderSentAt: null,
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

    assert.equal(filters.status, "approved");
    assert.equal(filters.reminderSentAt, null);
    assert.ok(filters.requestedDate.$gte instanceof Date);
    assert.ok(filters.requestedDate.$lte instanceof Date);
    assert.equal(create.mock.callCount(), 2);
    assert.ok(viewingRequest.reminderSentAt instanceof Date);
    assert.equal(processedCount, 1);
  });

  it("does nothing when there are no upcoming viewings", async () => {
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
