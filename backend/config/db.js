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

const connectDB = async () => {
  const connection = await mongoose.connect(env.mongoUri, {
    family: 4,
    maxPoolSize: 10,
    minPoolSize: 0,
    retryReads: true,
    retryWrites: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  console.log(`MongoDB connected: ${connection.connection.host}`);
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

export { disconnectDB, getDBHealth };
export default connectDB;
