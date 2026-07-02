import assert from "node:assert/strict";
import { afterEach, describe, it } from "../helpers/nodeTestCompat.js";
import { createRateLimiter, resetRateLimiters } from "../../middlewares/rateLimiter.js";

const createResponse = () => ({
  body: null,
  headers: {},
  statusCode: 200,
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

describe("rateLimiter", () => {
  afterEach(() => {
    resetRateLimiters();
  });

  it("rejects requests after the configured limit", () => {
    const limiter = createRateLimiter({
      name: "test",
      windowMs: 60000,
      max: 1,
    });
    const req = {
      ip: "127.0.0.1",
      headers: {},
    };
    const first = createResponse();
    const second = createResponse();
    let firstNextCalled = false;

    limiter(req, first, () => {
      firstNextCalled = true;
    });
    limiter(req, second, () => {});

    assert.equal(firstNextCalled, true);
    assert.equal(second.statusCode, 429);
    assert.equal(second.body.message, "Too many requests, please try again later");
    assert.equal(second.headers["Retry-After"], "60");
  });

  it("evicts the oldest client entry once a namespace exceeds its size cap", () => {
    const limiter = createRateLimiter({
      name: "eviction-test",
      windowMs: 60000,
      max: 1,
    });

    const firstClientReq = { ip: "10.0.0.1", headers: {} };
    limiter(firstClientReq, createResponse(), () => {});

    // The cap is 5000 entries; flooding 5000 other clients should push the
    // very first client's entry out instead of growing the store forever.
    for (let index = 0; index < 5000; index += 1) {
      const floodReq = { ip: `flood-client-${index}`, headers: {} };
      limiter(floodReq, createResponse(), () => {});
    }

    // If the first client's entry was evicted, this request is treated as a
    // fresh window (allowed) instead of being blocked as a second request.
    const res = createResponse();
    let nextCalled = false;
    limiter(firstClientReq, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true, "the evicted client's entry should have reset instead of staying blocked");
    assert.equal(res.statusCode, 200);
  });
});
