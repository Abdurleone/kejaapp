import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "node:test";
import PropertyImageFingerprint from "../../models/PropertyImageFingerprint.js";
import UserViolation from "../../models/UserViolation.js";
import {
  createExactHash,
  fingerprintPropertyImage,
  normalizeImageUrl,
} from "../../services/imageFingerprintService.js";

describe("imageFingerprintService", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("normalizes image URLs before hashing", () => {
    assert.equal(
      normalizeImageUrl("https://EXAMPLE.com/property.jpg#living-room"),
      "https://example.com/property.jpg"
    );
    assert.equal(createExactHash("a").length, 64);
  });

  it("marks first-seen image fingerprints as clear", async () => {
    const fingerprint = { _id: new mongoose.Types.ObjectId(), status: "clear" };
    mock.method(PropertyImageFingerprint, "findOne", async () => null);
    mock.method(PropertyImageFingerprint, "findOneAndUpdate", async () => fingerprint);

    const result = await fingerprintPropertyImage({
      image: {
        _id: new mongoose.Types.ObjectId(),
        url: "https://example.com/property.jpg",
      },
      property: {
        _id: new mongoose.Types.ObjectId(),
      },
      uploadedBy: new mongoose.Types.ObjectId(),
    });

    assert.equal(result.fingerprint.status, "clear");
    assert.equal(result.violation, null);
  });

  it("creates a violation for duplicate image fingerprints from another user", async () => {
    const existingFingerprint = {
      _id: new mongoose.Types.ObjectId(),
      property: new mongoose.Types.ObjectId(),
      uploadedBy: new mongoose.Types.ObjectId(),
    };
    const fingerprint = { _id: new mongoose.Types.ObjectId(), status: "suspicious" };
    const violation = { _id: new mongoose.Types.ObjectId(), status: "open" };
    mock.method(PropertyImageFingerprint, "findOne", async () => existingFingerprint);
    mock.method(PropertyImageFingerprint, "findOneAndUpdate", async () => fingerprint);
    mock.method(UserViolation, "findOneAndUpdate", async () => violation);

    const result = await fingerprintPropertyImage({
      image: {
        _id: new mongoose.Types.ObjectId(),
        url: "https://example.com/property.jpg",
      },
      property: {
        _id: new mongoose.Types.ObjectId(),
      },
      uploadedBy: new mongoose.Types.ObjectId(),
    });

    assert.equal(result.fingerprint.status, "suspicious");
    assert.equal(result.violation.status, "open");
  });
});
