import mongoose from "mongoose";
import env from "./env.js";

const connectDB = async () => {
  const connection = await mongoose.connect(env.mongoUri);
  console.log(`MongoDB connected: ${connection.connection.host}`);
};

export default connectDB;
