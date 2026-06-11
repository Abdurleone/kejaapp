import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAllowedCorsOrigin } from "../../config/cors.js";

describe("cors config", () => {
  it("allows local frontend dev server fallback ports outside production", () => {
    assert.equal(isAllowedCorsOrigin("http://localhost:5174"), true);
    assert.equal(isAllowedCorsOrigin("http://127.0.0.1:5175"), true);
  });
});
