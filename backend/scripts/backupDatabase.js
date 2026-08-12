import mongoose from "mongoose";
import zlib from "node:zlib";
import { pathToFileURL } from "node:url";
import { EJSON } from "bson";
import connectDB, { disconnectDB } from "../config/db.js";
import env from "../config/env.js";
import { uploadBackup } from "../services/backupStorageService.js";

// mongoose's own internal collections (change-stream/session bookkeeping,
// none of it application data) - skipped rather than dumped and restored.
const isSystemCollection = (name) => name.startsWith("system.");

const dumpCollections = async () => {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const backup = {};
  let totalDocs = 0;

  for (const { name } of collections) {
    if (isSystemCollection(name)) {
      continue;
    }

    const docs = await db.collection(name).find({}).toArray();
    backup[name] = docs;
    totalDocs += docs.length;
  }

  return { backup, totalDocs, collectionCount: Object.keys(backup).length };
};

const backupDatabase = async () => {
  if (!env.backupS3Bucket) {
    console.error(
      "BACKUP_S3_BUCKET is not set - see backend/.env.example for the BACKUP_S3_* variables required before running a backup."
    );
    process.exitCode = 1;
    return;
  }

  try {
    await connectDB();

    const { backup, totalDocs, collectionCount } = await dumpCollections();
    // relaxedMode: false keeps every BSON type (ObjectId, Date, ...) exact on
    // round-trip through restoreDatabase.js, at the cost of a more verbose
    // ({"$oid": "..."}-style) JSON representation than "relaxed" EJSON.
    const json = EJSON.stringify(backup, { relaxedMode: false });
    const gzipped = zlib.gzipSync(Buffer.from(json, "utf8"));
    const key = `backups/${new Date().toISOString().replace(/[:.]/g, "-")}.json.gz`;

    const result = await uploadBackup(key, gzipped);

    console.log(
      `Backed up ${totalDocs} document(s) across ${collectionCount} collection(s) ` +
        `(${(gzipped.length / 1024).toFixed(1)} KiB gzipped) -> s3://${result.bucket}/${result.key}`
    );
  } catch (error) {
    console.error(`Backup failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    await mongoose.disconnect();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  backupDatabase();
}

export { backupDatabase, dumpCollections };
