import mongoose from "mongoose";

const moverVerificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
    },
    businessEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    businessPhone: {
      type: String,
      required: true,
      trim: true,
    },
    officeAddress: {
      type: String,
      required: true,
      trim: true,
    },
    documents: [
      {
        type: {
          type: String,
          enum: ["business_registration", "tax_certificate", "license", "other"],
          default: "other",
        },
        url: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
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
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const MoverVerification = mongoose.model("MoverVerification", moverVerificationSchema);

export default MoverVerification;
