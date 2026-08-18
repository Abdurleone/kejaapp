import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import mongoose from "mongoose";
import { S3Client } from "@aws-sdk/client-s3";

// STORAGE_DRIVER must be set before config/env.js is first imported (by the
// dynamic import below), since env.js reads process.env once at module load.
process.env.STORAGE_DRIVER = "s3";
process.env.S3_BUCKET = "jakezapp-test-bucket";
process.env.S3_ACCESS_KEY_ID = "test-access-key-id";
process.env.S3_SECRET_ACCESS_KEY = "test-secret-access-key";
process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com/";

const { deletePropertyImage, storePropertyImage } = await import(
  "../../services/fileStorageService.js"
);

describe("fileStorageService (s3 driver)", () => {
  it("uploads to the configured bucket and returns a public URL", async () => {
    const send = mock.method(S3Client.prototype, "send", async (command) => {
      assert.equal(command.constructor.name, "PutObjectCommand");
      assert.equal(command.input.Bucket, "jakezapp-test-bucket");
      assert.equal(command.input.ContentType, "image/jpeg");
      return {};
    });

    const propertyId = new mongoose.Types.ObjectId();
    const imageId = new mongoose.Types.ObjectId();

    const result = await storePropertyImage({
      propertyId,
      imageId,
      fileName: "Living Room.jpg",
      mimeType: "image/jpeg",
      // Real JPEG magic bytes (FF D8 FF) - decodeImagePayload now verifies
      // the actual content, not just the claimed mimeType string.
      data: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from("image-bytes")]).toString("base64"),
    });

    assert.equal(send.mock.callCount(), 1);
    assert.equal(result.storagePath, `properties/${propertyId}/${imageId}-living-room.jpg`);
    assert.equal(result.url, `https://cdn.example.com/properties/${propertyId}/${imageId}-living-room.jpg`);

    send.mock.restore();
  });

  it("deletes the object for a stored image", async () => {
    const send = mock.method(S3Client.prototype, "send", async (command) => {
      assert.equal(command.constructor.name, "DeleteObjectCommand");
      assert.equal(command.input.Bucket, "jakezapp-test-bucket");
      assert.equal(command.input.Key, "properties/abc/def-image.jpg");
      return {};
    });

    await deletePropertyImage({ storagePath: "properties/abc/def-image.jpg" });

    assert.equal(send.mock.callCount(), 1);

    send.mock.restore();
  });

  it("does nothing when deleting without a storage path", async () => {
    const send = mock.method(S3Client.prototype, "send", async () => {
      throw new Error("send should not be called");
    });

    await deletePropertyImage({ storagePath: undefined });

    assert.equal(send.mock.callCount(), 0);

    send.mock.restore();
  });
});
