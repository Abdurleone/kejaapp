import mongoose from "mongoose";

const viewingStatuses = ["pending", "approved", "rejected", "cancelled", "completed"];

const viewingRequestSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    requestedDate: {
      type: Date,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: viewingStatuses,
      default: "pending",
      index: true,
    },
    decisionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    nudgedAt: {
      type: Date,
      default: null,
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
    reviewPromptSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

viewingRequestSchema.index({ property: 1, requester: 1, status: 1 });
viewingRequestSchema.index({ owner: 1, status: 1, requestedDate: 1 });

const ViewingRequest = mongoose.model("ViewingRequest", viewingRequestSchema);

export { viewingStatuses };
export default ViewingRequest;
