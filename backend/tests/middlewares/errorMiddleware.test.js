import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import env from "../../config/env.js";
import { errorHandler } from "../../middlewares/errorMiddleware.js";

const createResponse = () => {
  const response = {
    body: null,
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  return response;
};

describe("errorMiddleware", () => {
  it("maps transient Mongo network errors to service unavailable", () => {
    const error = new Error("raw TLS failure");
    error.name = "MongoNetworkError";
    const response = createResponse();

    errorHandler(error, {}, response, () => {});

    assert.equal(response.statusCode, 503);
    assert.equal(response.body.message, "Database temporarily unavailable. Please retry the request.");
  });

  it("spreads an error's details into the JSON response", () => {
    const error = new Error("Username is already taken");
    error.statusCode = 409;
    error.details = { suggestions: ["a1", "a2", "a3"] };
    const response = createResponse();

    errorHandler(error, {}, response, () => {});

    assert.equal(response.statusCode, 409);
    assert.equal(response.body.message, "Username is already taken");
    assert.deepEqual(response.body.suggestions, ["a1", "a2", "a3"]);
  });

  it("does not add a details key when an error has none", () => {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    const response = createResponse();

    errorHandler(error, {}, response, () => {});

    assert.equal("details" in response.body, false);
  });

  describe("unclassified 500s in production", () => {
    const originalNodeEnv = env.nodeEnv;

    afterEach(() => {
      env.nodeEnv = originalNodeEnv;
    });

    it("replaces a raw, unclassified exception's message with a generic one", () => {
      env.nodeEnv = "production";
      const error = new Error("ENOENT: no such file or directory, open '/app/secrets/internal.json'");
      const response = createResponse();

      errorHandler(error, { method: "GET", originalUrl: "/api/properties" }, response, () => {});

      assert.equal(response.statusCode, 500);
      assert.equal(response.body.message, "Internal server error");
    });

    it("still returns the real message outside production", () => {
      env.nodeEnv = "development";
      const error = new Error("ENOENT: no such file or directory, open '/app/secrets/internal.json'");
      const response = createResponse();

      errorHandler(error, { method: "GET", originalUrl: "/api/properties" }, response, () => {});

      assert.equal(response.statusCode, 500);
      assert.equal(response.body.message, error.message);
    });

    it("still returns a deliberately-thrown ApiError's message in production", () => {
      env.nodeEnv = "production";
      const error = new Error("Google sign-in is not configured");
      error.statusCode = 503;
      const response = createResponse();

      errorHandler(error, { method: "POST", originalUrl: "/api/auth/google" }, response, () => {});

      assert.equal(response.statusCode, 503);
      assert.equal(response.body.message, "Google sign-in is not configured");
    });
  });
});
