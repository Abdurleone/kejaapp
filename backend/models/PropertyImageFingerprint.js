import mongoose from "mongoose";

const fingerprintStatuses = ["clear", "suspicious", "confirmed_violation"];

const propertyImageFingerprintSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    imageId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedImageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    exactHash: {
      type: String,
      required: true,
      index: true,
    },
    perceptualHash: {
      type: String,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: fingerprintStatuses,
      default: "clear",
      index: true,
    },
    matchedFingerprint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PropertyImageFingerprint",
      default: null,
    },
    matchedProperty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      default: null,
    },
    matchedUploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

propertyImageFingerprintSchema.index({ property: 1, imageId: 1 }, { unique: true });
propertyImageFingerprintSchema.index({ uploadedBy: 1, status: 1, createdAt: -1 });

const PropertyImageFingerprint = mongoose.model(
  "PropertyImageFingerprint",
  propertyImageFingerprintSchema
);

export { fingerprintStatuses };
export default PropertyImageFingerprint;
