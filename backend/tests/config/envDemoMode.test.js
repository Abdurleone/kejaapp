import assert from "node:assert/strict";
import { describe, it } from "node:test";

// DEMO_MODE/DEMO_RESET_SECRET must be set before config/env.js is first
// imported (by the dynamic import below), since env.js reads process.env
// once at module load - same convention as envAuthCookieSameSite.test.js.
process.env.DEMO_MODE = "true";
process.env.DEMO_RESET_SECRET = "test-demo-secret";

describe("env config (DEMO_MODE / DEMO_RESET_SECRET)", () => {
  it("parses DEMO_MODE as a boolean and passes through DEMO_RESET_SECRET", async () => {
    const { default: env } = await import("../../config/env.js");

    assert.equal(env.demoMode, true);
    assert.equal(env.demoResetSecret, "test-demo-secret");
  });
});
