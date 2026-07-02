import env from "./env.js";
import { logWarn } from "../utils/logger.js";

let clientPromise = null;

// Returns null synchronously when REDIS_URL is not configured so callers
// on the hot path (rate limiter, response cache) can stay fully synchronous
// in the common single-instance/local-dev case.
const getRedisClient = () => {
  if (!env.redisUrl) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = import("ioredis")
      .then(({ default: Redis }) => {
        const client = new Redis(env.redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });

        client.on("error", (error) => {
          logWarn(`Redis error: ${error.message}`);
        });

        return client.connect().then(() => client);
      })
      .catch((error) => {
        logWarn(`Redis connection failed, falling back to in-memory store: ${error.message}`);
        return null;
      });
  }

  return clientPromise;
};

export default getRedisClient;
