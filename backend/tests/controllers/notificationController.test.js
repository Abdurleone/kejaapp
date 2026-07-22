import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../controllers/notificationController.js";
import Notification from "../../models/Notification.js";

const createResponse = () => ({
  body: null,
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

describe("notificationController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("lists the signed-in user's notifications, filtering by unread when requested", async () => {
    const expectedData = [{ readAt: null }];
    const userId = new mongoose.Types.ObjectId();
    const query = {
      sort() {
        return this;
      },
      limit() {
        return this;
      },
      lean() {
        return expectedData;
      },
    };
    const find = mock.method(Notification, "find", (filters) => {
      assert.deepEqual(filters, { user: userId, readAt: null });
      return query;
    });
    const req = { query: { unread: "true" }, user: { _id: userId } };
    const res = createResponse();

    await listNotifications(req, res, (error) => {
      throw error;
    });

    assert.equal(find.mock.callCount(), 1);
    assert.deepEqual(res.body.data, expectedData);
  });

  it("returns not found when marking a missing notification as read", async () => {
    mock.method(Notification, "findOne", async () => null);
    const req = {
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await markNotificationRead(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Notification not found");
  });

  it("marks every one of the signed-in user's unread notifications as read", async () => {
    const userId = new mongoose.Types.ObjectId();
    const updateMany = mock.method(Notification, "updateMany", async (filters, update) => {
      assert.deepEqual(filters, { user: userId, readAt: null });
      assert.ok(update.readAt instanceof Date);
      return { modifiedCount: 3 };
    });
    const req = { user: { _id: userId } };
    const res = createResponse();

    await markAllNotificationsRead(req, res, (error) => {
      throw error;
    });

    assert.equal(updateMany.mock.callCount(), 1);
    assert.deepEqual(res.body.data, { unread: 0 });
  });
});
