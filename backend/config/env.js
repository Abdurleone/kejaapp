import dotenv from "dotenv";

dotenv.config({ quiet: true });

const requiredEnv = ["MONGODB_URI", "JWT_SECRET"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is not defined`);
  }
}

const parsePort = (value) => {
  const port = Number(value || 5000);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return port;
};

const parseCorsOrigins = (value) => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const normalizeMongoUri = (value, databaseName) => {
  const uri = new URL(value);

  if (!uri.pathname || uri.pathname === "/") {
    uri.pathname = `/${databaseName}`;
  }

  return uri.toString();
};

const mongoDbName = process.env.MONGODB_DB_NAME || "kejaapp";

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parsePort(process.env.PORT),
  mongoDbName,
  mongoUri: normalizeMongoUri(process.env.MONGODB_URI, mongoDbName),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  jwtSecret: process.env.JWT_SECRET,
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
};

export default env;
