import assert from "node:assert/strict";
import mongoose from "mongoose";
import { describe, it } from "node:test";
import SavedSearch from "../../models/SavedSearch.js";

describe("SavedSearch model", () => {
  it("stores a user reference and search criteria", () => {
    const user = new mongoose.Types.ObjectId();
    const savedSearch = new SavedSearch({
      user,
      lat: -1.2921,
      lng: 36.8219,
      radiusKm: 5,
      minRent: 10000,
      maxRent: 30000,
      county: "Nairobi",
      town: "Westlands",
      type: "apartment",
      bedrooms: 2,
    });

    assert.equal(savedSearch.user, user);
    assert.equal(savedSearch.lat, -1.2921);
    assert.equal(savedSearch.lng, 36.8219);
    assert.equal(savedSearch.radiusKm, 5);
    assert.equal(savedSearch.county, "Nairobi");
    assert.equal(savedSearch.type, "apartment");
  });

  it("requires a user", async () => {
    const savedSearch = new SavedSearch({ county: "Nairobi" });
    const error = savedSearch.validateSync();

    assert.ok(error.errors.user);
  });

  it("rejects a listing type outside the known enum", () => {
    const savedSearch = new SavedSearch({
      user: new mongoose.Types.ObjectId(),
      type: "mansion",
    });
    const error = savedSearch.validateSync();

    assert.ok(error.errors.type);
  });
});
