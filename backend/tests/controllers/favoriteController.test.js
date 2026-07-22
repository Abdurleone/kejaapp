import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { listFavorites, removeFavorite, saveFavorite } from "../../controllers/favoriteController.js";
import Favorite from "../../models/Favorite.js";
import Property from "../../models/Property.js";

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

describe("favoriteController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("returns not found when saving a missing property", async () => {
    mock.method(Property, "findById", async () => null);
    const req = {
      params: { propertyId: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await saveFavorite(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Property not found");
  });

  it("rejects duplicate saved properties", async () => {
    const propertyId = new mongoose.Types.ObjectId();
    mock.method(Property, "findById", async () => ({ _id: propertyId }));
    mock.method(Favorite, "findOne", async () => ({ _id: new mongoose.Types.ObjectId() }));
    const req = {
      params: { propertyId: propertyId.toString() },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await saveFavorite(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 409);
    assert.equal(nextError.message, "Property is already saved");
  });

  it("lists the current user's favorites with pagination", async () => {
    const userId = new mongoose.Types.ObjectId();
    const expectedData = [{ property: { title: "Modern Kilimani Apartment" } }];
    let findFilters;
    let skipArg;
    let limitArg;

    mock.method(Favorite, "find", (filters) => {
      findFilters = filters;

      return {
        sort() {
          return this;
        },
        skip(value) {
          skipArg = value;
          return this;
        },
        limit(value) {
          limitArg = value;
          return this;
        },
        populate() {
          return this;
        },
        lean: async () => expectedData,
      };
    });
    mock.method(Favorite, "countDocuments", async () => 1);

    const req = { query: { page: "2", limit: "5" }, user: { _id: userId } };
    const res = createResponse();

    await listFavorites(req, res, (error) => {
      throw error;
    });

    assert.deepEqual(findFilters, { user: userId });
    assert.equal(skipArg, 5);
    assert.equal(limitArg, 5);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].property.title, "Modern Kilimani Apartment");
    assert.deepEqual(res.body.pagination, { page: 2, limit: 5, total: 1, pages: 1 });
  });

  it("removes favorites idempotently", async () => {
    const remove = mock.method(Favorite, "findOneAndDelete", async () => null);
    const req = {
      params: { propertyId: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();

    await removeFavorite(req, res, (error) => {
      throw error;
    });

    assert.equal(remove.mock.callCount(), 1);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, "Property removed from favorites");
  });
});
