import mongoose from "mongoose";

const moverRequestStatuses = ["pending", "accepted", "declined", "cancelled", "completed"];

const moverRequestSchema = new mongoose.Schema(
  {
    mover: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mover",
      required: true,
      index: true,
    },
    moverAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      default: null,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    preferredDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: moverRequestStatuses,
      default: "pending",
      index: true,
    },
    response: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    nudgedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

moverRequestSchema.index({ tenant: 1, status: 1, createdAt: -1 });
moverRequestSchema.index({ moverAccount: 1, status: 1, createdAt: -1 });

const MoverRequest = mongoose.model("MoverRequest", moverRequestSchema);

export { moverRequestStatuses };
export default MoverRequest;
