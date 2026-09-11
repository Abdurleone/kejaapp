import assert from "node:assert/strict";
import { describe, it } from "node:test";

// DEMO_MODE deliberately NOT set here - proves the production-shaped
// default (false) 404s outright, before even checking the secret. Needs its
// own file since env.js reads process.env once at module load, same reason
// envMpesaMissingCallbackSecret.test.js is separate from env.test.js.
const { triggerDemoReset } = await import("../../controllers/demoController.js");

describe("demoController.triggerDemoReset (DEMO_MODE unset)", () => {
  it("404s regardless of the secret when demoMode is false", async () => {
    const req = { params: { secret: "anything" } };
    const res = {
      status() {
        return this;
      },
      json() {},
    };
    let nextError;

    await triggerDemoReset(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
  });
});
