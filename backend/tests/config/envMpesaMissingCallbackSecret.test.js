import assert from "node:assert/strict";
import { describe, it } from "node:test";

// All other MPESA_* vars set, but no MPESA_CALLBACK_SECRET - env.js should
// fail loudly at boot rather than silently accepting Safaricom STK callbacks
// with no way to verify they actually came from Safaricom. Separate file
// since env.js reads process.env once at module load, mirroring
// envMpesaInvalidCallbackUrl.test.js's pattern.
process.env.MPESA_CONSUMER_KEY = "test-consumer-key";
process.env.MPESA_CONSUMER_SECRET = "test-consumer-secret";
process.env.MPESA_SHORTCODE = "174379";
process.env.MPESA_PASSKEY = "test-passkey";
process.env.MPESA_CALLBACK_URL = "https://example.com/api/support-payments/callback/some-secret";

describe("env config (missing MPESA_CALLBACK_SECRET)", () => {
  it("rejects the rest of the MPESA_* config once set without a callback secret", async () => {
    await assert.rejects(() => import("../../config/env.js"), {
      message: "MPESA_CALLBACK_SECRET is required once the other MPESA_* variables are set",
    });
  });
});
