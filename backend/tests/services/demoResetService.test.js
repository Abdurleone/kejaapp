import assert from "node:assert/strict";
import { describe, it } from "node:test";
import mongoose from "mongoose";
import { getDemoCollectionSummary } from "../../services/demoResetService.js";

const fakeDb = (countsByName) => ({
  listCollections: () => ({
    toArray: async () => Object.keys(countsByName).map((name) => ({ name })),
  }),
  collection: (name) => ({
    estimatedDocumentCount: async () => countsByName[name] || 0,
  }),
});

describe("demoResetService: getDemoCollectionSummary", () => {
  it("counts every non-system collection and skips mongoose's internal ones", async () => {
    const originalDb = mongoose.connection.db;

    mongoose.connection.db = fakeDb({
      users: 3,
      properties: 0,
      "system.views": 1,
    });

    try {
      const counts = await getDemoCollectionSummary();

      assert.deepEqual(counts, { users: 3, properties: 0 });
    } finally {
      mongoose.connection.db = originalDb;
    }
  });

  it("returns an empty summary when there are no collections", async () => {
    const originalDb = mongoose.connection.db;
    mongoose.connection.db = fakeDb({});

    try {
      const counts = await getDemoCollectionSummary();

      assert.deepEqual(counts, {});
    } finally {
      mongoose.connection.db = originalDb;
    }
  });
});
