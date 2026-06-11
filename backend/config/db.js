import mongoose from "mongoose";
import env from "./env.js";

const connectionStates = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

mongoose.connection.on("error", (error) => {
  console.error(`MongoDB error: ${error.message}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected");
});

const mongoOptions = {
  family: 4,
  maxPoolSize: 10,
  minPoolSize: 0,
  retryReads: true,
  retryWrites: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const connectDB = async () => {
  let lastError;

  for (let attempt = 1; attempt <= env.mongoConnectRetries; attempt += 1) {
    try {
      const connection = await mongoose.connect(env.mongoUri, mongoOptions);
      console.log(`MongoDB connected: ${connection.connection.host}`);
      return connection;
    } catch (error) {
      lastError = error;
      console.error(
        `MongoDB connection attempt ${attempt}/${env.mongoConnectRetries} failed: ${error.message}`
      );

      if (attempt < env.mongoConnectRetries) {
        await wait(env.mongoConnectRetryDelayMs);
      }
    }
  }

  throw lastError;
};

const disconnectDB = async () => {
  await mongoose.connection.close();
};

const getDBHealth = () => ({
  path: new URL(env.mongoUri).pathname,
  host: mongoose.connection.host || null,
  name: mongoose.connection.name || null,
  readyState: mongoose.connection.readyState,
  status: connectionStates[mongoose.connection.readyState] || "unknown",
});

const pingDB = async () => {
  const health = getDBHealth();

  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return {
      ...health,
      ok: false,
      message: "Database is not connected",
    };
  }

  await mongoose.connection.db.admin().ping();

  return {
    ...getDBHealth(),
    ok: true,
    message: "Database ping successful",
  };
};

export { disconnectDB, getDBHealth, pingDB };
export default connectDB;
