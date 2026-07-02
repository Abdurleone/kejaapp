import httpStatus from "../constants/httpStatus.js";
import env from "../config/env.js";
import getRedisClient from "../config/redisClient.js";
import { logWarn } from "../utils/logger.js";

const stores = new Map();

// cleanupStore only sweeps expired entries when some key's window has
// already lapsed, so a burst of distinct clients that are all still within
// their window won't trigger a sweep. Cap store size as a hard backstop so
// a spike of unique IPs can't grow a namespace's Map unbounded.
const maxEntriesPerNamespace = 5000;

const getClientKey = (req) =>
  req.ip ||
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.socket?.remoteAddress ||
  "unknown";

const cleanupStore = (store, now) => {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
};

const memoryIncr = (name, key, windowMs) => {
  const store = stores.get(name) || new Map();
  stores.set(name, store);

  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    cleanupStore(store, now);
    const entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);

    while (store.size > maxEntriesPerNamespace) {
      store.delete(store.keys().next().value);
    }

    return entry;
  }

  current.count += 1;
  return current;
};

const redisIncr = async (name, key, windowMs) => {
  const client = await getRedisClient();

  if (!client) {
    return memoryIncr(name, key, windowMs);
  }

  const redisKey = `ratelimit:${name}:${key}`;

  try {
    const count = await client.incr(redisKey);

    if (count === 1) {
      await client.pexpire(redisKey, windowMs);
    }

    const pttl = await client.pttl(redisKey);
    return { count, resetAt: Date.now() + (pttl > 0 ? pttl : windowMs) };
  } catch (error) {
    logWarn(`Redis rate limit check failed, falling back to in-memory: ${error.message}`);
    return memoryIncr(name, key, windowMs);
  }
};

const respondTooManyRequests = (res, resetAt) => {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(httpStatus.TOO_MANY_REQUESTS).json({
    message: "Too many requests, please try again later",
    retryAfterSeconds,
  });
};

// Stays fully synchronous (same behavior/tests as before) when Redis isn't
// configured; only goes async when REDIS_URL enables cross-instance limits.
const createRateLimiter = ({ name, windowMs, max }) => (req, res, next) => {
  const key = getClientKey(req);

  if (!env.redisUrl) {
    const { count, resetAt } = memoryIncr(name, key, windowMs);

    if (count > max) {
      respondTooManyRequests(res, resetAt);
      return;
    }

    next();
    return;
  }

  redisIncr(name, key, windowMs)
    .then(({ count, resetAt }) => {
      if (count > max) {
        respondTooManyRequests(res, resetAt);
        return;
      }

      next();
    })
    .catch(() => next());
};

const resetRateLimiters = () => {
  for (const store of stores.values()) {
    store.clear();
  }
};

export { createRateLimiter, resetRateLimiters };
