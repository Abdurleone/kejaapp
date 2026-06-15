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
});
