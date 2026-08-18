import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAllowedCorsOrigin } from "../../config/cors.js";

describe("cors config", () => {
  it("allows local frontend dev server fallback ports outside production", () => {
    assert.equal(isAllowedCorsOrigin("http://localhost:5174"), true);
    assert.equal(isAllowedCorsOrigin("http://127.0.0.1:5175"), true);
  });

  it("fails closed in production when CORS_ORIGIN is unset, instead of wildcarding every origin", () => {
    const overrides = { nodeEnv: "production", corsOrigins: [] };
    assert.equal(isAllowedCorsOrigin("https://evil.example.com", overrides), false);
    assert.equal(isAllowedCorsOrigin("http://localhost:5174", overrides), false);
  });

  it("stays permissive outside production when CORS_ORIGIN is unset", () => {
    const overrides = { nodeEnv: "development", corsOrigins: [] };
    assert.equal(isAllowedCorsOrigin("https://anything.example.com", overrides), true);
  });

  it("still honors an explicit CORS_ORIGIN allowlist in production", () => {
    const overrides = { nodeEnv: "production", corsOrigins: ["https://jakezapp.example.com"] };
    assert.equal(isAllowedCorsOrigin("https://jakezapp.example.com", overrides), true);
    assert.equal(isAllowedCorsOrigin("https://evil.example.com", overrides), false);
  });
});
