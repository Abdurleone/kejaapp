import mongoose from "mongoose";
import zlib from "node:zlib";
import { pathToFileURL } from "node:url";
import { EJSON } from "bson";
import connectDB, { disconnectDB } from "../config/db.js";
import env from "../config/env.js";
import { downloadBackup, listBackups } from "../services/backupStorageService.js";

const parseArgs = (argv) => {
  const confirm = argv.includes("--confirm");
  const keyArg = argv.find((arg) => arg.startsWith("--key="));

  return { confirm, key: keyArg ? keyArg.slice("--key=".length) : undefined };
};

// Defaults to the newest backup (listBackups() sorts newest-first) when no
// --key is given, so the common "restore the latest one" case needs no
// lookup step of its own.
const resolveBackupKey = async (key) => {
  if (key) {
    return key;
  }

  const backups = await listBackups();

  if (!backups.length) {
    throw new Error(
      "No backups found in the configured bucket - run scripts/backupDatabase.js first, or pass --key=<key> explicitly."
    );
  }

  return backups[0].key;
};

const restoreDatabase = async () => {
  if (!env.backupS3Bucket) {
    console.error(
      "BACKUP_S3_BUCKET is not set - see backend/.env.example for the BACKUP_S3_* variables."
    );
    process.exitCode = 1;
    return;
  }

  const { confirm, key: requestedKey } = parseArgs(process.argv.slice(2));

  try {
    const key = await resolveBackupKey(requestedKey);
    const gzipped = await downloadBackup(key);
    const backup = EJSON.parse(zlib.gunzipSync(gzipped).toString("utf8"), { relaxedMode: false });

    await connectDB();
    const db = mongoose.connection.db;

    console.log(`Restore source: s3://${env.backupS3Bucket}/${key}`);
    console.log(`Restore target: ${mongoose.connection.host}/${mongoose.connection.name}\n`);

    for (const [name, docs] of Object.entries(backup)) {
      const existingCount = await db.collection(name).estimatedDocumentCount();
      console.log(
        `  ${name}: ${docs.length} document(s) in backup, ${existingCount} currently in target ` +
          `(${confirm ? "will be replaced" : "dry run - would be replaced"})`
      );
    }

    if (!confirm) {
      console.log(
        "\nDry run only - rerun with --confirm to wipe and replace these collections in the target database."
      );
      return;
    }

    console.log("");

    for (const [name, docs] of Object.entries(backup)) {
      await db.collection(name).deleteMany({});

      if (docs.length) {
        await db.collection(name).insertMany(docs, { ordered: false });
      }

      console.log(`Restored ${name}: ${docs.length} document(s)`);
    }

    console.log(`\nDone - restored ${Object.keys(backup).length} collection(s) from ${key}.`);
  } catch (error) {
    console.error(`Restore failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    await mongoose.disconnect();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  restoreDatabase();
}

export { parseArgs, resolveBackupKey, restoreDatabase };
