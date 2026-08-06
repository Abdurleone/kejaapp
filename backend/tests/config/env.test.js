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

  it("uses default refresh token settings", () => {
    assert.equal(env.refreshTokenMaxAge, 30 * 24 * 60 * 60 * 1000);
    assert.equal(env.refreshCookieName, "keja_refresh");
  });

  it("uses the default bcrypt salt rounds", () => {
    assert.equal(env.bcryptSaltRounds, 12);
  });

  it("uses default Mongo connection retry settings", () => {
    assert.equal(env.mongoConnectRetries, 5);
    assert.equal(env.mongoConnectRetryDelayMs, 3000);
  });

  it("does not trust reverse proxies by default", () => {
    assert.equal(env.trustProxy, false);
  });

  it("does not require MongoDB during local test startup by default", () => {
    assert.equal(env.dbRequired, false);
  });

  it("uses default rate limit settings", () => {
    assert.equal(env.rateLimitWindowMs, 900000);
    assert.equal(env.rateLimitMax, 500);
    assert.equal(env.authRateLimitMax, 50);
  });

  it("uses default upload settings", () => {
    assert.match(env.uploadDir, /uploads$/);
    assert.equal(env.uploadPublicBaseUrl, "");
    assert.equal(env.maxUploadBytes, 5 * 1024 * 1024);
  });

  it("defaults to the local storage driver", () => {
    assert.equal(env.storageDriver, "local");
  });

  it("disables Sentry reporting by default", () => {
    assert.equal(env.sentryDsn, "");
  });

  it("uses default scheduled-job thresholds", () => {
    assert.equal(env.staleNudgeThresholdMs, 48 * 60 * 60 * 1000);
    assert.equal(env.viewingReminderWindowMs, 24 * 60 * 60 * 1000);
    assert.equal(env.staleListingFreshnessMs, 14 * 24 * 60 * 60 * 1000);
    assert.equal(env.reviewPromptLookbackMs, 14 * 24 * 60 * 60 * 1000);
  });
});

