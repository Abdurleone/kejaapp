import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { notifyMatchingSavedSearches } from "../../services/savedSearchMatchingService.js";
import DeviceToken from "../../models/DeviceToken.js";
import Notification from "../../models/Notification.js";
import Property from "../../models/Property.js";
import SavedSearch from "../../models/SavedSearch.js";

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
      toObject() {
        return { county: "Nairobi" };
      },
    };

    mock.method(SavedSearch, "find", async () => [savedSearch]);
    mock.method(Property, "exists", async () => true);
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
      toObject() {
        return { county: "Mombasa" };
      },
    };

    mock.method(SavedSearch, "find", async () => [savedSearch]);
    mock.method(Property, "exists", async () => false);
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
      toObject() {
        return { bedrooms: 2 };
      },
    };

    mock.method(SavedSearch, "find", async () => [savedSearch]);
    let capturedFilters;
    mock.method(Property, "exists", async (filters) => {
      capturedFilters = filters;
      return false;
    });

    await notifyMatchingSavedSearches(property);

    assert.deepEqual(capturedFilters.bedrooms, { $gte: 2 });
  });

  it("skips matching entirely for properties that are not yet available", async () => {
    const property = { _id: new mongoose.Types.ObjectId(), status: "draft" };
    const find = mock.method(SavedSearch, "find", async () => []);

    await notifyMatchingSavedSearches(property);

    assert.equal(find.mock.callCount(), 0);
  });
});
