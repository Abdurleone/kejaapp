import assert from "node:assert/strict";
import { describe, it } from "node:test";

// These must be set before config/env.js is first imported (by the dynamic
// import below), since env.js reads process.env once at module load.
process.env.STALE_NUDGE_THRESHOLD_HOURS = "72";
process.env.STALE_LISTING_FRESHNESS_DAYS = "30";
process.env.OPEN_VIEWING_COMPLETION_DELAY_HOURS = "24";

describe("env config (job threshold overrides)", () => {
  it("honors overridden hour/day thresholds, converted to ms", async () => {
    const { default: env } = await import("../../config/env.js");

    assert.equal(env.staleNudgeThresholdMs, 72 * 60 * 60 * 1000);
    assert.equal(env.staleListingFreshnessMs, 30 * 24 * 60 * 60 * 1000);
    assert.equal(env.openViewingCompletionDelayMs, 24 * 60 * 60 * 1000);
  });
});
