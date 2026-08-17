import assert from "node:assert/strict";
import { describe, it } from "node:test";

// MPESA_CALLBACK_URL must be set before config/env.js is first imported (by
// the dynamic import below), since env.js reads process.env once at module
// load - mirrors envS3InvalidEndpoint.test.js's pattern. Safaricom's servers
// need a real, reachable URL to POST the payment result to, so a malformed
// value here is exactly the kind of mistake that's already bitten this
// project once with S3_ENDPOINT - failing loudly at boot instead of only
// once the first real STK push's callback tries (and fails) to arrive.
process.env.MPESA_CALLBACK_URL = "example.com/api/support-payments/callback";

describe("env config (malformed MPESA_CALLBACK_URL)", () => {
  it("rejects an MPESA_CALLBACK_URL that isn't a valid URL", async () => {
    await assert.rejects(() => import("../../config/env.js"), {
      message: 'MPESA_CALLBACK_URL must be a valid URL (e.g. https://...), got "example.com/api/support-payments/callback"',
    });
  });
});
