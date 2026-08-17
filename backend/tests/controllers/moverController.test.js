import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  affiliateMover,
  getMover,
  getMoverProfile,
  listMovers,
  submitMoverProfile,
  unaffiliateMover,
} from "../../controllers/moverController.js";
import Mover from "../../models/Mover.js";

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

describe("moverController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("returns not found when fetching a missing mover", async () => {
    mock.method(Mover, "findById", async () => null);
    const req = { params: { id: new mongoose.Types.ObjectId().toString() } };
    const res = createResponse();
    let nextError;

    await getMover(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Mover not found");
  });

  it("returns a mover by id", async () => {
    const expectedMover = { _id: new mongoose.Types.ObjectId(), name: "SwiftMove Nairobi" };
    mock.method(Mover, "findById", async () => expectedMover);
    const req = { params: { id: expectedMover._id.toString() } };
    const res = createResponse();

    await getMover(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, expectedMover);
  });

  it("lists movers filtered by service type, verification, and proximity", async () => {
    const expectedData = [{ name: "SwiftMove Nairobi" }];
    const query = {
      sort(sortValue) {
        assert.equal(sortValue, "-verified name");
        return this;
      },
      skip() {
        return this;
      },
      limit() {
        return expectedData;
      },
    };
    const find = mock.method(Mover, "find", (filters) => {
      assert.equal(filters.serviceTypes, "packing");
      assert.equal(filters.verified, true);
      assert.ok(filters["location.coordinates"].$geoWithin.$centerSphere);
      return query;
    });
    mock.method(Mover, "countDocuments", async () => 1);
    const req = {
      query: {
        serviceType: "packing",
        verified: "true",
        lat: "-1.2921",
        lng: "36.782",
        radiusKm: "10",
      },
    };
    const res = createResponse();

    await listMovers(req, res, (error) => {
      throw error;
    });

    assert.equal(find.mock.callCount(), 1);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, expectedData);
    assert.equal(res.body.pagination.total, 1);
  });

  it("escapes regex metacharacters in county/town/area filters (ReDoS guard)", async () => {
    const pathological = "(a+)+$";
    const query = {
      sort() {
        return this;
      },
      skip() {
        return this;
      },
      limit() {
        return [];
      },
    };
    const find = mock.method(Mover, "find", (filters) => {
      const start = Date.now();
      assert.equal(filters["location.county"].test("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!"), false);
      assert.ok(Date.now() - start < 50);
      return query;
    });
    mock.method(Mover, "countDocuments", async () => 0);
    const req = { query: { county: pathological, town: pathological, area: pathological } };
    const res = createResponse();

    await listMovers(req, res, (error) => {
      throw error;
    });

    assert.equal(find.mock.callCount(), 1);
  });

  it("rejects mover profile submission from non-mover users", async () => {
    const req = {
      body: { name: "SwiftMove Nairobi" },
      user: { _id: new mongoose.Types.ObjectId(), role: "tenant" },
    };
    const res = createResponse();
    let nextError;

    await submitMoverProfile(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 403);
    assert.equal(nextError.message, "Only mover accounts can manage a mover profile");
  });

  it("upserts the signed-in mover's own profile", async () => {
    const expectedMover = { _id: new mongoose.Types.ObjectId(), name: "SwiftMove Nairobi" };
    const update = mock.method(Mover, "findOneAndUpdate", async () => expectedMover);
    const req = {
      body: { name: "SwiftMove Nairobi", phone: "+254722000001", verified: true, affiliatedOwners: ["x"] },
      user: { _id: new mongoose.Types.ObjectId(), role: "mover" },
    };
    const res = createResponse();

    await submitMoverProfile(req, res, (error) => {
      throw error;
    });

    assert.equal(update.mock.callCount(), 1);
    const [filter, payload] = update.mock.calls[0].arguments;
    assert.deepEqual(filter, { user: req.user._id });
    // verified/affiliatedOwners must never be settable from the self-service profile endpoint.
    assert.equal(payload.verified, undefined);
    assert.equal(payload.affiliatedOwners, undefined);
    assert.equal(payload.name, "SwiftMove Nairobi");
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, expectedMover);
  });

  it("strips HTML from the mover profile's free-text fields", async () => {
    const expectedMover = { _id: new mongoose.Types.ObjectId() };
    const update = mock.method(Mover, "findOneAndUpdate", async () => expectedMover);
    const req = {
      body: {
        name: "<script>alert(1)</script>SwiftMove Nairobi",
        location: { county: "<b>Nairobi</b>", town: "Westlands", areasServed: ["<i>Kilimani</i>", "Lavington"] },
      },
      user: { _id: new mongoose.Types.ObjectId(), role: "mover" },
    };
    const res = createResponse();

    await submitMoverProfile(req, res, (error) => {
      throw error;
    });

    const [, payload] = update.mock.calls[0].arguments;
    assert.equal(payload.name, "alert(1)SwiftMove Nairobi");
    assert.equal(payload.location.county, "Nairobi");
    assert.deepEqual(payload.location.areasServed, ["Kilimani", "Lavington"]);
  });

  it("returns not submitted status when a mover has no profile yet", async () => {
    mock.method(Mover, "findOne", async () => null);
    const req = { user: { _id: new mongoose.Types.ObjectId(), role: "mover" } };
    const res = createResponse();

    await getMoverProfile(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, { status: "not_submitted" });
  });

  it("returns not found when affiliating with a missing mover", async () => {
    mock.method(Mover, "findByIdAndUpdate", async () => null);
    const req = {
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await affiliateMover(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Mover not found");
  });

  it("adds the signed-in owner to a mover's affiliated owners", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const expectedMover = { _id: new mongoose.Types.ObjectId(), affiliatedOwners: [ownerId] };
    const update = mock.method(Mover, "findByIdAndUpdate", async (id, changes) => {
      assert.deepEqual(changes, { $addToSet: { affiliatedOwners: ownerId } });
      return expectedMover;
    });
    const req = {
      params: { id: expectedMover._id.toString() },
      user: { _id: ownerId },
    };
    const res = createResponse();

    await affiliateMover(req, res, (error) => {
      throw error;
    });

    assert.equal(update.mock.callCount(), 1);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, expectedMover);
  });

  it("removes the signed-in owner from a mover's affiliated owners", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const expectedMover = { _id: new mongoose.Types.ObjectId(), affiliatedOwners: [] };
    mock.method(Mover, "findByIdAndUpdate", async (id, changes) => {
      assert.deepEqual(changes, { $pull: { affiliatedOwners: ownerId } });
      return expectedMover;
    });
    const req = {
      params: { id: expectedMover._id.toString() },
      user: { _id: ownerId },
    };
    const res = createResponse();

    await unaffiliateMover(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, expectedMover);
  });
});
