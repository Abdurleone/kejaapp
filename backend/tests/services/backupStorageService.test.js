import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { S3Client } from "@aws-sdk/client-s3";

// BACKUP_S3_* must be set before config/env.js is first imported (by the
// dynamic import below), since env.js reads process.env once at module load
// - mirrors fileStorageServiceS3.test.js's pattern exactly.
process.env.BACKUP_S3_BUCKET = "kejaapp-test-backups";
process.env.BACKUP_S3_ACCESS_KEY_ID = "test-access-key-id";
process.env.BACKUP_S3_SECRET_ACCESS_KEY = "test-secret-access-key";

const { downloadBackup, listBackups, uploadBackup } = await import(
  "../../services/backupStorageService.js"
);

describe("backupStorageService", () => {
  it("uploads a gzip buffer to the configured private bucket", async () => {
    const send = mock.method(S3Client.prototype, "send", async (command) => {
      assert.equal(command.constructor.name, "PutObjectCommand");
      assert.equal(command.input.Bucket, "kejaapp-test-backups");
      assert.equal(command.input.Key, "backups/2026-08-12T00-00-00-000Z.json.gz");
      assert.equal(command.input.ContentType, "application/gzip");
      return {};
    });

    const buffer = Buffer.from("gzipped-bytes");
    const result = await uploadBackup("backups/2026-08-12T00-00-00-000Z.json.gz", buffer);

    assert.equal(send.mock.callCount(), 1);
    assert.deepEqual(result, {
      key: "backups/2026-08-12T00-00-00-000Z.json.gz",
      bucket: "kejaapp-test-backups",
      bytes: buffer.length,
    });

    send.mock.restore();
  });

  it("downloads and buffers an object's body", async () => {
    const send = mock.method(S3Client.prototype, "send", async (command) => {
      assert.equal(command.constructor.name, "GetObjectCommand");
      assert.equal(command.input.Bucket, "kejaapp-test-backups");
      assert.equal(command.input.Key, "backups/target.json.gz");

      return { Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) } };
    });

    const buffer = await downloadBackup("backups/target.json.gz");

    assert.equal(send.mock.callCount(), 1);
    assert.deepEqual([...buffer], [1, 2, 3]);

    send.mock.restore();
  });

  it("lists backups newest-first by key", async () => {
    const send = mock.method(S3Client.prototype, "send", async (command) => {
      assert.equal(command.constructor.name, "ListObjectsV2Command");
      assert.equal(command.input.Bucket, "kejaapp-test-backups");
      assert.equal(command.input.Prefix, "backups/");

      return {
        Contents: [
          { Key: "backups/2026-08-10T00-00-00-000Z.json.gz", Size: 10 },
          { Key: "backups/2026-08-12T00-00-00-000Z.json.gz", Size: 20 },
          { Key: "backups/2026-08-11T00-00-00-000Z.json.gz", Size: 15 },
        ],
      };
    });

    const backups = await listBackups();

    assert.deepEqual(
      backups.map((backup) => backup.key),
      [
        "backups/2026-08-12T00-00-00-000Z.json.gz",
        "backups/2026-08-11T00-00-00-000Z.json.gz",
        "backups/2026-08-10T00-00-00-000Z.json.gz",
      ]
    );

    send.mock.restore();
  });
});
