import assert from "node:assert/strict";
import { describe, it } from "node:test";
import User from "../../models/User.js";

describe("User model", () => {
  it("hashes passwords before validation/save middleware completes", async () => {
    const user = new User({
      name: "Test User",
      email: "test@example.com",
      username: "testuser1",
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
      username: "testuser2",
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
      username: "activeuser",
      password: "password123",
    });

    assert.equal(user.accountStatus, "active");
  });

  it("requires a username", async () => {
    const user = new User({
      name: "No Username",
      email: "nousername@example.com",
      password: "password123",
    });

    await assert.rejects(() => user.validate());
  });

  it("lowercases and trims the username", () => {
    const user = new User({
      name: "Cased User",
      email: "cased@example.com",
      username: "  SwiftCheetah284  ",
      password: "password123",
    });

    assert.equal(user.username, "swiftcheetah284");
  });
});
