import crypto from "node:crypto";
import env from "../config/env.js";
import httpStatus from "../constants/httpStatus.js";
import SupportPayment from "../models/SupportPayment.js";
import { initiateStkPush } from "../services/mpesaService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { logError, logWarn } from "../utils/logger.js";
import { normalizeKenyanPhone } from "../utils/phone.js";

// timingSafeEqual throws on a length mismatch rather than returning false -
// guard that first (an actual secret's length isn't itself sensitive here).
const secretsMatch = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));

  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const initiateSupportPayment = asyncHandler(async (req, res) => {
  if (!env.mpesaEnabled) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, "M-Pesa support payments are not configured");
  }

  const phoneNumber = normalizeKenyanPhone(req.body.phoneNumber);

  // Already validated by the schema, but normalizeKenyanPhone is the source
  // of truth for the actual Daraja-required shape - re-deriving it here
  // rather than trusting a client-sent "normalized" value keeps that one
  // function the only place this logic lives.
  if (!phoneNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, "phoneNumber must be a valid Kenyan phone number");
  }

  const stkResponse = await initiateStkPush({
    phoneNumber,
    amount: req.body.amount,
    transactionDesc: "KejaApp Support",
  });

  const payment = await SupportPayment.create({
    user: req.user._id,
    phoneNumber,
    amount: req.body.amount,
    merchantRequestId: stkResponse.MerchantRequestID,
    checkoutRequestId: stkResponse.CheckoutRequestID,
  });

  res.status(httpStatus.CREATED).json({
    data: {
      _id: payment._id,
      status: payment.status,
      checkoutRequestId: payment.checkoutRequestId,
    },
  });
});

const getSupportPaymentStatus = asyncHandler(async (req, res) => {
  const payment = await SupportPayment.findById(req.params.id);

  if (!payment || payment.user.toString() !== req.user._id.toString()) {
    throw new ApiError(httpStatus.NOT_FOUND, "Support payment not found");
  }

  res.status(httpStatus.OK).json({
    data: {
      _id: payment._id,
      status: payment.status,
      resultDesc: payment.resultDesc,
      mpesaReceiptNumber: payment.mpesaReceiptNumber,
    },
  });
});

// Safaricom, not our own frontend, calls this - no auth header, no CSRF
// pair, and it must always respond 200 with this exact {ResultCode,
// ResultDesc} shape (Daraja's own ack contract) or Safaricom will retry the
// callback on a schedule of its own. That's also why every failure path
// below still resolves 200 rather than throwing through the normal
// ApiError/errorHandler flow - a malformed or unrecognized payload is
// Safaricom's problem to not resend, not a reason to trigger their retry
// logic further.
const mpesaAck = (res) => res.status(httpStatus.OK).json({ ResultCode: 0, ResultDesc: "Accepted" });

const handleMpesaCallback = asyncHandler(async (req, res) => {
  if (!env.mpesaCallbackSecret || !secretsMatch(req.params.secret, env.mpesaCallbackSecret)) {
    logWarn("M-Pesa callback rejected: path secret missing or didn't match MPESA_CALLBACK_SECRET");
    return mpesaAck(res);
  }

  const stkCallback = req.body?.Body?.stkCallback;

  if (!stkCallback?.CheckoutRequestID) {
    logWarn(`M-Pesa callback missing CheckoutRequestID: ${JSON.stringify(req.body)}`);
    return mpesaAck(res);
  }

  const payment = await SupportPayment.findOne({ checkoutRequestId: stkCallback.CheckoutRequestID });

  if (!payment) {
    logWarn(`M-Pesa callback for unknown CheckoutRequestID: ${stkCallback.CheckoutRequestID}`);
    return mpesaAck(res);
  }

  // Idempotent: Safaricom can and does retry a callback that wasn't acked
  // fast enough, even after this handler already processed it once.
  if (payment.status !== "pending") {
    return mpesaAck(res);
  }

  payment.resultCode = stkCallback.ResultCode;
  payment.resultDesc = stkCallback.ResultDesc || "";

  if (stkCallback.ResultCode === 0) {
    const items = stkCallback.CallbackMetadata?.Item || [];
    const findItem = (name) => items.find((item) => item.Name === name)?.Value;

    payment.status = "completed";
    payment.mpesaReceiptNumber = findItem("MpesaReceiptNumber") || "";
  } else if (stkCallback.ResultCode === 1032) {
    // Daraja's specific code for "user cancelled/dismissed the PIN prompt" -
    // worth distinguishing from a genuine failure for anyone reading this
    // record later (e.g. a support conversation about "why didn't my
    // payment go through").
    payment.status = "cancelled";
  } else {
    payment.status = "failed";
    logError(`M-Pesa payment ${payment._id} failed: ${stkCallback.ResultDesc}`);
  }

  await payment.save();

  return mpesaAck(res);
});

export { getSupportPaymentStatus, handleMpesaCallback, initiateSupportPayment };
