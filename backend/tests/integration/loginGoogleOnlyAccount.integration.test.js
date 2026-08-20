import assert from "node:assert/strict";
import mongoose from "mongoose";
import { after, before, describe, it } from "../helpers/nodeTestCompat.js";
import { loginUser } from "../../controllers/authController.js";
import User from "../../models/User.js";

const testMongoUri = process.env.TEST_MONGODB_URI;

// Regression test for a real production bug: a Google-only account (real
// googleId, no password) attempting a password login got a raw Mongoose
// "Path `password` is required." instead of the intended "Invalid
// credentials" - only reproducible against a real Mongoose schema (both
// `password` and `googleId` are `select: false`, so the mock-based
// `loginUser` tests elsewhere in this file can't catch it; see
// CHANGELOG.md for the full root-cause writeup).
describe("loginUser against a Google-only account (real database)", { skip: !testMongoUri }, () => {
  before(async () => {
    await mongoose.connect(testMongoUri, {
      dbName: process.env.TEST_MONGODB_DB_NAME || "kejaapp_test",
    });
    await User.deleteMany({ email: /integration\+google-only.*@example\.com/ });
  });

  after(async () => {
    await User.deleteMany({ email: /integration\+google-only.*@example\.com/ });
    await mongoose.disconnect();
  });

  const createResponse = () => ({
    statusCode: 200,
    body: null,
    cookie() {
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  });

  it("rejects a wrong-password attempt cleanly instead of throwing a raw ValidationError", async () => {
    const user = await User.create({
      name: "Google Only User",
      email: "integration+google-only@example.com",
      username: "integrationgoogleonly1",
      googleId: "integration-google-sub-1",
      role: "tenant",
    });

    const req = { body: { identifier: user.email, password: "whatever-they-guessed" } };
    const res = createResponse();
    let nextError;

    await loginUser(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError?.statusCode, 401);
    assert.equal(nextError?.message, "Invalid credentials");

    const reloaded = await User.findById(user._id);
    assert.equal(reloaded.failedLoginAttempts, 1);
  });
});
