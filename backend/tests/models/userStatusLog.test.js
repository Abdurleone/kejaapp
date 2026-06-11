import assert from "node:assert/strict";
import mongoose from "mongoose";
import { describe, it } from "node:test";
import UserStatusLog from "../../models/UserStatusLog.js";

describe("UserStatusLog model", () => {
  it("stores account status moderation history", () => {
    const user = new mongoose.Types.ObjectId();
    const changedBy = new mongoose.Types.ObjectId();
    const log = new UserStatusLog({
      user,
      changedBy,
      previousStatus: "active",
      newStatus: "suspended",
      reason: "Repeated duplicate listing uploads",
    });

    assert.equal(log.user, user);
    assert.equal(log.changedBy, changedBy);
    assert.equal(log.previousStatus, "active");
    assert.equal(log.newStatus, "suspended");
    assert.equal(log.reason, "Repeated duplicate listing uploads");
  });

  it("indexes user status history by newest first", () => {
    const indexes = UserStatusLog.schema.indexes();
    const historyIndex = indexes.find(([fields]) => fields.user === 1 && fields.createdAt === -1);

    assert.ok(historyIndex);
  });
});
