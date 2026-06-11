import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createBytePerceptualHash,
  decodeImagePayload,
  sanitizeFileName,
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
});
