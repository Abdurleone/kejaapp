import mongoose from "mongoose";

const violationTypes = ["duplicate_property_image"];
const violationSeverities = ["low", "medium", "high"];
const violationStatuses = ["open", "reviewed", "dismissed"];

const userViolationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: violationTypes,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: violationSeverities,
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: violationStatuses,
      default: "open",
      index: true,
    },
    evidence: {
      property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
      },
      imageFingerprint: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PropertyImageFingerprint",
      },
      matchedProperty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
      },
      matchedImageFingerprint: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PropertyImageFingerprint",
      },
      imageUrl: String,
      exactHash: String,
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
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

userViolationSchema.index({ user: 1, type: 1, status: 1, createdAt: -1 });

const UserViolation = mongoose.model("UserViolation", userViolationSchema);

export { violationSeverities, violationStatuses, violationTypes };
export default UserViolation;
