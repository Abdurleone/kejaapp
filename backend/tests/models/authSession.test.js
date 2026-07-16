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

  it("has a TTL index that lets MongoDB auto-prune sessions at expiresAt, so the collection doesn't grow unbounded", () => {
    const indexes = AuthSession.schema.indexes();
    const ttlIndex = indexes.find(([fields]) => Object.keys(fields).length === 1 && fields.expiresAt === 1);

    assert.ok(ttlIndex, "expected a dedicated single-field index on expiresAt");
    const [, options] = ttlIndex;
    assert.equal(options.expireAfterSeconds, 0);
  });
});
