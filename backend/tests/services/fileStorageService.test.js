import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { describe, it } from "node:test";
import mongoose from "mongoose";
import {
  createBytePerceptualHash,
  decodeImagePayload,
  deletePropertyImage,
  sanitizeFileName,
  storePropertyImage,
} from "../../services/fileStorageService.js";

describe("fileStorageService", () => {
  it("sanitizes uploaded file names", () => {
    assert.equal(sanitizeFileName("Living Room!.JPG"), "living-room-.jpg");
  });

  it("decodes base64 image payloads", () => {
    const buffer = decodeImagePayload({
      mimeType: "image/png",
      data: Buffer.from("image-bytes").toString("base64"),
    });

    assert.equal(buffer.toString(), "image-bytes");
  });

  it("rejects unsupported image mime types", () => {
    assert.throws(
      () => decodeImagePayload({ mimeType: "image/gif", data: "abc" }),
      {
        message: "mimeType must be one of: image/jpeg, image/png, image/webp",
      }
    );
  });

  it("creates stable byte perceptual hashes", () => {
    const hash = createBytePerceptualHash(Buffer.from("same-image-content"));

    assert.equal(hash, createBytePerceptualHash(Buffer.from("same-image-content")));
    assert.equal(hash.length, 16);
  });

  it("stores an image on disk (local driver) and deletes it again", async () => {
    const stored = await storePropertyImage({
      propertyId: new mongoose.Types.ObjectId(),
      imageId: new mongoose.Types.ObjectId(),
      fileName: "room.jpg",
      mimeType: "image/jpeg",
      data: Buffer.from("image-bytes").toString("base64"),
    });

    await assert.doesNotReject(() => fs.access(stored.storagePath));

    await deletePropertyImage({ storagePath: stored.storagePath });

    await assert.rejects(() => fs.access(stored.storagePath));
  });

  it("does nothing when deleting without a storage path", async () => {
    await assert.doesNotReject(() => deletePropertyImage({ storagePath: undefined }));
  });
});
