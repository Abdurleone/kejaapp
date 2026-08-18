import assert from "node:assert/strict";
import mongoose from "mongoose";
import { after, before, describe, it } from "../helpers/nodeTestCompat.js";
import User from "../../models/User.js";
import PushReceipt from "../../models/PushReceipt.js";
import PushSubscription from "../../models/PushSubscription.js";

const testMongoUri = process.env.TEST_MONGODB_URI;

describe("MongoDB integration", { skip: !testMongoUri }, () => {
  before(async () => {
    await mongoose.connect(testMongoUri, {
      dbName: process.env.TEST_MONGODB_DB_NAME || "jakezapp_test",
    });
    await User.deleteMany({ email: /integration\+.*@example\.com/ });
    await PushReceipt.deleteMany({ ticketId: /^integration-/ });
    await PushSubscription.deleteMany({ endpoint: /^https:\/\/integration\.example\.com/ });
  });

  after(async () => {
    await User.deleteMany({ email: /integration\+.*@example\.com/ });
    await PushReceipt.deleteMany({ ticketId: /^integration-/ });
    await PushSubscription.deleteMany({ endpoint: /^https:\/\/integration\.example\.com/ });
    await mongoose.disconnect();
  });

  it("persists and reads user documents from a real test database", async () => {
    const user = await User.create({
      name: "Integration User",
      email: "integration+user@example.com",
      username: "integrationuser1",
      password: "password123",
      role: "tenant",
    });

    const foundUser = await User.findById(user._id);

    assert.equal(foundUser.email, "integration+user@example.com");
    assert.equal(foundUser.accountStatus, "active");
  });

  it("builds a createdAt index on PushReceipt, so pollExpoPushReceipts.js's find/deleteMany queries aren't a full collection scan", async () => {
    // autoIndex only builds indexes once the collection actually exists -
    // insert a throwaway document first so there's something for Mongoose
    // to have indexed against.
    const receipt = await PushReceipt.create({
      ticketId: "integration-createdat-index-check",
      token: "ExponentPushToken[integration-test]",
    });

    const indexes = await PushReceipt.collection.getIndexes();

    assert.ok(
      Object.prototype.hasOwnProperty.call(indexes, "createdAt_1"),
      `expected a createdAt_1 index, got: ${Object.keys(indexes).join(", ")}`
    );

    await PushReceipt.deleteOne({ _id: receipt._id });
  });

  it("builds a unique index on PushSubscription.endpoint, so a re-subscribe upserts instead of duplicating", async () => {
    // autoIndex only builds indexes once the collection actually exists -
    // insert a throwaway document first so there's something for Mongoose
    // to have indexed against.
    const subscription = await PushSubscription.create({
      user: new mongoose.Types.ObjectId(),
      endpoint: "https://integration.example.com/push/endpoint-index-check",
      keys: { p256dh: "integration-p256dh", auth: "integration-auth" },
    });

    const indexes = await PushSubscription.collection.getIndexes();

    assert.ok(
      Object.prototype.hasOwnProperty.call(indexes, "endpoint_1"),
      `expected an endpoint_1 index, got: ${Object.keys(indexes).join(", ")}`
    );

    await PushSubscription.deleteOne({ _id: subscription._id });
  });
});
