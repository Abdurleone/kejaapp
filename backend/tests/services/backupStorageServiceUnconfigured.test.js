import assert from "node:assert/strict";
import { describe, it } from "node:test";

// BACKUP_S3_BUCKET deliberately left unset (empty = disabled, see
// config/env.js's backupS3Bucket comment) - a separate file from
// backupStorageService.test.js since env.js reads process.env once at
// module load, mirroring envS3.test.js's pattern.
const { downloadBackup, listBackups, uploadBackup } = await import(
  "../../services/backupStorageService.js"
);

const expectedMessage = /BACKUP_S3_BUCKET is not set/;

describe("backupStorageService (unconfigured)", () => {
  it("uploadBackup refuses to run", async () => {
    await assert.rejects(() => uploadBackup("backups/x.json.gz", Buffer.from("x")), expectedMessage);
  });

  it("downloadBackup refuses to run", async () => {
    await assert.rejects(() => downloadBackup("backups/x.json.gz"), expectedMessage);
  });

  it("listBackups refuses to run", async () => {
    await assert.rejects(() => listBackups(), expectedMessage);
  });
});
