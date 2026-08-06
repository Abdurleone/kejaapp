import "./instrument.js";
import app from "./app.js";
import connectDB, { disconnectDB } from "./config/db.js";
import env from "./config/env.js";
import { logError, logInfo, logWarn } from "./utils/logger.js";

// Server
let server;

const shutdown = async (signal) => {
  logInfo(`${signal} received, shutting down`);

  if (server) {
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    return;
  }

  await disconnectDB();
  process.exit(0);
};

const startServer = async () => {
  try {
    try {
      await connectDB();
    } catch (error) {
      if (env.dbRequired) {
        throw error;
      }

      logWarn(
        `MongoDB startup failed but DB_REQUIRED=false; starting API without database connection: ${error.message}`
      );
    }

    server = app.listen(env.port, () => {
      logInfo(`Server running on port ${env.port}`);
    });
  } catch (error) {
    logError(`Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();
