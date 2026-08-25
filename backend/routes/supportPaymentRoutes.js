import express from "express";
import {
  getSupportPaymentStatus,
  handleMpesaCallback,
  initiateSupportPayment,
} from "../controllers/supportPaymentController.js";
import env from "../config/env.js";
import { protect } from "../middlewares/authMiddleware.js";
import { createRateLimiter } from "../middlewares/rateLimiter.js";
import validateRequest from "../middlewares/validateRequest.js";
import { initiateSupportPaymentSchema } from "../validators/supportPaymentValidators.js";

const router = express.Router();

// Deliberately tighter than the app-wide default (env.rateLimitMax) - each
// call triggers a real STK push, a PIN prompt on someone's actual phone, not
// just a read. Keyed by IP the same way every other limiter here is; a
// signed-in-only alternative (keyed by user id) wasn't worth the extra
// surface for a low-traffic, opt-in feature.
const initiateSupportPaymentRateLimiter = createRateLimiter({
  name: "support-payment-initiate",
  windowMs: env.rateLimitWindowMs,
  max: 5,
});

router.post(
  "/",
  protect,
  initiateSupportPaymentRateLimiter,
  validateRequest(initiateSupportPaymentSchema),
  initiateSupportPayment
);
router.get("/:id", protect, getSupportPaymentStatus);
// No protect/CSRF here on purpose - Safaricom's servers call this directly,
// carrying none of our own auth/CSRF cookies. csrfProtection.js (mounted
// globally on /api) already lets a cookie-less request through unblocked;
// this route's real defense is the :secret path segment, checked in
// handleMpesaCallback against MPESA_CALLBACK_SECRET - never exposed to any
// client, unlike CheckoutRequestID (returned to the paying user themselves in
// initiateSupportPayment's response, so it can't double as an auth check).
router.post("/callback/:secret", handleMpesaCallback);

export default router;
