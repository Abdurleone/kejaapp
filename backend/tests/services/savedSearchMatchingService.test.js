import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { notifyMatchingSavedSearches } from "../../services/savedSearchMatchingService.js";
import DeviceToken from "../../models/DeviceToken.js";
import Notification from "../../models/Notification.js";
import Property from "../../models/Property.js";
import SavedSearch from "../../models/SavedSearch.js";

// Facet results are keyed by index, one array per saved search - empty when
// that saved search's filter didn't match, containing the property when it did.
const facetResult = (matches) => [matches.reduce((byIndex, isMatch, index) => {
  byIndex[index] = isMatch ? [{ _id: "match" }] : [];
  return byIndex;
}, {})];

describe("savedSearchMatchingService", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("notifies the owner of a matching saved search", async () => {
    const savedSearchUser = new mongoose.Types.ObjectId();
    const property = {
      _id: new mongoose.Types.ObjectId(),
      status: "available",
      title: "Modern Kilimani Apartment",
    };
    const savedSearch = {
      _id: new mongoose.Types.ObjectId(),
      user: savedSearchUser,
      county: "Nairobi",
    };

    mock.method(SavedSearch, "find", () => ({ lean: async () => [savedSearch] }));
    mock.method(Property, "aggregate", async () => facetResult([true]));
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    await notifyMatchingSavedSearches(property);

    assert.equal(create.mock.callCount(), 1);
    const [notification] = create.mock.calls[0].arguments;
    assert.equal(notification.user, savedSearchUser);
    assert.equal(notification.type, "saved_search");
    assert.equal(notification.data.property, property._id);
    assert.equal(notification.data.savedSearch, savedSearch._id);
  });

  it("does not notify when the property does not match the saved search", async () => {
    const property = {
      _id: new mongoose.Types.ObjectId(),
      status: "available",
      title: "Modern Kilimani Apartment",
    };
    const savedSearch = {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      county: "Mombasa",
    };

    mock.method(SavedSearch, "find", () => ({ lean: async () => [savedSearch] }));
    mock.method(Property, "aggregate", async () => facetResult([false]));
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    await notifyMatchingSavedSearches(property);

    assert.equal(create.mock.callCount(), 0);
  });

  it("derives a bedrooms filter from the saved search", async () => {
    const property = { _id: new mongoose.Types.ObjectId(), status: "available" };
    const savedSearch = {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      bedrooms: 2,
    };

    mock.method(SavedSearch, "find", () => ({ lean: async () => [savedSearch] }));
    let capturedPipeline;
    mock.method(Property, "aggregate", async (pipeline) => {
      capturedPipeline = pipeline;
      return facetResult([false]);
    });

    await notifyMatchingSavedSearches(property);

    const [, facetStage] = capturedPipeline;
    assert.deepEqual(facetStage.$facet[0][0].$match.bedrooms, { $gte: 2 });
  });

  it("evaluates every saved search's filter in a single aggregation call, not one round trip each", async () => {
    const property = { _id: new mongoose.Types.ObjectId(), status: "available" };
    const savedSearches = [
      { _id: new mongoose.Types.ObjectId(), user: new mongoose.Types.ObjectId(), county: "Nairobi" },
      { _id: new mongoose.Types.ObjectId(), user: new mongoose.Types.ObjectId(), county: "Mombasa" },
      { _id: new mongoose.Types.ObjectId(), user: new mongoose.Types.ObjectId(), county: "Kisumu" },
    ];

    mock.method(SavedSearch, "find", () => ({ lean: async () => savedSearches }));
    const aggregate = mock.method(Property, "aggregate", async () => facetResult([true, false, true]));
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    await notifyMatchingSavedSearches(property);

    assert.equal(aggregate.mock.callCount(), 1);
    assert.equal(create.mock.callCount(), 2);
  });

  it("skips matching entirely for properties that are not yet available", async () => {
    const property = { _id: new mongoose.Types.ObjectId(), status: "draft" };
    const find = mock.method(SavedSearch, "find", () => ({ lean: async () => [] }));

    await notifyMatchingSavedSearches(property);

    assert.equal(find.mock.callCount(), 0);
  });

  it("skips the aggregation call entirely when there are no saved searches", async () => {
    const property = { _id: new mongoose.Types.ObjectId(), status: "available" };
    mock.method(SavedSearch, "find", () => ({ lean: async () => [] }));
    const aggregate = mock.method(Property, "aggregate", async () => facetResult([]));

    await notifyMatchingSavedSearches(property);

    assert.equal(aggregate.mock.callCount(), 0);
  });
});
