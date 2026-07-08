import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import connectDB, { disconnectDB } from "../config/db.js";
import User from "../models/User.js";
import { generateUniqueUsername } from "../utils/usernameGenerator.js";

const backfillUsernames = async () => {
  try {
    await connectDB();

    const usersMissingUsername = await User.find({
      $or: [{ username: { $exists: false } }, { username: null }],
    });

    for (const user of usersMissingUsername) {
      user.username = await generateUniqueUsername(User);
      await user.save();
    }

    console.log(`Assigned usernames to ${usersMissingUsername.length} user(s).`);
  } catch (error) {
    console.error(`Username backfill failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    await mongoose.disconnect();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  backfillUsernames();
}

export default backfillUsernames;
