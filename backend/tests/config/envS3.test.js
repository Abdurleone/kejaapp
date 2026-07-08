import assert from "node:assert/strict";
import { describe, it } from "node:test";

// STORAGE_DRIVER must be set before config/env.js is first imported (by the
// dynamic import below), since env.js reads process.env once at module load.
process.env.STORAGE_DRIVER = "s3";

describe("env config (s3 storage driver)", () => {
  it("requires the S3 secrets when STORAGE_DRIVER=s3", async () => {
    await assert.rejects(() => import("../../config/env.js"), {
      message: "S3_BUCKET is required when STORAGE_DRIVER=s3",
    });
  });
});
