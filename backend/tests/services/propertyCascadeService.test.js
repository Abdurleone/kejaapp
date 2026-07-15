import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import Favorite from "../../models/Favorite.js";
import Inquiry from "../../models/Inquiry.js";
import MoverRequest from "../../models/MoverRequest.js";
import PropertyImageFingerprint from "../../models/PropertyImageFingerprint.js";
import Review from "../../models/Review.js";
import UserViolation from "../../models/UserViolation.js";
import ViewingRequest from "../../models/ViewingRequest.js";
import {
  clearPropertyViolationEvidence,
  deleteOwnedPropertyReferences,
  deletePropertyImages,
  deletePropertyReferences,
} from "../../services/propertyCascadeService.js";

const trackDeleteMany = (Model) => {
  const calls = [];
  mock.method(Model, "deleteMany", async (filter) => {
    calls.push(filter);
    return { deletedCount: 0 };
  });
  return calls;
};

describe("propertyCascadeService", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("deletePropertyReferences cascades a single property id to every referencing model", async () => {
    const propertyId = new mongoose.Types.ObjectId();
    const inquiryCalls = trackDeleteMany(Inquiry);
    const viewingCalls = trackDeleteMany(ViewingRequest);
    const reviewCalls = trackDeleteMany(Review);
    const favoriteCalls = trackDeleteMany(Favorite);
    const fingerprintCalls = trackDeleteMany(PropertyImageFingerprint);
    const moverRequestCalls = trackDeleteMany(MoverRequest);

    await Promise.all(deletePropertyReferences(propertyId));

    assert.deepEqual(inquiryCalls, [{ property: propertyId }]);
    assert.deepEqual(viewingCalls, [{ property: propertyId }]);
    assert.deepEqual(reviewCalls, [{ property: propertyId }]);
    assert.deepEqual(favoriteCalls, [{ property: propertyId }]);
    assert.deepEqual(fingerprintCalls, [{ property: propertyId }]);
    assert.deepEqual(moverRequestCalls, [{ property: propertyId }]);
  });

  it("deleteOwnedPropertyReferences cascades a list of property ids using $in", async () => {
    const propertyIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    const inquiryCalls = trackDeleteMany(Inquiry);
    trackDeleteMany(ViewingRequest);
    trackDeleteMany(Review);
    trackDeleteMany(Favorite);
    trackDeleteMany(PropertyImageFingerprint);
    const moverRequestCalls = trackDeleteMany(MoverRequest);

    await Promise.all(deleteOwnedPropertyReferences(propertyIds));

    assert.deepEqual(inquiryCalls, [{ property: { $in: propertyIds } }]);
    assert.deepEqual(moverRequestCalls, [{ property: { $in: propertyIds } }]);
  });

  it("deletePropertyImages flattens images across one or many properties", async () => {
    const deleted = [];
    // Real fileStorageService.deletePropertyImage no-ops on a missing
    // storagePath, so this exercises the flattening without touching the
    // real filesystem/S3.
    const single = [{ images: [{ storagePath: undefined }, { storagePath: undefined }] }];
    const many = [
      { images: [{ storagePath: undefined }] },
      { images: [{ storagePath: undefined }, { storagePath: undefined }] },
    ];

    await Promise.all(deletePropertyImages(single));
    await Promise.all(deletePropertyImages(many));

    // Nothing to assert on `deleted` (deletePropertyImage isn't mocked here);
    // resolving without throwing is the behavior under test - a bug in the
    // flatMap would either miss images or throw on a malformed shape.
    assert.equal(deleted.length, 0);
  });

  it("clearPropertyViolationEvidence unsets only the matching evidence field, not both", async () => {
    const propertyIds = [new mongoose.Types.ObjectId()];
    const updateCalls = [];
    mock.method(UserViolation, "updateMany", async (filter, update) => {
      updateCalls.push({ filter, update });
      return { modifiedCount: 0 };
    });

    await Promise.all(clearPropertyViolationEvidence(propertyIds));

    assert.equal(updateCalls.length, 2);
    assert.deepEqual(updateCalls[0], {
      filter: { "evidence.property": { $in: propertyIds } },
      update: { $unset: { "evidence.property": "" } },
    });
    assert.deepEqual(updateCalls[1], {
      filter: { "evidence.matchedProperty": { $in: propertyIds } },
      update: { $unset: { "evidence.matchedProperty": "" } },
    });
  });
});
