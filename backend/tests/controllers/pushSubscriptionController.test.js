import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { registerPushSubscription } from "../../controllers/pushSubscriptionController.js";
import PushSubscription from "../../models/PushSubscription.js";

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

describe("pushSubscriptionController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("registers a subscription with an allowed push service endpoint", async () => {
    const userId = new mongoose.Types.ObjectId();
    const created = { _id: new mongoose.Types.ObjectId() };

    const findOneAndUpdate = mock.method(PushSubscription, "findOneAndUpdate", async () => created);

    const req = {
      user: { _id: userId },
      body: {
        endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
        keys: { p256dh: "key", auth: "auth" },
      },
    };
    const res = createResponse();

    await registerPushSubscription(req, res, (error) => {
      throw error;
    });

    assert.equal(findOneAndUpdate.mock.callCount(), 1);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data, created);
  });

  it("rejects an endpoint host that isn't a known push service (SSRF guard)", async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: {
        endpoint: "https://internal.example.com/steal-me",
        keys: { p256dh: "key", auth: "auth" },
      },
    };
    const res = createResponse();
    let nextError;

    await registerPushSubscription(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "endpoint must be a supported push service URL");
  });

  it("rejects a non-https endpoint", async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: {
        endpoint: "http://fcm.googleapis.com/fcm/send/abc123",
        keys: { p256dh: "key", auth: "auth" },
      },
    };
    const res = createResponse();
    let nextError;

    await registerPushSubscription(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "endpoint must be a supported push service URL");
  });

  it("rejects an endpoint that isn't a valid URL", async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: {
        endpoint: "not-a-url",
        keys: { p256dh: "key", auth: "auth" },
      },
    };
    const res = createResponse();
    let nextError;

    await registerPushSubscription(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "endpoint must be a supported push service URL");
  });
});
