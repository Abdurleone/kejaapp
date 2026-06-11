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
});
