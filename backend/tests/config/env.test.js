import assert from "node:assert/strict";
import { describe, it } from "node:test";
import env from "../../config/env.js";

describe("env config", () => {
  it("uses the kejaapp database when Mongo URI has no database path", () => {
    assert.equal(env.mongoDbName, "kejaapp");
    assert.match(env.mongoUri, /\/kejaapp(?:\?|$)/);
  });

  it("uses the default JWT expiry", () => {
    assert.equal(env.jwtExpiresIn, "7d");
  });

  it("uses default Mongo connection retry settings", () => {
    assert.equal(env.mongoConnectRetries, 5);
    assert.equal(env.mongoConnectRetryDelayMs, 3000);
  });
});
