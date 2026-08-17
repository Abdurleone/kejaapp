import fs from "node:fs";
import path from "node:path";
import env from "../config/env.js";

// File writes are skipped during tests (same convention morgan already
// uses) so `npm test` stays hermetic and doesn't scatter log files around.
const fileLoggingEnabled = env.nodeEnv !== "test";

const streams = {};

// Best-effort PII masking for anything written to a log file - a safety net
// against a future call site accidentally interpolating a user's email/phone
// into a log message, not a guarantee against every possible format. Applied
// to the message *before* it's prefixed with a timestamp, and to morgan's
// already-formatted access-log lines.
const emailPattern = /([a-zA-Z0-9._%+-])[a-zA-Z0-9._%+-]*(@)([a-zA-Z0-9])[a-zA-Z0-9.-]*(\.[a-zA-Z]{2,})/g;

// Matches Kenyan phone numbers specifically (0XXXXXXXXX / 254XXXXXXXXX /
// +254XXXXXXXXX, optionally space/dash-separated) rather than any long digit
// run, so timestamps, ports, and IDs elsewhere in a message aren't masked.
const phonePattern = /(?:\+?254|0)[\d\s-]{7,11}\d/g;

const maskPhoneMatch = (match) => {
  const digits = match.replace(/\D/g, "");

  if (digits.length < 9) {
    return match;
  }

  let seen = 0;
  return match.replace(/\d/g, (digit) => {
    seen += 1;
    return seen > digits.length - 3 ? digit : "*";
  });
};

const maskPii = (text) =>
  String(text)
    .replace(emailPattern, "$1***$2$3***$4")
    .replace(phonePattern, maskPhoneMatch);

const logTimeZone = "Africa/Nairobi";

// Kenya (EAT) has no daylight saving, so this is always a stable +03:00 offset.
const nairobiTimestamp = () =>
  `${new Date().toLocaleString("sv-SE", { timeZone: logTimeZone }).replace(" ", "T")}+03:00`;

// Day boundary follows Nairobi time too, so files roll over at local midnight
// rather than UTC midnight.
const todayStamp = () => new Date().toLocaleDateString("sv-SE", { timeZone: logTimeZone });

// One file per calendar day per log kind, reopened lazily when the date
// rolls over. No rotation dependency; old files just accumulate until
// something else (logrotate, a cron job, etc.) cleans them up.
const getFileStream = (kind) => {
  const today = todayStamp();
  const current = streams[kind];

  if (current && current.date === today) {
    return current.stream;
  }

  if (current) {
    current.stream.end();
  }

  fs.mkdirSync(env.logDir, { recursive: true });
  const filePath = path.join(env.logDir, `${kind}-${today}.log`);
  const stream = fs.createWriteStream(filePath, { flags: "a" });

  streams[kind] = { stream, date: today };
  return stream;
};

// Morgan writes one already-formatted line per request; just route it to
// today's access log file.
const accessLogStream = {
  write: (line) => {
    if (!fileLoggingEnabled) {
      return;
    }

    getFileStream("access").write(maskPii(line));
  },
};

const writeAppLog = (level, message) => {
  if (!fileLoggingEnabled) {
    return;
  }

  getFileStream("app").write(`${nairobiTimestamp()} [${level}] ${message}\n`);
};

const logInfo = (message) => {
  const masked = maskPii(message);
  console.log(masked);
  writeAppLog("INFO", masked);
};

const logWarn = (message) => {
  const masked = maskPii(message);
  console.warn(masked);
  writeAppLog("WARN", masked);
};

const logError = (message) => {
  const masked = maskPii(message);
  console.error(masked);
  writeAppLog("ERROR", masked);
};

// A consistent, greppable prefix for auth-relevant events (failed logins,
// account lockouts, CSRF rejections) that only ever appeared before as
// undifferentiated HTTP status codes in the generic access log - nothing
// distinguished a failed-login 401 from an expired-session 401. Routed
// through logWarn (not logError) since none of these are application
// errors on their own; PII masking still applies via logWarn.
const logSecurityEvent = (event, details = "") => {
  logWarn(`[SECURITY] ${event}${details ? ` - ${details}` : ""}`);
};

export { accessLogStream, logError, logInfo, logSecurityEvent, logWarn, maskPii, nairobiTimestamp };
