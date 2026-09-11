import mongoose from "mongoose";
import { runSeed } from "../seeders/seedDemoData.js";

// Mongoose/MongoDB's own internal collections - same convention as
// scripts/backupDatabase.js's isSystemCollection.
const isSystemCollection = (name) => name.startsWith("system.");

// Read-only summary of what a reset would drop - backs the CLI script's
// dry run.
const getDemoCollectionSummary = async () => {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const counts = {};

  for (const { name } of collections) {
    if (isSystemCollection(name)) {
      continue;
    }

    counts[name] = await db.collection(name).estimatedDocumentCount();
  }

  return counts;
};

// Assumes a live connection already exists (server.js's boot-time connect,
// or the CLI script's own connectDB() call) - deliberately does NOT connect
// or disconnect itself, since an HTTP-triggered caller must never tear down
// the app's single long-lived connection.
const performDemoReset = async () => {
  await mongoose.connection.db.dropDatabase();
  await runSeed();
};

export { getDemoCollectionSummary, performDemoReset };
