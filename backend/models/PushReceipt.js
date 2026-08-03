import mongoose from "mongoose";

// Bridges a send-time Expo ticket id to the later receipt-polling job
// (backend/jobs/pollExpoPushReceipts.js) - Expo's ticket response only
// confirms the push was queued, not whether the device actually received
// it, so the ticket id has to be persisted until a receipt is checked.
const pushReceiptSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// pollExpoPushReceipts.js's only two queries against this model both filter
// or sort on createdAt alone (find({}).sort("createdAt") and a deleteMany
// createdAt range) - without this, both are a full collection scan on every
// 15-minute run.
pushReceiptSchema.index({ createdAt: 1 });

const PushReceipt = mongoose.model("PushReceipt", pushReceiptSchema);

export default PushReceipt;
