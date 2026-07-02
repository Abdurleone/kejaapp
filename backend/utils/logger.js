import fs from "node:fs";
import path from "node:path";
import env from "../config/env.js";

// File writes are skipped during tests (same convention morgan already
// uses) so `npm test` stays hermetic and doesn't scatter log files around.
const fileLoggingEnabled = env.nodeEnv !== "test";

const streams = {};

const todayStamp = () => new Date().toISOString().slice(0, 10);

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

    getFileStream("access").write(line);
  },
};

const writeAppLog = (level, message) => {
  if (!fileLoggingEnabled) {
    return;
  }

  getFileStream("app").write(`${new Date().toISOString()} [${level}] ${message}\n`);
};

const logInfo = (message) => {
  console.log(message);
  writeAppLog("INFO", message);
};

const logWarn = (message) => {
  console.warn(message);
  writeAppLog("WARN", message);
};

const logError = (message) => {
  console.error(message);
  writeAppLog("ERROR", message);
};

export { accessLogStream, logError, logInfo, logWarn };
