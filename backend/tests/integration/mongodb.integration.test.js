import assert from "node:assert/strict";
import mongoose from "mongoose";
import { after, before, describe, it } from "../helpers/nodeTestCompat.js";
import User from "../../models/User.js";

const testMongoUri = process.env.TEST_MONGODB_URI;

describe("MongoDB integration", { skip: !testMongoUri }, () => {
  before(async () => {
    await mongoose.connect(testMongoUri, {
      dbName: process.env.TEST_MONGODB_DB_NAME || "kejaapp_test",
    });
    await User.deleteMany({ email: /integration\+.*@example\.com/ });
  });

  after(async () => {
    await User.deleteMany({ email: /integration\+.*@example\.com/ });
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
});
