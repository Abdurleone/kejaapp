import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";

// MPESA_* must be set before config/env.js is first imported (by the dynamic
// imports below), since env.js reads process.env once at module load - same
// constraint as the S3/backup-S3 config tests. A separate, unconfigured file
// (supportPaymentControllerUnconfigured.test.js) covers the disabled path.
process.env.MPESA_CONSUMER_KEY = "test-consumer-key";
process.env.MPESA_CONSUMER_SECRET = "test-consumer-secret";
process.env.MPESA_SHORTCODE = "174379";
process.env.MPESA_PASSKEY = "test-passkey";
process.env.MPESA_CALLBACK_URL = "https://example.com/api/support-payments/callback";

const { getSupportPaymentStatus, handleMpesaCallback, initiateSupportPayment } = await import(
  "../../controllers/supportPaymentController.js"
);
const { default: SupportPayment } = await import("../../models/SupportPayment.js");

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

const mockStkPushSuccess = () =>
  mock.method(globalThis, "fetch", async (url) => {
    if (String(url).includes("/oauth/v1/generate")) {
      return { ok: true, status: 200, json: async () => ({ access_token: "token-1", expires_in: "3599" }) };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        MerchantRequestID: "merchant-1",
        CheckoutRequestID: "checkout-1",
        ResponseCode: "0",
        ResponseDescription: "Success. Request accepted for processing",
      }),
    };
  });

