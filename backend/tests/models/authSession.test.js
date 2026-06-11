import assert from "node:assert/strict";
import mongoose from "mongoose";
import { describe, it } from "node:test";
import AuthSession from "../../models/AuthSession.js";

describe("AuthSession model", () => {
  it("stores hashed refresh token sessions", () => {
    const user = new mongoose.Types.ObjectId();
    const session = new AuthSession({
      user,
      tokenHash: "a".repeat(64),
      expiresAt: new Date(Date.now() + 60000),
    });

    assert.equal(session.user, user);
    assert.equal(session.tokenHash, "a".repeat(64));
    assert.equal(session.revokedAt, null);
  });

  it("indexes active sessions by user", () => {
    const indexes = AuthSession.schema.indexes();
    const sessionIndex = indexes.find(([fields]) =>
      fields.user === 1 && fields.revokedAt === 1 && fields.expiresAt === 1
    );

    assert.ok(sessionIndex);
  });
});
