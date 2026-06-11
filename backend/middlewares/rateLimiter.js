import httpStatus from "../constants/httpStatus.js";

const stores = new Map();

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

const createRateLimiter = ({ name, windowMs, max }) => {
  const store = stores.get(name) || new Map();
  stores.set(name, store);

  return (req, res, next) => {
    const now = Date.now();
    const key = getClientKey(req);
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      cleanupStore(store, now);
      store.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);

      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(httpStatus.TOO_MANY_REQUESTS).json({
        message: "Too many requests, please try again later",
        retryAfterSeconds,
      });
      return;
    }

    next();
  };
};

const resetRateLimiters = () => {
  for (const store of stores.values()) {
    store.clear();
  }
};

export { createRateLimiter, resetRateLimiters };
