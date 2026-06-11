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

const parseCookieMaxAge = (value) => {
  const days = Number(value || 7);

  if (!Number.isFinite(days) || days <= 0) {
    throw new Error("AUTH_COOKIE_MAX_AGE_DAYS must be a positive number");
  }

  return days * 24 * 60 * 60 * 1000;
};

const parsePositiveInteger = (value, fallback, key) => {
  const number = Number(value || fallback);

  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }

  return number;
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
  mongoConnectRetries: parsePositiveInteger(
    process.env.MONGODB_CONNECT_RETRIES,
    5,
    "MONGODB_CONNECT_RETRIES"
  ),
  mongoConnectRetryDelayMs: parsePositiveInteger(
    process.env.MONGODB_CONNECT_RETRY_DELAY_MS,
    3000,
    "MONGODB_CONNECT_RETRY_DELAY_MS"
  ),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  jwtSecret: process.env.JWT_SECRET,
  bcryptSaltRounds: parsePositiveInteger(process.env.BCRYPT_SALT_ROUNDS, 12, "BCRYPT_SALT_ROUNDS"),
  authCookieName: process.env.AUTH_COOKIE_NAME || "keja_token",
  authCookieMaxAge: parseCookieMaxAge(process.env.AUTH_COOKIE_MAX_AGE_DAYS),
  authCookieSecure: process.env.AUTH_COOKIE_SECURE === "true",
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
};

export default env;
