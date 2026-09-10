import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import connectDB, { disconnectDB } from "../config/db.js";
import env from "../config/env.js";
import { getDemoCollectionSummary, performDemoReset } from "../services/demoResetService.js";

const resetDemoData = async () => {
  // Checked before connectDB() is ever called - this must refuse even to
  // look at whatever MONGODB_URI happens to be configured (which could be
  // production's) unless DEMO_MODE is explicitly true on this environment.
  if (!env.demoMode) {
    console.error(
      "Refusing to run: DEMO_MODE is not true. This script drops the entire " +
        "configured database and must only ever run against the dedicated " +
        "demo database - set DEMO_MODE=true (only on the demo environment) " +
        "before running this."
    );
    process.exitCode = 1;
    return;
  }

  const confirm = process.argv.includes("--confirm");

  await connectDB();

  try {
    const counts = await getDemoCollectionSummary();
    const collectionNames = Object.keys(counts);

    if (collectionNames.length === 0) {
      console.log("Database is already empty - nothing to drop.");
    } else {
      console.log(
        confirm
          ? "Dropping the entire database:"
          : "Would drop the entire database (dry run - pass --confirm to actually reset):"
      );
      collectionNames.forEach((name) => console.log(`  ${name}: ${counts[name]} document(s)`));
    }

    if (!confirm) {
      console.log("\nDry run only - rerun with --confirm to drop and reseed the demo database.");
      return;
    }

    console.log("");
    await performDemoReset();
    console.log("\nDone - demo database dropped and reseeded.");
  } finally {
    await disconnectDB();
    await mongoose.disconnect();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  resetDemoData();
}

export { resetDemoData };
