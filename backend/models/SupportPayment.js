import mongoose from "mongoose";

// pending: STK push accepted by Daraja, waiting on the user's phone.
// completed/failed/cancelled: final states set by the callback (cancelled
// covers the user dismissing the PIN prompt or letting it time out - Daraja
// reports that as a specific non-zero ResultCode, not an error).
const supportPaymentStatuses = ["pending", "completed", "failed", "cancelled"];

const supportPaymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: supportPaymentStatuses,
      default: "pending",
      index: true,
    },
    merchantRequestId: {
      type: String,
      required: true,
    },
    // Daraja's own correlation id for this specific STK push - how the
    // callback (which carries no reference back to our user/session) finds
    // its way back to this record. Unique since Safaricom generates it fresh
    // per request, but indexed rather than relied on as the primary lookup
    // key everywhere, in case a retry ever needs to reuse one.
    checkoutRequestId: {
      type: String,
      required: true,
      unique: true,
    },
    resultCode: {
      type: Number,
      default: null,
    },
    resultDesc: {
      type: String,
      default: "",
    },
    mpesaReceiptNumber: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

supportPaymentSchema.index({ user: 1, createdAt: -1 });

const SupportPayment = mongoose.model("SupportPayment", supportPaymentSchema);

export { supportPaymentStatuses };
export default SupportPayment;
