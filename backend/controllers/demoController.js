import crypto from "node:crypto";
import env from "../config/env.js";
import httpStatus from "../constants/httpStatus.js";
import { performDemoReset } from "../services/demoResetService.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { logInfo, logWarn } from "../utils/logger.js";

// Identical to supportPaymentController.js's secretsMatch - timingSafeEqual
// throws on a length mismatch, so the length check must come first.
const secretsMatch = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));

  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

// Defense in depth beyond the secret check alone: if DEMO_MODE isn't true on
// this environment (i.e. this is production), this route 404s exactly like
// any other unmatched path - it shouldn't even appear to exist. Checked
// before the secret comparison so a leaked/guessed secret against
// production still gets a plain 404, not a "wrong secret" signal.
const triggerDemoReset = asyncHandler(async (req, res) => {
  if (!env.demoMode) {
    throw new ApiError(httpStatus.NOT_FOUND, "Not found");
  }

  if (!env.demoResetSecret || !secretsMatch(req.params.secret, env.demoResetSecret)) {
    logWarn("Demo reset rejected: path secret missing or didn't match DEMO_RESET_SECRET");
    throw new ApiError(httpStatus.NOT_FOUND, "Not found");
  }

  await performDemoReset();
  logInfo("Demo database reset and reseeded via HTTP trigger");

  res.status(httpStatus.OK).json({ data: { message: "Demo data reset" } });
});

export { triggerDemoReset };
