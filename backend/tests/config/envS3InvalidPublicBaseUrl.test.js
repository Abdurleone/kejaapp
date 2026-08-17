import assert from "node:assert/strict";
import { describe, it } from "node:test";

// STORAGE_DRIVER must be set before config/env.js is first imported (by the
// dynamic import below), since env.js reads process.env once at module load
// - mirrors envS3.test.js's pattern exactly. All other required S3 vars are
// given valid values so only the malformed S3_PUBLIC_BASE_URL trips the check.
process.env.STORAGE_DRIVER = "s3";
process.env.S3_BUCKET = "kejaapp-test-bucket";
process.env.S3_ACCESS_KEY_ID = "test-access-key-id";
process.env.S3_SECRET_ACCESS_KEY = "test-secret-access-key";
process.env.S3_PUBLIC_BASE_URL = "not-a-url";

describe("env config (s3 storage driver, malformed S3_PUBLIC_BASE_URL)", () => {
  it("rejects an S3_PUBLIC_BASE_URL that isn't a valid URL", async () => {
    await assert.rejects(() => import("../../config/env.js"), {
      message: 'S3_PUBLIC_BASE_URL must be a valid URL (e.g. https://...), got "not-a-url"',
    });
  });
});
