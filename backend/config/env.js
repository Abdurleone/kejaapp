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

const parseMinutesToMs = (value, fallbackMinutes, key) => {
  const minutes = Number(value || fallbackMinutes);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error(`${key} must be a positive number`);
  }

  return minutes * 60 * 1000;
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

// A malformed value here (missing scheme, stray whitespace) previously sailed
// straight through config loading and only surfaced as an opaque
// `TypeError: Invalid URL` deep inside the AWS SDK's endpoint resolver, on
// the very first real upload - failing loudly here instead, at boot, is the
// same "fail fast with a clear message" contract every other required S3 var
// already gets below.
const assertValidUrl = (value, key) => {
  try {
    new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL (e.g. https://...), got "${value}"`);
  }
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

// Optional, same "empty = disabled" pattern as googleClientId/sentryDsn/vapid*
// above - unset means POST /api/support-payments 503s instead of trying (and
// failing) to call Daraja with empty credentials. Unlike storageDriver's s3
// mode there's no separate on/off flag; presence of these vars is the switch.
// The callback URL specifically is validated eagerly (not just at first use)
// for the same reason S3_ENDPOINT/S3_PUBLIC_BASE_URL are below - a malformed
// value should crash loudly at boot, not silently until Safaricom's servers
// try to reach it and just... can't, with no error visible anywhere in this
// app's own logs.
if (process.env.MPESA_CALLBACK_URL) {
  assertValidUrl(process.env.MPESA_CALLBACK_URL, "MPESA_CALLBACK_URL");
}

// Required as soon as the rest of the M-Pesa config is present, not just an
// optional hardening extra: Safaricom's STK callback carries no signature of
// its own, and the CheckoutRequestID handleMpesaCallback looks payments up by
// is returned directly to the initiating user in initiateSupportPayment's own
// response - so it can't double as an unguessable secret against that same
// user forging their own "payment completed" callback. This value never
// reaches any client; it's appended to MPESA_CALLBACK_URL's path when
// registering the callback with Safaricom, then compared against the
// incoming request's own path segment (see supportPaymentRoutes.js).
if (
  process.env.MPESA_CONSUMER_KEY &&
  process.env.MPESA_CONSUMER_SECRET &&
  process.env.MPESA_SHORTCODE &&
  process.env.MPESA_PASSKEY &&
  process.env.MPESA_CALLBACK_URL &&
  !process.env.MPESA_CALLBACK_SECRET
) {
  throw new Error("MPESA_CALLBACK_SECRET is required once the other MPESA_* variables are set");
}

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

  assertValidUrl(s3Config.s3PublicBaseUrl, "S3_PUBLIC_BASE_URL");

  if (s3Config.s3Endpoint) {
    assertValidUrl(s3Config.s3Endpoint, "S3_ENDPOINT");
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
  // Double-submit CSRF token, set alongside the auth cookies. Deliberately
  // NOT httpOnly - not because the frontend reads it via document.cookie
  // (it doesn't - see client.js's setCsrfToken/apiFetch, which learn the
  // value from response bodies instead, since a cross-origin deployment
  // makes this cookie invisible to the frontend's own JS anyway) but so a
  // same-origin deployment (see authCookieSameSite below) could go back to
  // reading it directly without a backend change, if ever wanted.
  csrfCookieName: process.env.CSRF_COOKIE_NAME || "keja_csrf",
  authCookieMaxAge: parseCookieMaxAge(process.env.AUTH_COOKIE_MAX_AGE_DAYS),
  authCookieSecure: process.env.AUTH_COOKIE_SECURE === "true",
  // Independent of authCookieSecure on purpose: "served over HTTPS" and
  // "frontend/backend are different origins" happen to correlate in today's
  // split Render deployment (hence the pre-existing default below, which
  // preserves that exact behavior when this var is unset - docker-compose/
  // Kubernetes stay cross-origin and need "none" regardless of HTTPS), but
  // a consolidated same-origin deployment wants secure:true + sameSite:"lax"
  // together, which the old single ternary couldn't express.
  authCookieSameSite:
    process.env.AUTH_COOKIE_SAME_SITE || (process.env.AUTH_COOKIE_SECURE === "true" ? "none" : "lax"),
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
  // Optional, same "empty = disabled" pattern as redisUrl/clamavHost/vapid*
  // above: unset means POST /api/auth/google 503s instead of trying (and
  // failing) to verify a Google ID token against a client ID that doesn't
  // exist. The same Web OAuth client ID is reused by both the frontend's
  // Google Identity Services button and the mobile app's expo-auth-session
  // flow - see docs/dev/Authentication.md for how to create one.
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  // Optional, same "empty = disabled" pattern as googleClientId above: unset
  // means errors are only logged locally (see errorMiddleware.js) instead of
  // also being reported to Sentry. Create a project at sentry.io to get a DSN.
  sentryDsn: process.env.SENTRY_DSN || "",
  // Deliberately separate from storageDriver/s3Config above, not reused: that
  // bucket is public-read by design (property photos need to be publicly
  // viewable), so a database dump - which contains password/refresh-token
  // hashes and PII - must never land in it. Unset means
  // scripts/backupDatabase.js and scripts/restoreDatabase.js refuse to run
  // rather than silently skipping, since both are explicitly invoked by a
  // human, unlike the passive "empty = disabled" integrations above.
  backupS3Bucket: process.env.BACKUP_S3_BUCKET || "",
  backupS3Region: process.env.BACKUP_S3_REGION || "auto",
  backupS3Endpoint: process.env.BACKUP_S3_ENDPOINT || "",
  backupS3AccessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID || "",
  backupS3SecretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY || "",
  backupS3ForcePathStyle: parseBoolean(
    process.env.BACKUP_S3_FORCE_PATH_STYLE,
    false,
    "BACKUP_S3_FORCE_PATH_STYLE"
  ),
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
  maxFailedLoginAttempts: parsePositiveInteger(
    process.env.MAX_FAILED_LOGIN_ATTEMPTS,
    5,
    "MAX_FAILED_LOGIN_ATTEMPTS"
  ),
  accountLockDurationMs: parseMinutesToMs(
    process.env.ACCOUNT_LOCK_DURATION_MINUTES,
    15,
    "ACCOUNT_LOCK_DURATION_MINUTES"
  ),
  // Voluntary "support the developer" M-Pesa STK push - see
  // services/mpesaService.js. Deliberately unrelated to any tenant/landlord/
  // agency/mover payment: money goes straight to this shortcode's own owner,
  // never held or routed by kejaapp itself (see docs/compliance/code-of-ethics.md
  // for why that boundary matters here).
  mpesaConsumerKey: process.env.MPESA_CONSUMER_KEY || "",
  mpesaConsumerSecret: process.env.MPESA_CONSUMER_SECRET || "",
  mpesaShortcode: process.env.MPESA_SHORTCODE || "",
  mpesaPasskey: process.env.MPESA_PASSKEY || "",
  mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL || "",
  mpesaCallbackSecret: process.env.MPESA_CALLBACK_SECRET || "",
  mpesaEnvironment: process.env.MPESA_ENVIRONMENT === "production" ? "production" : "sandbox",
  mpesaTransactionType:
    process.env.MPESA_TRANSACTION_TYPE === "CustomerBuyGoodsOnline"
      ? "CustomerBuyGoodsOnline"
      : "CustomerPayBillOnline",
  mpesaAccountReference: process.env.MPESA_ACCOUNT_REFERENCE || "KejaApp Support",
};

// Computed after the object above rather than inline, since it depends on
// four of its own sibling fields - mirrors the single-field
// `if (!env.googleClientId)` check in authController.js, just for a
// multi-field integration instead of one DSN/key.
env.mpesaEnabled = Boolean(
  env.mpesaConsumerKey && env.mpesaConsumerSecret && env.mpesaShortcode && env.mpesaPasskey && env.mpesaCallbackUrl
);

export default env;
