import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import connectDB, { disconnectDB } from "../config/db.js";
import * as flagStaleListings from "../jobs/flagStaleListings.js";
import * as nudgeStaleInquiries from "../jobs/nudgeStaleInquiries.js";
import * as nudgeStaleViewingRequests from "../jobs/nudgeStaleViewingRequests.js";
import * as promptPostViewingReviews from "../jobs/promptPostViewingReviews.js";
import * as sendViewingReminders from "../jobs/sendViewingReminders.js";

const jobs = [
  { name: "nudgeStaleInquiries", run: nudgeStaleInquiries.run },
  { name: "nudgeStaleViewingRequests", run: nudgeStaleViewingRequests.run },
  { name: "sendViewingReminders", run: sendViewingReminders.run },
  { name: "promptPostViewingReviews", run: promptPostViewingReviews.run },
  { name: "flagStaleListings", run: flagStaleListings.run },
];

const runScheduledJobs = async () => {
  try {
    await connectDB();

    for (const job of jobs) {
      const count = await job.run();
      console.log(`${job.name}: processed ${count} record(s).`);
    }
  } catch (error) {
    console.error(`Scheduled jobs failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    await mongoose.disconnect();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runScheduledJobs();
}

export default runScheduledJobs;
