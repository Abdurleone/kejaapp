import app from "./app.js";
import connectDB, { disconnectDB } from "./config/db.js";
import env from "./config/env.js";

// Server
let server;

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down`);

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

      console.warn(
        `MongoDB startup failed but DB_REQUIRED=false; starting API without database connection: ${error.message}`
      );
    }

    server = app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();
