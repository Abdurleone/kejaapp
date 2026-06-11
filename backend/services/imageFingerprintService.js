import crypto from "node:crypto";
import PropertyImageFingerprint from "../models/PropertyImageFingerprint.js";
import UserViolation from "../models/UserViolation.js";

const normalizeImageUrl = (value) => {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();

  return url.toString();
};

const createExactHash = (value) => crypto.createHash("sha256").update(value).digest("hex");

const fingerprintPropertyImage = async ({ image, property, uploadedBy }) => {
  const normalizedImageUrl = normalizeImageUrl(image.url);
  const exactHash = createExactHash(normalizedImageUrl);
  const existingFingerprint = await PropertyImageFingerprint.findOne({
    exactHash,
    uploadedBy: { $ne: uploadedBy },
  });

  const status = existingFingerprint ? "suspicious" : "clear";
  const fingerprint = await PropertyImageFingerprint.findOneAndUpdate(
    {
      property: property._id,
      imageId: image._id,
    },
    {
      property: property._id,
      imageId: image._id,
      uploadedBy,
      imageUrl: image.url,
      normalizedImageUrl,
      exactHash,
      status,
      matchedFingerprint: existingFingerprint?._id || null,
      matchedProperty: existingFingerprint?.property || null,
      matchedUploadedBy: existingFingerprint?.uploadedBy || null,
    },
    {
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    }
  );

  if (!existingFingerprint) {
    return {
      fingerprint,
      violation: null,
    };
  }

  const violation = await UserViolation.findOneAndUpdate(
    {
      user: uploadedBy,
      type: "duplicate_property_image",
      "evidence.imageFingerprint": fingerprint._id,
      "evidence.matchedImageFingerprint": existingFingerprint._id,
    },
    {
      user: uploadedBy,
      type: "duplicate_property_image",
      severity: "medium",
      status: "open",
      evidence: {
        property: property._id,
        imageFingerprint: fingerprint._id,
        matchedProperty: existingFingerprint.property,
        matchedImageFingerprint: existingFingerprint._id,
        imageUrl: image.url,
        exactHash,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    }
  );

  return {
    fingerprint,
    violation,
  };
};

const removePropertyImageFingerprint = ({ imageId, propertyId }) =>
  PropertyImageFingerprint.deleteMany({
    property: propertyId,
    imageId,
  });

export {
  createExactHash,
  fingerprintPropertyImage,
  normalizeImageUrl,
  removePropertyImageFingerprint,
};
