import env from "../config/env.js";
import getRedisClient from "../config/redisClient.js";

// Caches only expire entries lazily (on access), so without a cap a
// namespace with high key cardinality (e.g. varied property search filters)
// would grow unbounded for the life of the process. FIFO-evict the oldest
// entry once a namespace crosses this size instead of adding a sweep timer.
const maxEntriesPerNamespace = 500;

const memoryStores = new Map();

const getMemoryStore = (namespace) => {
  if (!memoryStores.has(namespace)) {
    memoryStores.set(namespace, new Map());
  }

  return memoryStores.get(namespace);
};

const readMemory = (namespace, key) => {
  const store = getMemoryStore(namespace);
  const entry = store.get(key);

  if (!entry || entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }

  return entry.value;
};

const writeMemory = (namespace, key, value, ttlMs) => {
  const store = getMemoryStore(namespace);
  store.set(key, { value, expiresAt: Date.now() + ttlMs });

  while (store.size > maxEntriesPerNamespace) {
    store.delete(store.keys().next().value);
  }
};

const readRedis = async (namespace, key) => {
  const client = await getRedisClient();

  if (!client) {
    return readMemory(namespace, key);
  }

  try {
    const raw = await client.get(`cache:${namespace}:${key}`);
    return raw === null ? undefined : JSON.parse(raw);
  } catch (error) {
    console.warn(`Redis cache read failed, falling back to in-memory: ${error.message}`);
    return readMemory(namespace, key);
  }
};

const writeRedis = async (namespace, key, value, ttlMs) => {
  const client = await getRedisClient();

  if (!client) {
    writeMemory(namespace, key, value, ttlMs);
    return;
  }

  try {
    await client.set(`cache:${namespace}:${key}`, JSON.stringify(value), "PX", ttlMs);
  } catch (error) {
    console.warn(`Redis cache write failed, falling back to in-memory: ${error.message}`);
    writeMemory(namespace, key, value, ttlMs);
  }
};

// Response caches are invalidated as a whole namespace (rather than tracking
// individual keys) because writes are infrequent relative to reads here, and
// blunt invalidation is simpler to reason about than per-key tracking.
const invalidateNamespace = async (namespace) => {
  getMemoryStore(namespace).clear();

  const client = await getRedisClient();

  if (!client) {
    return;
  }

  try {
    const keys = await client.keys(`cache:${namespace}:*`);

    if (keys.length) {
      await client.del(...keys);
    }
  } catch (error) {
    console.warn(`Redis cache invalidation failed: ${error.message}`);
  }
};

// Caches only GET responses with a 2xx status; the wrapped route handlers
// this is applied to are anonymous/public and identical for every caller,
// so keying purely on the request URL is safe.
const cacheResponse = ({ namespace, ttlMs }) => (req, res, next) => {
  const key = req.originalUrl;

  const respondWithCached = (cached) => {
    res.setHeader("X-Cache", "HIT");
    res.status(cached.status).json(cached.body);
  };

  const proceed = () => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const payload = { status: res.statusCode, body };

        if (!env.redisUrl) {
          writeMemory(namespace, key, payload, ttlMs);
        } else {
          writeRedis(namespace, key, payload, ttlMs).catch(() => {});
        }
      }

      res.setHeader("X-Cache", "MISS");
      return originalJson(body);
    };

    next();
  };

  if (!env.redisUrl) {
    const cached = readMemory(namespace, key);

    if (cached) {
      respondWithCached(cached);
      return;
    }

    proceed();
    return;
  }

  readRedis(namespace, key)
    .then((cached) => {
      if (cached) {
        respondWithCached(cached);
        return;
      }

      proceed();
    })
    .catch(() => proceed());
};

export { cacheResponse, invalidateNamespace };
