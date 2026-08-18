import assert from "node:assert/strict";
import { describe, it } from "node:test";

// STORAGE_DRIVER must be set before config/env.js is first imported (by the
// dynamic import below), since env.js reads process.env once at module load
// - mirrors envS3.test.js's pattern exactly. All other required S3 vars are
// given valid values so only the malformed S3_ENDPOINT trips the check.
process.env.STORAGE_DRIVER = "s3";
process.env.S3_BUCKET = "jakezapp-test-bucket";
process.env.S3_ACCESS_KEY_ID = "test-access-key-id";
process.env.S3_SECRET_ACCESS_KEY = "test-secret-access-key";
process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com";
// Missing the required scheme - exactly the shape of value that used to sail
// through config loading and only blow up deep inside the AWS SDK's endpoint
// resolver on the first real upload (TypeError: Invalid URL).
process.env.S3_ENDPOINT = "s3.us-west-002.backblazeb2.com";

describe("env config (s3 storage driver, malformed S3_ENDPOINT)", () => {
  it("rejects an S3_ENDPOINT that isn't a valid URL", async () => {
    await assert.rejects(() => import("../../config/env.js"), {
      message: 'S3_ENDPOINT must be a valid URL (e.g. https://...), got "s3.us-west-002.backblazeb2.com"',
    });
  });
});
