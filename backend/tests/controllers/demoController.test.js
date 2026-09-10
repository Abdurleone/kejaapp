import assert from "node:assert/strict";
import { describe, it } from "node:test";

// DEMO_MODE/DEMO_RESET_SECRET must be set before demoController.js (and, via
// it, config/env.js) is first imported - env.js reads process.env once at
// module load, same convention used throughout backend/tests/config/.
process.env.DEMO_MODE = "true";
process.env.DEMO_RESET_SECRET = "correct-secret";

const { triggerDemoReset } = await import("../../controllers/demoController.js");

const createResponse = () => ({
  body: null,
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

// The success path (correct secret -> drops and reseeds the database) is
// deliberately not unit-tested here: performDemoReset() calls runSeed(),
// which does real Mongoose model writes across 8 models and needs an actual
// database connection to complete - mocking every model's statics
// individually would be disproportionate, and this repo's mock.method shim
// can't cleanly stub a sibling module's named export (an ES module
// namespace binding, non-configurable). The reseed logic itself is already
// covered by seedDemoData.test.js's fixture assertions; an opt-in
// integration-test addition covering the full drop+reseed against a real
// TEST_MONGODB_URI is a reasonable follow-up, not required for this change.
describe("demoController.triggerDemoReset (DEMO_MODE true)", () => {
  it("rejects a wrong secret with 404", async () => {
    const req = { params: { secret: "wrong" } };
    const res = createResponse();
    let nextError;

    await triggerDemoReset(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
  });

  it("rejects a missing secret with 404", async () => {
    const req = { params: {} };
    const res = createResponse();
    let nextError;

    await triggerDemoReset(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
  });
});
