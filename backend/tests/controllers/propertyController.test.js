import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  addPropertyImage,
  createProperty,
  deleteProperty,
  getProperty,
  listMyProperties,
  listProperties,
  listPropertyMovers,
  removePropertyImage,
  updateProperty,
} from "../../controllers/propertyController.js";
import { cacheResponse, invalidateNamespace } from "../../middlewares/responseCache.js";
import Favorite from "../../models/Favorite.js";
import Inquiry from "../../models/Inquiry.js";
import Mover from "../../models/Mover.js";
import MoverRequest from "../../models/MoverRequest.js";
import Property from "../../models/Property.js";
import PropertyImageFingerprint from "../../models/PropertyImageFingerprint.js";
import Review from "../../models/Review.js";
import SavedSearch from "../../models/SavedSearch.js";
import UserViolation from "../../models/UserViolation.js";
import ViewingRequest from "../../models/ViewingRequest.js";
import DeviceToken from "../../models/DeviceToken.js";
import Notification from "../../models/Notification.js";

const createResponse = () => ({
  body: null,
  statusCode: 200,
  headers: {},
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

describe("propertyController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("strips HTML from every free-text field before creating a property", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    let createPayload;

    mock.method(Property, "create", async (payload) => {
      createPayload = payload;
      return {
        _id: new mongoose.Types.ObjectId(),
        ...payload,
        async populate() {
          return this;
        },
      };
    });

    const req = {
      body: {
        title: "<b>Spacious</b> apartment",
        description: "<script>alert(1)</script>Close to town",
        // status: "draft" so notifyMatchingSavedSearches's "available"-only
        // check short-circuits before it - no SavedSearch.find mock needed.
        status: "draft",
        amenities: ["<i>WiFi</i>", "Parking"],
        accessibilityFeatures: ["wheelchairRamp", "elevatorAccess"],
        viewingInstructions: "<a href=x>Call ahead</a>",
        location: { county: "<u>Nairobi</u>", town: "Westlands", area: "" },
        contact: { notes: "<script>bad()</script>Ask for John", availableHours: "9am<br>5pm" },
      },
      user: { _id: ownerId, role: "landlord" },
    };
    const res = createResponse();

    await createProperty(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 201);
    assert.equal(createPayload.title, "Spacious apartment");
    assert.equal(createPayload.description, "alert(1)Close to town");
    assert.deepEqual(createPayload.amenities, ["WiFi", "Parking"]);
    assert.deepEqual(createPayload.accessibilityFeatures, ["wheelchairRamp", "elevatorAccess"]);
    assert.equal(createPayload.viewingInstructions, "Call ahead");
    assert.equal(createPayload.location.county, "Nairobi");
    assert.equal(createPayload.contact.notes, "bad()Ask for John");
    assert.equal(createPayload.contact.availableHours, "9am5pm");
  });

  it("ignores a raw images array on create - images can only reach a property through the dedicated upload endpoints", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    let createPayload;

    mock.method(Property, "create", async (payload) => {
      createPayload = payload;
      return {
        _id: new mongoose.Types.ObjectId(),
        ...payload,
        async populate() {
          return this;
        },
      };
    });

    const req = {
      body: {
        title: "Spacious apartment",
        status: "draft",
        // Never validated by createPropertySchema and never scanned/checked
        // the way addPropertyImage/uploadPropertyImage validate a real
        // upload - must never reach Property.create from here.
        images: [{ url: "https://evil.example/tracker.png", alt: "x", mimeType: "image/svg+xml" }],
      },
      user: { _id: ownerId, role: "landlord" },
    };
    const res = createResponse();

    await createProperty(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 201);
    assert.equal(createPayload.images, undefined);
  });

  it("ignores a raw images array on update too, leaving existing images untouched", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const property = {
      _id: new mongoose.Types.ObjectId(),
      owner: { _id: ownerId, equals: (id) => ownerId.equals(id) },
      images: [{ url: "https://real-upload.example/a.jpg" }],
      async save() {},
      async populate() {
        return this;
      },
    };
    mock.method(Property, "findById", async () => property);

    const req = {
      params: { id: property._id.toString() },
      body: {
        title: "Updated title",
        images: [{ url: "https://evil.example/tracker.png" }],
      },
      user: { _id: ownerId, role: "landlord" },
    };
    const res = createResponse();

    await updateProperty(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(property.images, [{ url: "https://real-upload.example/a.jpg" }]);
  });

  it("notifies matching saved searches when an update flips a property from draft to available", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const savedSearchUser = new mongoose.Types.ObjectId();
    const property = {
      _id: new mongoose.Types.ObjectId(),
      owner: { _id: ownerId, equals: (id) => ownerId.equals(id) },
      status: "draft",
      async save() {},
      async populate() {
        return this;
      },
    };
    mock.method(Property, "findById", async () => property);
    mock.method(SavedSearch, "find", () => ({ lean: async () => [{ _id: new mongoose.Types.ObjectId(), user: savedSearchUser }] }));
    mock.method(Property, "aggregate", async () => [{ 0: [{ _id: "match" }] }]);
    mock.method(DeviceToken, "find", async () => []);
    const create = mock.method(Notification, "create", async (payload) => payload);

    const req = {
      params: { id: property._id.toString() },
      body: { status: "available" },
      user: { _id: ownerId, role: "landlord" },
    };
    const res = createResponse();

    await updateProperty(req, res, (error) => {
      throw error;
    });

    assert.equal(create.mock.callCount(), 1);
    assert.equal(create.mock.calls[0].arguments[0].user, savedSearchUser);
  });

  it("does not re-notify saved searches on an edit that leaves an already-available property available", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const property = {
      _id: new mongoose.Types.ObjectId(),
      owner: { _id: ownerId, equals: (id) => ownerId.equals(id) },
      status: "available",
      async save() {},
      async populate() {
        return this;
      },
    };
    mock.method(Property, "findById", async () => property);
    const savedSearchFind = mock.method(SavedSearch, "find", () => ({ lean: async () => [] }));

    const req = {
      params: { id: property._id.toString() },
      body: { title: "Updated title" },
      user: { _id: ownerId, role: "landlord" },
    };
    const res = createResponse();

    await updateProperty(req, res, (error) => {
      throw error;
    });

    assert.equal(savedSearchFind.mock.callCount(), 0, "notifyMatchingSavedSearches should not run again on every edit");
  });

  it("invalidates the movers cache namespace when a property's location actually changes", async () => {
    await invalidateNamespace("movers");
    const ownerId = new mongoose.Types.ObjectId();
    const property = {
      _id: new mongoose.Types.ObjectId(),
      owner: { _id: ownerId, equals: (id) => ownerId.equals(id) },
      status: "available",
      location: { coordinates: { coordinates: [36.8, -1.3] } },
      async save() {},
      async populate() {
        return this;
      },
    };
    mock.method(Property, "findById", async () => property);

    const moversMiddleware = cacheResponse({ namespace: "movers", ttlMs: 60000 });
    const moversReq = { originalUrl: `/api/properties/${property._id}/movers` };
    const seedRes = createResponse();
    moversMiddleware(moversReq, seedRes, () => seedRes.status(200).json({ data: { affiliates: [], nearby: [] } }));
    assert.equal(seedRes.headers["X-Cache"], "MISS");

    const req = {
      params: { id: property._id.toString() },
      body: {
        location: { county: "Nairobi", town: "Westlands", area: "Kilimani", coordinates: { type: "Point", coordinates: [36.9, -1.4] } },
      },
      user: { _id: ownerId, role: "landlord" },
    };
    const res = createResponse();
    await updateProperty(req, res, (error) => {
      throw error;
    });

    const afterRes = createResponse();
    moversMiddleware(moversReq, afterRes, () => afterRes.status(200).json({ data: { affiliates: [], nearby: [] } }));
    assert.equal(afterRes.headers["X-Cache"], "MISS", "a location change should have invalidated the cached movers response");
  });

  it("leaves the movers cache alone when an update doesn't touch location", async () => {
    await invalidateNamespace("movers");
    const ownerId = new mongoose.Types.ObjectId();
    const property = {
      _id: new mongoose.Types.ObjectId(),
      owner: { _id: ownerId, equals: (id) => ownerId.equals(id) },
      status: "available",
      location: { coordinates: { coordinates: [36.8, -1.3] } },
      async save() {},
      async populate() {
        return this;
      },
    };
    mock.method(Property, "findById", async () => property);

    const moversMiddleware = cacheResponse({ namespace: "movers", ttlMs: 60000 });
    const moversReq = { originalUrl: `/api/properties/${property._id}/movers` };
    const seedRes = createResponse();
    moversMiddleware(moversReq, seedRes, () => seedRes.status(200).json({ data: { affiliates: [], nearby: [] } }));
    assert.equal(seedRes.headers["X-Cache"], "MISS");

    const req = {
      params: { id: property._id.toString() },
      body: { title: "Updated title" },
      user: { _id: ownerId, role: "landlord" },
    };
    const res = createResponse();
    await updateProperty(req, res, (error) => {
      throw error;
    });

    const afterRes = createResponse();
    moversMiddleware(moversReq, afterRes, () => afterRes.status(200).json({ data: { affiliates: [], nearby: [] } }));
    assert.equal(afterRes.headers["X-Cache"], "HIT", "an unrelated edit should not invalidate the movers cache");
  });

  it("lists only available properties by default", async () => {
    let findFilters;
    let countFilters;
    mock.method(Property, "find", (filters) => {
      findFilters = filters;

      return {
        populate() {
          return this;
        },
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return { lean: () => Promise.resolve([]) };
        },
      };
    });
    mock.method(Property, "countDocuments", (filters) => {
      countFilters = filters;
      return Promise.resolve(0);
    });

    const req = { query: {} };
    const res = createResponse();

    await listProperties(req, res, () => {});

    assert.deepEqual(findFilters, { status: "available" });
    assert.deepEqual(countFilters, { status: "available" });
    assert.equal(res.statusCode, 200);
  });

  it("does not leak the owner's email or phone on the public listing endpoint", async () => {
    let ownerProjection;
    mock.method(Property, "find", () => ({
      populate(field, projection) {
        ownerProjection = projection;
        return this;
      },
      sort() {
        return this;
      },
      skip() {
        return this;
      },
      limit() {
        return { lean: () => Promise.resolve([]) };
      },
    }));
    mock.method(Property, "countDocuments", () => Promise.resolve(0));

    await listProperties({ query: {} }, createResponse(), () => {});

    assert.doesNotMatch(ownerProjection, /email/);
    assert.doesNotMatch(ownerProjection, /phone/);
  });

  it("does not leak the owner's email or phone on the public property-detail endpoint", async () => {
    let ownerProjection;
    mock.method(Property, "findById", () => ({
      populate(field, projection) {
        ownerProjection = projection;
        return Promise.resolve({ _id: new mongoose.Types.ObjectId() });
      },
    }));

    await getProperty({ params: { id: new mongoose.Types.ObjectId().toString() } }, createResponse(), () => {});

    assert.doesNotMatch(ownerProjection, /email/);
    assert.doesNotMatch(ownerProjection, /phone/);
  });

  it("ignores a client-supplied status filter and always lists only available properties", async () => {
    // The public listing endpoint has no ownership scoping at all, so a
    // client-supplied status (draft/taken/archived) would otherwise let
    // anyone enumerate every landlord's unpublished/archived listings -
    // status is only ever settable via listMyProperties, which is
    // owner-scoped separately.
    let findFilters;
    mock.method(Property, "find", (filters) => {
      findFilters = filters;

      return {
        populate() {
          return this;
        },
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return { lean: () => Promise.resolve([]) };
        },
      };
    });
    mock.method(Property, "countDocuments", () => Promise.resolve(0));

    const req = { query: { status: "draft" } };
    const res = createResponse();

    await listProperties(req, res, () => {});

    assert.deepEqual(findFilters, { status: "available" });
    assert.equal(res.statusCode, 200);
  });

  it("lists the current owner's properties across statuses", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    let findFilters;
    let countFilters;
    mock.method(Property, "find", (filters) => {
      findFilters = filters;

      return {
        populate() {
          return this;
        },
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return { lean: () => Promise.resolve([]) };
        },
      };
    });
    mock.method(Property, "countDocuments", (filters) => {
      countFilters = filters;
      return Promise.resolve(0);
    });

    const req = {
      query: {},
      user: { _id: ownerId, role: "landlord" },
    };
    const res = createResponse();

    await listMyProperties(req, res, () => {});

    assert.deepEqual(findFilters, { owner: ownerId });
    assert.deepEqual(countFilters, { owner: ownerId });
    assert.equal(res.statusCode, 200);
  });

  it("filters the current owner's properties by status", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    let findFilters;
    mock.method(Property, "find", (filters) => {
      findFilters = filters;

      return {
        populate() {
          return this;
        },
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return { lean: () => Promise.resolve([]) };
        },
      };
    });
    mock.method(Property, "countDocuments", () => Promise.resolve(0));

    const req = {
      query: { status: "taken" },
      user: { _id: ownerId, role: "agency" },
    };
    const res = createResponse();

    await listMyProperties(req, res, () => {});

    assert.deepEqual(findFilters, { owner: ownerId, status: "taken" });
    assert.equal(res.statusCode, 200);
  });

  it("scopes admins to their own properties too, since admins do not manage listings", async () => {
    let findFilters;
    mock.method(Property, "find", (filters) => {
      findFilters = filters;

      return {
        populate() {
          return this;
        },
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return { lean: () => Promise.resolve([]) };
        },
      };
    });
    mock.method(Property, "countDocuments", () => Promise.resolve(0));

    const adminId = new mongoose.Types.ObjectId();
    const req = {
      query: {},
      user: { _id: adminId, role: "admin" },
    };
    const res = createResponse();

    await listMyProperties(req, res, () => {});

    assert.deepEqual(findFilters, { owner: adminId });
    assert.equal(res.statusCode, 200);
  });

  it("rejects invalid owner property status filters", async () => {
    const req = {
      query: { status: "leased" },
      user: { _id: new mongoose.Types.ObjectId(), role: "landlord" },
    };
    const res = createResponse();
    let nextError;

    await listMyProperties(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "status must be one of: draft, available, taken, archived");
  });

  it("returns not found when adding an image to a missing property", async () => {
    mock.method(Property, "findById", async () => null);
    const req = {
      body: {
        url: "https://example.com/property.jpg",
      },
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId(), role: "landlord" },
    };
    const res = createResponse();
    let nextError;

    await addPropertyImage(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Property not found");
  });

  it("rejects image updates from non-owners", async () => {
    mock.method(Property, "findById", async () => ({
      owner: new mongoose.Types.ObjectId(),
    }));
    const req = {
      body: {
        url: "https://example.com/property.jpg",
      },
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId(), role: "landlord" },
    };
    const res = createResponse();
    let nextError;

    await addPropertyImage(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 403);
    assert.equal(nextError.message, "Not authorized to manage this property");
  });

  it("returns not found when removing a missing image", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const property = new Property({
      title: "Modern Kilimani Apartment",
      owner: ownerId,
      price: {
        rent: 65000,
      },
      images: [],
    });
    mock.method(Property, "findById", async () => property);
    const req = {
      params: {
        id: property._id.toString(),
        imageId: new mongoose.Types.ObjectId().toString(),
      },
      user: { _id: ownerId, role: "landlord" },
    };
    const res = createResponse();
    let nextError;

    await removePropertyImage(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Property image not found");
  });

  it("returns not found when deleting a missing property", async () => {
    mock.method(Property, "findById", async () => null);
    const req = { params: { id: new mongoose.Types.ObjectId().toString() }, user: { _id: new mongoose.Types.ObjectId(), role: "landlord" } };
    const res = createResponse();
    let nextError;

    await deleteProperty(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Property not found");
  });

  it("rejects deleting a property owned by someone else", async () => {
    const property = new Property({
      title: "Modern Kilimani Apartment",
      owner: new mongoose.Types.ObjectId(),
      price: { rent: 65000 },
    });
    mock.method(Property, "findById", async () => property);
    const req = {
      params: { id: property._id.toString() },
      user: { _id: new mongoose.Types.ObjectId(), role: "landlord" },
    };
    const res = createResponse();
    let nextError;

    await deleteProperty(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 403);
    assert.equal(nextError.message, "Not authorized to manage this property");
  });

  it("cascades deleting a property to every document that references it", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const property = new Property({
      title: "Modern Kilimani Apartment",
      owner: ownerId,
      price: { rent: 65000 },
      // No storagePath set on these - deletePropertyImage no-ops on a
      // missing storagePath, so this exercises the "iterate every image"
      // path without touching the real filesystem/S3.
      images: [{ url: "https://example.com/a.jpg" }, { url: "https://example.com/b.jpg" }],
    });
    let deleted = false;
    property.deleteOne = async () => {
      deleted = true;
    };
    mock.method(Property, "findById", async () => property);

    const deleteManyCalls = {};
    const trackDeleteMany = (Model, name) => {
      mock.method(Model, "deleteMany", async (filter) => {
        deleteManyCalls[name] = filter;
        return { deletedCount: 0 };
      });
    };

    trackDeleteMany(Inquiry, "Inquiry");
    trackDeleteMany(ViewingRequest, "ViewingRequest");
    trackDeleteMany(Review, "Review");
    trackDeleteMany(Favorite, "Favorite");
    trackDeleteMany(PropertyImageFingerprint, "PropertyImageFingerprint");
    trackDeleteMany(MoverRequest, "MoverRequest");

    const violationEvidenceUpdates = [];
    mock.method(UserViolation, "updateMany", async (filter, update) => {
      violationEvidenceUpdates.push({ filter, update });
      return { modifiedCount: 0 };
    });

    const req = { params: { id: property._id.toString() }, user: { _id: ownerId, role: "landlord" } };
    const res = createResponse();

    await deleteProperty(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(deleted, true);
    assert.equal(violationEvidenceUpdates.length, 2);
    assert.deepEqual(violationEvidenceUpdates[0], {
      filter: { "evidence.property": { $in: [property._id] } },
      update: { $unset: { "evidence.property": "" } },
    });
    assert.deepEqual(violationEvidenceUpdates[1], {
      filter: { "evidence.matchedProperty": { $in: [property._id] } },
      update: { $unset: { "evidence.matchedProperty": "" } },
    });
    assert.deepEqual(deleteManyCalls.Inquiry, { property: property._id });
    assert.deepEqual(deleteManyCalls.ViewingRequest, { property: property._id });
    assert.deepEqual(deleteManyCalls.Review, { property: property._id });
    assert.deepEqual(deleteManyCalls.Favorite, { property: property._id });
    assert.deepEqual(deleteManyCalls.PropertyImageFingerprint, { property: property._id });
    assert.deepEqual(deleteManyCalls.MoverRequest, { property: property._id });
  });

  it("returns not found when listing movers for a missing property", async () => {
    mock.method(Property, "findById", async () => null);
    const req = { params: { id: new mongoose.Types.ObjectId().toString() }, query: {} };
    const res = createResponse();
    let nextError;

    await listPropertyMovers(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Property not found");
  });

  it("returns affiliate and nearby movers for a property, excluding duplicates", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const property = {
      _id: new mongoose.Types.ObjectId(),
      owner: ownerId,
      location: {
        coordinates: {
          type: "Point",
          coordinates: [36.782, -1.2921],
        },
      },
    };
    mock.method(Property, "findById", async () => property);

    const affiliateMover = { _id: new mongoose.Types.ObjectId(), name: "Affiliate Movers" };
    const nearbyMover = { _id: new mongoose.Types.ObjectId(), name: "Nearby Movers" };
    let secondCallFilters;
    let callCount = 0;

    mock.method(Mover, "find", (filters) => {
      callCount += 1;

      if (callCount === 1) {
        assert.deepEqual(filters, { affiliatedOwners: ownerId, verified: true });
        return { sort: async () => [affiliateMover] };
      }

      secondCallFilters = filters;
      return { sort: async () => [nearbyMover] };
    });

    const req = { params: { id: property._id.toString() }, query: {} };
    const res = createResponse();

    await listPropertyMovers(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data.affiliates, [affiliateMover]);
    assert.deepEqual(res.body.data.nearby, [nearbyMover]);
    assert.equal(secondCallFilters.verified, true);
    assert.deepEqual(secondCallFilters._id.$nin, [affiliateMover._id]);
    assert.ok(secondCallFilters["location.coordinates"].$geoWithin.$centerSphere);
  });

  it("returns no nearby movers when the property has no coordinates", async () => {
    const property = {
      _id: new mongoose.Types.ObjectId(),
      owner: new mongoose.Types.ObjectId(),
      location: {},
    };
    mock.method(Property, "findById", async () => property);
    mock.method(Mover, "find", () => ({ sort: async () => [] }));

    const req = { params: { id: property._id.toString() }, query: {} };
    const res = createResponse();

    await listPropertyMovers(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data.nearby, []);
  });
});
