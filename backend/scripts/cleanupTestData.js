import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import connectDB, { disconnectDB } from "../config/db.js";
import User from "../models/User.js";
import { deleteUserCascade } from "../services/userDeletionService.js";

// The exact roster backend/seeders/seedDemoData.js creates - every account
// with this email survives a cleanup run. Anything else is ad-hoc QA/test
// data created directly against a shared dev database over the course of
// manual testing sessions (register-a-throwaway-account, hit an endpoint,
// move on), never cleaned up afterward. An allowlist of known-good accounts
// is safer here than trying to pattern-match "looks like test data" - it
// only ever under-deletes (leaves an unrecognized account alone) rather than
// over-deleting a real one because a naming guess happened to match.
const protectedDemoEmails = new Set([
  "tenant@example.com",
  "grace.tenant@example.com",
  "james.tenant@example.com",
  "amina.tenant@example.com",
  "agency@example.com",
  "urban.agency@example.com",
  "rejected.agency@example.com",
  "landlord@example.com",
  "mary.landlord@example.com",
  "admin@example.com",
  "mover1@example.com",
  "mover2@example.com",
  "mover3@example.com",
  "mover4@example.com",
  "mover5@example.com",
  "mover6@example.com",
]);

export const isProtectedDemoUser = (email) => protectedDemoEmails.has(String(email || "").toLowerCase());

export const partitionUsers = (users) => {
  const toDelete = [];
  const toKeep = [];

  for (const user of users) {
    (isProtectedDemoUser(user.email) ? toKeep : toDelete).push(user);
  }

  return { toDelete, toKeep };
};

const formatUserLine = (user) =>
  `  ${user._id}  ${(user.role || "?").padEnd(9)}  ${user.email}  (${user.name || "no name"})`;

const cleanupTestData = async () => {
  const confirm = process.argv.includes("--confirm");

  await connectDB();

  try {
    const users = await User.find({}, "name email role").lean();
    const { toDelete, toKeep } = partitionUsers(users);

    console.log(`Found ${users.length} total users - ${toKeep.length} protected demo accounts, ${toDelete.length} candidates for deletion.\n`);

    if (toDelete.length === 0) {
      console.log("Nothing to clean up.");
      return;
    }

    console.log(confirm ? "Deleting:" : "Would delete (dry run - pass --confirm to actually delete):");
    toDelete.forEach((user) => console.log(formatUserLine(user)));

    if (!confirm) {
      console.log(`\nDry run only - rerun with --confirm to delete these ${toDelete.length} accounts and all their associated data.`);
      return;
    }

    console.log("");

    for (const user of toDelete) {
      await deleteUserCascade(user._id);
      console.log(`Deleted ${user.email}`);
    }

    console.log(`\nDone - deleted ${toDelete.length} accounts and their associated data.`);
  } finally {
    await disconnectDB();
    await mongoose.disconnect();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cleanupTestData();
}

export { cleanupTestData };
