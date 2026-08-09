import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it } from "../helpers/nodeTestCompat.js";
import {
  getDatabaseHealth,
  getHealth,
  getReadiness,
} from "../../controllers/healthController.js";

const createResponse = () => ({
  body: null,
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

// These endpoints are public and unauthenticated (see healthRoutes.js), so
// the live Mongo host/db name and any raw driver error message must never
// appear in the response - only a generic status/message.
describe("healthController", () => {
  it("never exposes the Mongo host/db name/connection-string path on GET /api/health", () => {
    const res = createResponse();

    getHealth({}, res);

    assert.equal(res.body.database.host, undefined);
    assert.equal(res.body.database.name, undefined);
    assert.equal(res.body.database.path, undefined);
  });

  describe("with a database ping failure", () => {
    let originalReadyState;
    let originalDb;

    afterEach(() => {
      Object.defineProperty(mongoose.connection, "readyState", {
        value: originalReadyState,
        configurable: true,
      });
      mongoose.connection.db = originalDb;
    });

    const simulateBrokenPing = (message) => {
      originalReadyState = mongoose.connection.readyState;
      originalDb = mongoose.connection.db;

      Object.defineProperty(mongoose.connection, "readyState", { value: 1, configurable: true });
      mongoose.connection.db = {
        admin: () => ({
          ping: async () => {
            throw new Error(message);
          },
        }),
      };
    };

    it("replaces the raw driver error with a generic message on /api/health/ready", async () => {
      simulateBrokenPing("MongoServerError: bad auth : authentication failed for user admin@10.0.4.7");
      const res = createResponse();

      await getReadiness({}, res);

      assert.equal(res.statusCode, 503);
      assert.equal(res.body.database.message, "Database is not reachable");
      assert.equal(res.body.database.host, undefined);
      assert.equal(res.body.database.name, undefined);
      assert.equal(res.body.database.path, undefined);
    });

    it("replaces the raw driver error with a generic message on /api/health/database", async () => {
      simulateBrokenPing("MongoServerError: bad auth : authentication failed for user admin@10.0.4.7");
      const res = createResponse();

      await getDatabaseHealth({}, res);

      assert.equal(res.statusCode, 503);
      assert.equal(res.body.database.message, "Database is not reachable");
      assert.equal(res.body.database.host, undefined);
      assert.equal(res.body.database.name, undefined);
      assert.equal(res.body.database.path, undefined);
    });
  });
});
