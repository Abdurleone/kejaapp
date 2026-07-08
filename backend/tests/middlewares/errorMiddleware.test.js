import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
});
