import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { S3Client } from "@aws-sdk/client-s3";

// BACKUP_S3_* must be set before config/env.js is first imported (by the
// dynamic import below, via restoreDatabase.js -> backupStorageService.js)
// - mirrors backupStorageService.test.js's pattern.
process.env.BACKUP_S3_BUCKET = "jakezapp-test-backups";
process.env.BACKUP_S3_ACCESS_KEY_ID = "test-access-key-id";
process.env.BACKUP_S3_SECRET_ACCESS_KEY = "test-secret-access-key";

const { parseArgs, resolveBackupKey } = await import("../../scripts/restoreDatabase.js");

describe("restoreDatabase: parseArgs", () => {
  it("defaults to a dry run with no explicit key", () => {
    assert.deepEqual(parseArgs([]), { confirm: false, key: undefined });
  });

  it("reads --confirm and --key=", () => {
    assert.deepEqual(parseArgs(["--key=backups/x.json.gz", "--confirm"]), {
      confirm: true,
      key: "backups/x.json.gz",
    });
  });
});

describe("restoreDatabase: resolveBackupKey", () => {
  it("returns an explicitly given key without listing the bucket", async () => {
    const send = mock.method(S3Client.prototype, "send", async () => {
      throw new Error("should not list when a key is given explicitly");
    });

    assert.equal(await resolveBackupKey("backups/explicit.json.gz"), "backups/explicit.json.gz");
    assert.equal(send.mock.callCount(), 0);

    send.mock.restore();
  });

  it("resolves to the newest backup when no key is given", async () => {
    const send = mock.method(S3Client.prototype, "send", async () => ({
      Contents: [
        { Key: "backups/2026-08-10T00-00-00-000Z.json.gz", Size: 10 },
        { Key: "backups/2026-08-12T00-00-00-000Z.json.gz", Size: 20 },
      ],
    }));

    assert.equal(await resolveBackupKey(undefined), "backups/2026-08-12T00-00-00-000Z.json.gz");

    send.mock.restore();
  });

  it("rejects when no key is given and the bucket has no backups", async () => {
    const send = mock.method(S3Client.prototype, "send", async () => ({ Contents: [] }));

    await assert.rejects(() => resolveBackupKey(undefined), /No backups found/);

    send.mock.restore();
  });
});
