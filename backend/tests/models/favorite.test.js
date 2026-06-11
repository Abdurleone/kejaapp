import assert from "node:assert/strict";
import mongoose from "mongoose";
import { describe, it } from "node:test";
import Favorite from "../../models/Favorite.js";

describe("Favorite model", () => {
  it("stores user and property references", () => {
    const user = new mongoose.Types.ObjectId();
    const property = new mongoose.Types.ObjectId();
    const favorite = new Favorite({
      user,
      property,
    });

    assert.equal(favorite.user, user);
    assert.equal(favorite.property, property);
  });

  it("defines a unique user-property index", () => {
    const indexes = Favorite.schema.indexes();
    const uniqueIndex = indexes.find(([fields, options]) =>
      fields.user === 1 && fields.property === 1 && options.unique === true
    );

    assert.ok(uniqueIndex);
  });
});
