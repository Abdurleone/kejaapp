import assert from "node:assert/strict";
import { describe, it } from "node:test";
import mongoose from "mongoose";
import { dumpCollections } from "../../scripts/backupDatabase.js";

const fakeDb = (collectionsByName) => ({
  listCollections: () => ({
    toArray: async () => Object.keys(collectionsByName).map((name) => ({ name })),
  }),
  collection: (name) => ({
    find: () => ({ toArray: async () => collectionsByName[name] || [] }),
  }),
});

describe("backupDatabase: dumpCollections", () => {
  it("dumps every non-system collection and skips mongoose's internal ones", async () => {
    const originalDb = mongoose.connection.db;

    mongoose.connection.db = fakeDb({
      users: [
        { _id: new mongoose.Types.ObjectId(), email: "a@example.com" },
        { _id: new mongoose.Types.ObjectId(), email: "b@example.com" },
      ],
      properties: [],
      "system.views": [{ _id: 1 }],
    });

    try {
      const { backup, totalDocs, collectionCount } = await dumpCollections();

      assert.deepEqual(Object.keys(backup).sort(), ["properties", "users"]);
      assert.equal(collectionCount, 2);
      assert.equal(totalDocs, 2);
      assert.equal(backup.users.length, 2);
    } finally {
      mongoose.connection.db = originalDb;
    }
  });

  it("returns an empty backup when there are no collections", async () => {
    const originalDb = mongoose.connection.db;
    mongoose.connection.db = fakeDb({});

    try {
      const { backup, totalDocs, collectionCount } = await dumpCollections();

      assert.deepEqual(backup, {});
      assert.equal(totalDocs, 0);
      assert.equal(collectionCount, 0);
    } finally {
      mongoose.connection.db = originalDb;
    }
  });
});
