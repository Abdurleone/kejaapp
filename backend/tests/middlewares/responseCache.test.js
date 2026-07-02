import assert from "node:assert/strict";
import { afterEach, describe, it } from "../helpers/nodeTestCompat.js";
import { cacheResponse, invalidateNamespace } from "../../middlewares/responseCache.js";

const createResponse = () => ({
  statusCode: 200,
  headers: {},
  body: null,
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

describe("responseCache", () => {
  afterEach(async () => {
    await invalidateNamespace("test-namespace");
    await invalidateNamespace("eviction-namespace");
  });

  it("caches a 2xx GET response and serves it on the next request", () => {
    const middleware = cacheResponse({ namespace: "test-namespace", ttlMs: 60000 });
    let handlerCalls = 0;
    const req = { originalUrl: "/api/properties" };

    const respond = (res) => {
      handlerCalls += 1;
      res.status(200).json({ data: [1, 2, 3] });
    };

    const first = createResponse();
    middleware(req, first, () => respond(first));

    const second = createResponse();
    middleware(req, second, () => respond(second));

    assert.equal(handlerCalls, 1);
    assert.deepEqual(second.body, { data: [1, 2, 3] });
    assert.equal(first.headers["X-Cache"], "MISS");
    assert.equal(second.headers["X-Cache"], "HIT");
  });

  it("does not cache non-2xx responses", () => {
    const middleware = cacheResponse({ namespace: "test-namespace", ttlMs: 60000 });
    let handlerCalls = 0;
    const req = { originalUrl: "/api/properties/missing" };

    const respond = (res) => {
      handlerCalls += 1;
      res.status(404).json({ message: "Not found" });
    };

    const first = createResponse();
    middleware(req, first, () => respond(first));

    const second = createResponse();
    middleware(req, second, () => respond(second));

    assert.equal(handlerCalls, 2);
  });

  it("treats different URLs as separate cache entries", () => {
    const middleware = cacheResponse({ namespace: "test-namespace", ttlMs: 60000 });
    let handlerCalls = 0;

    const respond = (res, body) => {
      handlerCalls += 1;
      res.status(200).json(body);
    };

    const first = createResponse();
    middleware({ originalUrl: "/api/properties?page=1" }, first, () => respond(first, { page: 1 }));

    const second = createResponse();
    middleware({ originalUrl: "/api/properties?page=2" }, second, () => respond(second, { page: 2 }));

    assert.equal(handlerCalls, 2);
    assert.deepEqual(first.body, { page: 1 });
    assert.deepEqual(second.body, { page: 2 });
  });

  it("serves fresh responses again after invalidateNamespace", async () => {
    const middleware = cacheResponse({ namespace: "test-namespace", ttlMs: 60000 });
    let handlerCalls = 0;
    const req = { originalUrl: "/api/properties" };

    const respond = (res) => {
      handlerCalls += 1;
      res.status(200).json({ data: [] });
    };

    const first = createResponse();
    middleware(req, first, () => respond(first));

    await invalidateNamespace("test-namespace");

    const second = createResponse();
    middleware(req, second, () => respond(second));

    assert.equal(handlerCalls, 2);
  });

  it("evicts the oldest entry once a namespace exceeds its size cap", () => {
    const middleware = cacheResponse({ namespace: "eviction-namespace", ttlMs: 60000 });
    const respond = (res, body) => {
      res.status(200).json(body);
    };

    // The cap is 500 entries; filling 501 distinct URLs should push out the
    // very first one instead of growing the store forever.
    for (let index = 0; index < 501; index += 1) {
      const res = createResponse();
      middleware({ originalUrl: `/api/properties?page=${index}` }, res, () => respond(res, { page: index }));
    }

    let firstUrlHandlerCalls = 0;
    const evictedCheck = createResponse();
    middleware({ originalUrl: "/api/properties?page=0" }, evictedCheck, () => {
      firstUrlHandlerCalls += 1;
      respond(evictedCheck, { page: 0 });
    });

    let lastUrlHandlerCalls = 0;
    const retainedCheck = createResponse();
    middleware({ originalUrl: "/api/properties?page=500" }, retainedCheck, () => {
      lastUrlHandlerCalls += 1;
      respond(retainedCheck, { page: 500 });
    });

    assert.equal(firstUrlHandlerCalls, 1, "the oldest entry should have been evicted, causing a fresh handler call");
    assert.equal(lastUrlHandlerCalls, 0, "the most recent entry should still be cached");
  });
});
