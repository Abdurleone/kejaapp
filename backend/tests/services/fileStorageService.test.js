import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import { describe, it } from "node:test";
import mongoose from "mongoose";
import env from "../../config/env.js";
import {
  createBytePerceptualHash,
  decodeImagePayload,
  deletePropertyImage,
  sanitizeFileName,
  scanForMalware,
  storePropertyImage,
} from "../../services/fileStorageService.js";

// decodeImagePayload now verifies the decoded buffer's real magic bytes
// match the claimed mimeType (see fileStorageService.js), not just the
// client-asserted string - these helpers build data with a real signature
// prefix so tests that go through decodeImagePayload/storePropertyImage
// still exercise realistic content instead of tripping the new check.
const pngBytes = (suffix = "image-bytes") =>
  Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(suffix)]);
const jpegBytes = (suffix = "image-bytes") =>
  Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from(suffix)]);

const withFakeClamd = (respond, testFn) => async () => {
  const server = net.createServer((socket) => {
    socket.on("data", () => {});
    respond(socket);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const originalHost = env.clamavHost;
  const originalPort = env.clamavPort;
  env.clamavHost = "127.0.0.1";
  env.clamavPort = server.address().port;

  try {
    await testFn();
  } finally {
    env.clamavHost = originalHost;
    env.clamavPort = originalPort;
    await new Promise((resolve) => server.close(resolve));
  }
};

describe("fileStorageService", () => {
  it("sanitizes uploaded file names", () => {
    assert.equal(sanitizeFileName("Living Room!.JPG"), "living-room-.jpg");
  });

  it("decodes base64 image payloads", () => {
    const buffer = decodeImagePayload({
      mimeType: "image/png",
      data: pngBytes().toString("base64"),
    });

    assert.deepEqual(buffer, pngBytes());
  });

  it("rejects unsupported image mime types", () => {
    assert.throws(
      () => decodeImagePayload({ mimeType: "image/gif", data: "abc" }),
      {
        message: "mimeType must be one of: image/jpeg, image/png, image/webp",
      }
    );
  });

  it("rejects image data whose magic bytes don't match the declared mimeType", () => {
    assert.throws(
      () =>
        decodeImagePayload({
          mimeType: "image/jpeg",
          // Real PNG signature, but claimed as a JPEG.
          data: pngBytes().toString("base64"),
        }),
      { message: "Image data does not match the declared mimeType" }
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
      data: jpegBytes().toString("base64"),
    });

    await assert.doesNotReject(() => fs.access(stored.storagePath));

    await deletePropertyImage({ storagePath: stored.storagePath });

    await assert.rejects(() => fs.access(stored.storagePath));
  });

  it("does nothing when deleting without a storage path", async () => {
    await assert.doesNotReject(() => deletePropertyImage({ storagePath: undefined }));
  });

  it("allows storage when malware scanning isn't configured", async () => {
    await assert.doesNotReject(() => scanForMalware(Buffer.from("image-bytes")));
  });

  it(
    "rejects storage when the scanner flags the file",
    withFakeClamd(
      (socket) => socket.end("stream: Eicar-Test-Signature FOUND\0"),
      async () => {
        await assert.rejects(() => scanForMalware(Buffer.from("bad-bytes")), {
          message: "This file was flagged by malware scanning and cannot be uploaded",
        });
      }
    )
  );

  it("fails closed (rejects storage) when the scanner is configured but unreachable", async () => {
    const originalHost = env.clamavHost;
    const originalPort = env.clamavPort;
    env.clamavHost = "127.0.0.1";
    env.clamavPort = 1;

    try {
      await assert.rejects(() => scanForMalware(Buffer.from("image-bytes")), {
        message: "Image scanning is temporarily unavailable, try again shortly",
      });
    } finally {
      env.clamavHost = originalHost;
      env.clamavPort = originalPort;
    }
  });
});
