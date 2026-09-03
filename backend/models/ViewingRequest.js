import mongoose from "mongoose";

const viewingStatuses = ["pending", "approved", "rejected", "cancelled", "completed"];
const activeViewingStatuses = ["pending", "approved"];

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

// Backs the "one active request per tenant per property" rule at the
// database level (partial - only active statuses count), so two
// near-simultaneous createViewingRequest calls (e.g. a double-tap) can't
// both pass the pre-create findOne check and each insert a document - the
// second one now fails the unique constraint instead of silently
// duplicating. Not a plain unique index because a tenant legitimately can
// have multiple past (rejected/cancelled/completed) requests for the same
// property over time.
viewingRequestSchema.index(
  { property: 1, requester: 1 },
  { unique: true, partialFilterExpression: { status: { $in: activeViewingStatuses } } }
);

const ViewingRequest = mongoose.model("ViewingRequest", viewingRequestSchema);

export { activeViewingStatuses, viewingStatuses };
export default ViewingRequest;