describe("supportPaymentController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("initiateSupportPayment normalizes the phone, calls Daraja, and records a pending payment", async () => {
    mockStkPushSuccess();
    const userId = new mongoose.Types.ObjectId();
    let createPayload;
    mock.method(SupportPayment, "create", async (payload) => {
      createPayload = payload;
      return { _id: new mongoose.Types.ObjectId(), status: "pending", checkoutRequestId: payload.checkoutRequestId };
    });

    const req = { body: { phoneNumber: "0712345678", amount: 100 }, user: { _id: userId } };
    const res = createResponse();
    let nextError;

    await initiateSupportPayment(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError, undefined);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.status, "pending");
    assert.equal(res.body.data.checkoutRequestId, "checkout-1");
    assert.equal(createPayload.phoneNumber, "254712345678");
    assert.equal(createPayload.user, userId);
    assert.equal(createPayload.merchantRequestId, "merchant-1");
    assert.equal(createPayload.checkoutRequestId, "checkout-1");
  });

  it("initiateSupportPayment forwards a Daraja failure instead of creating a record", async () => {
    mock.method(globalThis, "fetch", async (url) => {
      if (String(url).includes("/oauth/v1/generate")) {
        return { ok: true, status: 200, json: async () => ({ access_token: "token-1", expires_in: "3599" }) };
      }

      return { ok: true, status: 200, json: async () => ({ ResponseCode: "1", errorMessage: "Invalid PartyA" }) };
    });
    const create = mock.method(SupportPayment, "create", async () => {
      throw new Error("should not be called");
    });

    const req = { body: { phoneNumber: "0712345678", amount: 100 }, user: { _id: new mongoose.Types.ObjectId() } };
    const res = createResponse();
    let nextError;

    await initiateSupportPayment(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.message, "Invalid PartyA");
    assert.equal(create.mock.callCount(), 0);
  });

  it("getSupportPaymentStatus returns the caller's own payment", async () => {
    const userId = new mongoose.Types.ObjectId();
    const paymentId = new mongoose.Types.ObjectId();
    mock.method(SupportPayment, "findById", async () => ({
      _id: paymentId,
      user: userId,
      status: "completed",
      resultDesc: "The service request is processed successfully.",
      mpesaReceiptNumber: "NLJ7RT61SV",
    }));

    const req = { params: { id: paymentId.toString() }, user: { _id: userId } };
    const res = createResponse();
    let nextError;

    await getSupportPaymentStatus(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError, undefined);
    assert.equal(res.body.data.status, "completed");
    assert.equal(res.body.data.mpesaReceiptNumber, "NLJ7RT61SV");
  });

  it("getSupportPaymentStatus 404s for another user's payment", async () => {
    const paymentId = new mongoose.Types.ObjectId();
    mock.method(SupportPayment, "findById", async () => ({
      _id: paymentId,
      user: new mongoose.Types.ObjectId(),
      status: "pending",
    }));

    const req = { params: { id: paymentId.toString() }, user: { _id: new mongoose.Types.ObjectId() } };
    const res = createResponse();
    let nextError;

    await getSupportPaymentStatus(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
  });

  it("getSupportPaymentStatus 404s for a nonexistent payment", async () => {
    mock.method(SupportPayment, "findById", async () => null);

    const req = { params: { id: new mongoose.Types.ObjectId().toString() }, user: { _id: new mongoose.Types.ObjectId() } };
    const res = createResponse();
    let nextError;

    await getSupportPaymentStatus(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
  });

  it("handleMpesaCallback marks a successful payment completed with its receipt number", async () => {
    const payment = { status: "pending", resultCode: null, resultDesc: "", mpesaReceiptNumber: "", save: async () => {} };
    const save = mock.method(payment, "save", async () => {});
    mock.method(SupportPayment, "findOne", async () => payment);

    const req = {
      body: {
        Body: {
          stkCallback: {
            MerchantRequestID: "merchant-1",
            CheckoutRequestID: "checkout-1",
            ResultCode: 0,
            ResultDesc: "The service request is processed successfully.",
            CallbackMetadata: {
              Item: [
                { Name: "Amount", Value: 100 },
                { Name: "MpesaReceiptNumber", Value: "NLJ7RT61SV" },
                { Name: "TransactionDate", Value: 20260817102115 },
                { Name: "PhoneNumber", Value: 254712345678 },
              ],
            },
          },
        },
      },
    };
    const res = createResponse();

    await handleMpesaCallback(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ResultCode: 0, ResultDesc: "Accepted" });
    assert.equal(payment.status, "completed");
    assert.equal(payment.mpesaReceiptNumber, "NLJ7RT61SV");
    assert.equal(save.mock.callCount(), 1);
  });

  it("handleMpesaCallback marks a user-cancelled prompt as cancelled, not failed", async () => {
    const payment = { status: "pending", save: async () => {} };
    mock.method(SupportPayment, "findOne", async () => payment);

    const req = {
      body: {
        Body: {
          stkCallback: {
            CheckoutRequestID: "checkout-1",
            ResultCode: 1032,
            ResultDesc: "Request cancelled by user",
          },
        },
      },
    };
    const res = createResponse();

    await handleMpesaCallback(req, res, () => {});

    assert.equal(payment.status, "cancelled");
    assert.equal(res.statusCode, 200);
  });

  it("handleMpesaCallback marks any other nonzero ResultCode as failed", async () => {
    const payment = { status: "pending", save: async () => {} };
    mock.method(SupportPayment, "findOne", async () => payment);

    const req = {
      body: { Body: { stkCallback: { CheckoutRequestID: "checkout-1", ResultCode: 1, ResultDesc: "Insufficient funds" } } },
    };
    const res = createResponse();

    await handleMpesaCallback(req, res, () => {});

    assert.equal(payment.status, "failed");
  });

  it("handleMpesaCallback is idempotent - a retried callback doesn't reprocess an already-final payment", async () => {
    const payment = { status: "completed", resultCode: 0, mpesaReceiptNumber: "NLJ7RT61SV", save: async () => {} };
    const save = mock.method(payment, "save", async () => {});
    mock.method(SupportPayment, "findOne", async () => payment);

    const req = {
      body: { Body: { stkCallback: { CheckoutRequestID: "checkout-1", ResultCode: 0, ResultDesc: "duplicate" } } },
    };
    const res = createResponse();

    await handleMpesaCallback(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(save.mock.callCount(), 0);
  });

  it("handleMpesaCallback acks 200 for an unknown CheckoutRequestID rather than erroring", async () => {
    mock.method(SupportPayment, "findOne", async () => null);

    const req = { body: { Body: { stkCallback: { CheckoutRequestID: "unknown", ResultCode: 0 } } } };
    const res = createResponse();

    await handleMpesaCallback(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ResultCode: 0, ResultDesc: "Accepted" });
  });

  it("handleMpesaCallback acks 200 for a malformed payload rather than erroring", async () => {
    const req = { body: { unexpected: "shape" } };
    const res = createResponse();

    await handleMpesaCallback(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ResultCode: 0, ResultDesc: "Accepted" });
  });
});
