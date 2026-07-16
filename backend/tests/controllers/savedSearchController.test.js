import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  createSavedSearch,
  deleteSavedSearch,
  listMySavedSearches,
} from "../../controllers/savedSearchController.js";
import SavedSearch from "../../models/SavedSearch.js";

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

const createSavedSearchQuery = (savedSearches) => ({
  sort() {
    return this;
  },
  skip() {
    return this;
  },
  limit() {
    return Promise.resolve(savedSearches);
  },
});

describe("savedSearchController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("creates a saved search for the current user", async () => {
    const userId = new mongoose.Types.ObjectId();
    const created = { _id: new mongoose.Types.ObjectId(), user: userId, county: "Nairobi" };

    const create = mock.method(SavedSearch, "create", async (payload) => {
      assert.deepEqual(payload, { county: "Nairobi", user: userId });
      return created;
    });

    const req = { user: { _id: userId }, body: { county: "Nairobi" } };
    const res = createResponse();

    await createSavedSearch(req, res, (error) => {
      throw error;
    });

    assert.equal(create.mock.callCount(), 1);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data, created);
  });

  it("rejects lat without lng", async () => {
    const req = { user: { _id: new mongoose.Types.ObjectId() }, body: { lat: -1.29 } };
    const res = createResponse();
    let nextError;

    await createSavedSearch(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.match(nextError.message, /lat and lng must be provided together/);
  });

  it("rejects an out-of-range latitude", async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { lat: 200, lng: 36.8 },
    };
    const res = createResponse();
    let nextError;

    await createSavedSearch(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.match(nextError.message, /lat must be a number between -90 and 90/);
  });

  it("rejects radiusKm without lat and lng", async () => {
    const req = { user: { _id: new mongoose.Types.ObjectId() }, body: { radiusKm: 5 } };
    const res = createResponse();
    let nextError;

    await createSavedSearch(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.match(nextError.message, /radiusKm requires lat and lng/);
  });

  it("lists only the current user's saved searches", async () => {
    const userId = new mongoose.Types.ObjectId();
    let filters;

    mock.method(SavedSearch, "find", (query) => {
      filters = query;
      return createSavedSearchQuery([]);
    });
    mock.method(SavedSearch, "countDocuments", async () => 0);

    const req = { user: { _id: userId } };
    const res = createResponse();

    await listMySavedSearches(req, res, (error) => {
      throw error;
    });

    assert.deepEqual(filters, { user: userId });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, []);
    assert.deepEqual(res.body.pagination, { page: 1, limit: 20, total: 0, pages: 0 });
  });

  it("deletes a saved search owned by the current user", async () => {
    const userId = new mongoose.Types.ObjectId();
    const savedSearchId = new mongoose.Types.ObjectId();
    const savedSearch = { _id: savedSearchId, user: userId, async deleteOne() {} };

    mock.method(SavedSearch, "findOne", async () => savedSearch);

    const req = { user: { _id: userId }, params: { id: savedSearchId.toString() } };
    const res = createResponse();

    await deleteSavedSearch(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
  });

  it("returns not found when deleting a missing saved search", async () => {
    mock.method(SavedSearch, "findOne", async () => null);

    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      params: { id: new mongoose.Types.ObjectId().toString() },
    };
    const res = createResponse();
    let nextError;

    await deleteSavedSearch(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Saved search not found");
  });
});
