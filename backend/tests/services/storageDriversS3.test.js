import assert from "node:assert/strict";
import { describe, it } from "node:test";

// STORAGE_DRIVER must be set before config/env.js is first imported (by the
// dynamic import below), since env.js reads process.env once at module load
// - mirrors fileStorageServiceS3.test.js's pattern exactly.
process.env.STORAGE_DRIVER = "s3";
process.env.S3_BUCKET = "kejaapp-test-bucket";
process.env.S3_ACCESS_KEY_ID = "test-access-key-id";
process.env.S3_SECRET_ACCESS_KEY = "test-secret-access-key";
process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com/";

const { getDriver } = await import("../../services/storageDrivers/index.js");
const s3StorageDriver = await import("../../services/storageDrivers/s3StorageDriver.js");

describe("storageDrivers (STORAGE_DRIVER=s3)", () => {
  it("getDriver() returns the s3 driver", () => {
    assert.equal(getDriver(), s3StorageDriver);
  });
});
