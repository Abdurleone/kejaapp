import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ quiet: true });

const nodeEnv = process.env.NODE_ENV || (process.env.npm_lifecycle_event === "test" ? "test" : "development");
const mongoDbName = process.env.MONGODB_DB_NAME || "kejaapp";
const mongoUri = process.env.MONGODB_URI || (nodeEnv === "test" ? "mongodb://127.0.0.1:27017" : "");
const jwtSecret = process.env.JWT_SECRET || (nodeEnv === "test" ? "test-secret-with-enough-length" : "");
const requiredEnv = ["MONGODB_URI", "JWT_SECRET"];
const envValues = {
  MONGODB_URI: mongoUri,
  JWT_SECRET: jwtSecret,
};

for (const key of requiredEnv) {
  if (!envValues[key]) {
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

const parseBoolean = (value, fallback, key) => {
  if (value === undefined || value === "") {
    return fallback;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${key} must be true or false`);
};

const parseTrustProxy = (value) => {
  if (value === undefined || value === "") {
    return false;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  const hops = Number(value);

  if (Number.isInteger(hops) && hops >= 0) {
    return hops;
  }

  throw new Error("TRUST_PROXY must be true, false, or a non-negative integer");
};

const normalizeMongoUri = (value, databaseName) => {
  const uri = new URL(value);

  if (!uri.pathname || uri.pathname === "/") {
    uri.pathname = `/${databaseName}`;
  }

  return uri.toString();
};

const env = {
  nodeEnv,
  port: parsePort(process.env.PORT),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  mongoDbName,
  mongoUri: normalizeMongoUri(mongoUri, mongoDbName),
  dbRequired: parseBoolean(process.env.DB_REQUIRED, nodeEnv === "production", "DB_REQUIRED"),
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
  jwtSecret,
  refreshTokenMaxAge: parseCookieMaxAge(process.env.REFRESH_TOKEN_MAX_AGE_DAYS || 30),
  bcryptSaltRounds: parsePositiveInteger(process.env.BCRYPT_SALT_ROUNDS, 12, "BCRYPT_SALT_ROUNDS"),
  authCookieName: process.env.AUTH_COOKIE_NAME || "keja_token",
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "keja_refresh",
  authCookieMaxAge: parseCookieMaxAge(process.env.AUTH_COOKIE_MAX_AGE_DAYS),
  authCookieSecure: process.env.AUTH_COOKIE_SECURE === "true",
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  rateLimitWindowMs: parsePositiveInteger(
    process.env.RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
    "RATE_LIMIT_WINDOW_MS"
  ),
  rateLimitMax: parsePositiveInteger(process.env.RATE_LIMIT_MAX, 500, "RATE_LIMIT_MAX"),
  authRateLimitMax: parsePositiveInteger(
    process.env.AUTH_RATE_LIMIT_MAX,
    50,
    "AUTH_RATE_LIMIT_MAX"
  ),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || "uploads"),
  uploadPublicBaseUrl: process.env.UPLOAD_PUBLIC_BASE_URL || "",
  maxUploadBytes: parsePositiveInteger(
    process.env.MAX_UPLOAD_BYTES,
    5 * 1024 * 1024,
    "MAX_UPLOAD_BYTES"
  ),
  redisUrl: process.env.REDIS_URL || "",
  propertiesCacheTtlMs: parsePositiveInteger(
    process.env.PROPERTIES_CACHE_TTL_MS,
    30 * 1000,
    "PROPERTIES_CACHE_TTL_MS"
  ),
  moversCacheTtlMs: parsePositiveInteger(
    process.env.MOVERS_CACHE_TTL_MS,
    60 * 1000,
    "MOVERS_CACHE_TTL_MS"
  ),
  logDir: path.resolve(process.env.LOG_DIR || "logs"),
};

export default env;
