import assert from "node:assert/strict";
import { describe, it } from "node:test";
import User from "../../models/User.js";

describe("User model", () => {
  it("hashes passwords before validation/save middleware completes", async () => {
    const user = new User({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    await user.validate();
    await user.$__schema.s.hooks.execPre("save", user, []);

    assert.notEqual(user.password, "password123");
    assert.equal(await user.matchPassword("password123"), true);
  });

  it("does not rehash an unchanged password", async () => {
    const user = new User({
      name: "Test User",
      email: "test2@example.com",
      password: "password123",
    });

    await user.validate();
    await user.$__schema.s.hooks.execPre("save", user, []);
    const hashedPassword = user.password;
    user.unmarkModified("password");

    await user.$__schema.s.hooks.execPre("save", user, []);

    assert.equal(user.password, hashedPassword);
  });

  it("defaults accounts to active status", () => {
    const user = new User({
      name: "Active User",
      email: "active@example.com",
      password: "password123",
    });

    assert.equal(user.accountStatus, "active");
  });
});
