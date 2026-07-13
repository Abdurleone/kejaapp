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

const PushReceipt = mongoose.model("PushReceipt", pushReceiptSchema);

export default PushReceipt;
