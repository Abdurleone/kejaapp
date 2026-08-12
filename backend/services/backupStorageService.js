import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import env from "../config/env.js";

// A separate S3 client/bucket from services/storageDrivers/s3StorageDriver.js
// on purpose - that bucket is public-read (property photos), this one must
// never be. See config/env.js's backupS3Bucket comment.
let s3Client;

const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.backupS3Region,
      endpoint: env.backupS3Endpoint || undefined,
      forcePathStyle: env.backupS3ForcePathStyle,
      credentials: {
        accessKeyId: env.backupS3AccessKeyId,
        secretAccessKey: env.backupS3SecretAccessKey,
      },
    });
  }

  return s3Client;
};

const assertConfigured = () => {
  if (!env.backupS3Bucket) {
    throw new Error(
      "BACKUP_S3_BUCKET is not set - create a private (not public-read) bucket for database backups and set BACKUP_S3_BUCKET/BACKUP_S3_ACCESS_KEY_ID/BACKUP_S3_SECRET_ACCESS_KEY/BACKUP_S3_ENDPOINT (see backend/.env.example)."
    );
  }
};

const uploadBackup = async (key, buffer) => {
  assertConfigured();

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.backupS3Bucket,
      Key: key,
      Body: buffer,
      ContentType: "application/gzip",
    })
  );

  return { key, bucket: env.backupS3Bucket, bytes: buffer.length };
};

const downloadBackup = async (key) => {
  assertConfigured();

  const response = await getS3Client().send(
    new GetObjectCommand({ Bucket: env.backupS3Bucket, Key: key })
  );

  return Buffer.from(await response.Body.transformToByteArray());
};

// Sorted newest-first by key - backupDatabase.js's keys are ISO-timestamp
// prefixed (backups/<ISO timestamp>.json.gz), so lexicographic order is also
// chronological order.
const listBackups = async () => {
  assertConfigured();

  const response = await getS3Client().send(
    new ListObjectsV2Command({ Bucket: env.backupS3Bucket, Prefix: "backups/" })
  );

  return (response.Contents || [])
    .map((object) => ({ key: object.Key, bytes: object.Size, lastModified: object.LastModified }))
    .sort((a, b) => b.key.localeCompare(a.key));
};

export { downloadBackup, listBackups, uploadBackup };
