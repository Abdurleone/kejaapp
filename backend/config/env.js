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

const parseHoursToMs = (value, fallbackHours, key) => {
  const hours = Number(value || fallbackHours);

  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error(`${key} must be a positive number`);
  }

  return hours * 60 * 60 * 1000;
};

const parseDaysToMs = (value, fallbackDays, key) => {
  const days = Number(value || fallbackDays);

  if (!Number.isFinite(days) || days <= 0) {
    throw new Error(`${key} must be a positive number`);
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

const parseStorageDriver = (value) => {
  if (!value || value === "local") {
    return "local";
  }

  if (value === "s3") {
    return "s3";
  }

  throw new Error("STORAGE_DRIVER must be local or s3");
};

const storageDriver = parseStorageDriver(process.env.STORAGE_DRIVER);
const s3Config = {
  s3Bucket: process.env.S3_BUCKET || "",
  s3Region: process.env.S3_REGION || "auto",
  s3Endpoint: process.env.S3_ENDPOINT || "",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  s3PublicBaseUrl: (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, ""),
  s3ForcePathStyle: parseBoolean(process.env.S3_FORCE_PATH_STYLE, false, "S3_FORCE_PATH_STYLE"),
};

if (storageDriver === "s3") {
  const requiredS3Env = {
    S3_BUCKET: s3Config.s3Bucket,
    S3_ACCESS_KEY_ID: s3Config.s3AccessKeyId,
    S3_SECRET_ACCESS_KEY: s3Config.s3SecretAccessKey,
    S3_PUBLIC_BASE_URL: s3Config.s3PublicBaseUrl,
  };

  for (const [key, value] of Object.entries(requiredS3Env)) {
    if (!value) {
      throw new Error(`${key} is required when STORAGE_DRIVER=s3`);
    }
  }
}

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
  storageDriver,
  ...s3Config,
  redisUrl: process.env.REDIS_URL || "",
  // Optional, same pattern as redisUrl above: unset means malware scanning is
  // skipped entirely (an explicit, honest "not enabled" state) rather than a
  // silent no-op. Points at a clamd process speaking the INSTREAM protocol.
  clamavHost: process.env.CLAMAV_HOST || "",
  clamavPort: parsePositiveInteger(process.env.CLAMAV_PORT, 3310, "CLAMAV_PORT"),
  // Optional, same "empty = disabled" pattern as redisUrl/clamavHost above:
  // unset means web push delivery is skipped entirely (mobile push via Expo
  // is unaffected either way). Generate a real pair with
  // `npx web-push generate-vapid-keys`.
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || "",
  vapidSubject: process.env.VAPID_SUBJECT || "mailto:support@kejaapp.example",
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
  feedbackPublicCacheTtlMs: parsePositiveInteger(
    process.env.FEEDBACK_PUBLIC_CACHE_TTL_MS,
    30 * 1000,
    "FEEDBACK_PUBLIC_CACHE_TTL_MS"
  ),
  logDir: path.resolve(process.env.LOG_DIR || "logs"),
  staleNudgeThresholdMs: parseHoursToMs(
    process.env.STALE_NUDGE_THRESHOLD_HOURS,
    48,
    "STALE_NUDGE_THRESHOLD_HOURS"
  ),
  viewingReminderWindowMs: parseHoursToMs(
    process.env.VIEWING_REMINDER_WINDOW_HOURS,
    24,
    "VIEWING_REMINDER_WINDOW_HOURS"
  ),
  staleListingFreshnessMs: parseDaysToMs(
    process.env.STALE_LISTING_FRESHNESS_DAYS,
    14,
    "STALE_LISTING_FRESHNESS_DAYS"
  ),
  reviewPromptLookbackMs: parseDaysToMs(
    process.env.REVIEW_PROMPT_LOOKBACK_DAYS,
    14,
    "REVIEW_PROMPT_LOOKBACK_DAYS"
  ),
  // "Open" viewings (no fixed date - approved immediately, visit anytime) have
  // no requestedDate to anchor a review prompt on, unlike scheduled ones. This
  // is how long after creation one is assumed to have actually happened.
  openViewingCompletionDelayMs: parseHoursToMs(
    process.env.OPEN_VIEWING_COMPLETION_DELAY_HOURS,
    48,
    "OPEN_VIEWING_COMPLETION_DELAY_HOURS"
  ),
};

export default env;
