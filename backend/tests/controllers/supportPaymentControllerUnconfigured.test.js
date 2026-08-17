import assert from "node:assert/strict";
import mongoose from "mongoose";
import { describe, it } from "node:test";

// MPESA_* deliberately left unset (empty = disabled, see config/env.js's
// mpesaEnabled comment) - a separate file from supportPaymentController.test.js
// since env.js reads process.env once at module load, mirroring
// backupStorageServiceUnconfigured.test.js's pattern.
const { initiateSupportPayment } = await import("../../controllers/supportPaymentController.js");

describe("supportPaymentController (unconfigured)", () => {
  it("initiateSupportPayment 503s instead of calling Daraja with empty credentials", async () => {
    const req = { body: { phoneNumber: "0712345678", amount: 100 }, user: { _id: new mongoose.Types.ObjectId() } };
    const res = {
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
    };
    let nextError;

    await initiateSupportPayment(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 503);
    assert.equal(nextError.message, "M-Pesa support payments are not configured");
  });
});
