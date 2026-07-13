import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  createInquiry,
  listMyInquiries,
  listReceivedInquiries,
  updateInquiry,
} from "../../controllers/inquiryController.js";
import Inquiry from "../../models/Inquiry.js";
import Property from "../../models/Property.js";

// Chainable, thenable stand-in for a Mongoose Query - resolves to `result`
// whenever awaited, regardless of how many chained methods were called
// first (mirrors that populateInquiry() wraps .sort().skip().limit()).
const mockPopulatedFind = (result) => ({
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
    return this;
  },
  then(resolve) {
    resolve(result);
  },
});

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

describe("inquiryController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("returns not found when creating an inquiry for a missing property", async () => {
    mock.method(Property, "findById", async () => null);
    const req = {
      body: {
        property: new mongoose.Types.ObjectId().toString(),
        message: "Is this available?",
      },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await createInquiry(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Property not found");
  });

  it("rejects inquiries for a user's own property", async () => {
    const userId = new mongoose.Types.ObjectId();
    mock.method(Property, "findById", async () => ({
      _id: new mongoose.Types.ObjectId(),
      owner: userId,
    }));
    const req = {
      body: {
        property: new mongoose.Types.ObjectId().toString(),
        message: "Is this available?",
      },
      user: { _id: userId },
    };
    const res = createResponse();
    let nextError;

    await createInquiry(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "You cannot inquire about your own property");
  });

  it("returns not found when updating a missing inquiry", async () => {
    mock.method(Inquiry, "findById", () => ({
      populate: async () => null,
    }));
    const req = {
      body: { status: "responded", response: "Yes, it is available." },
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId(), role: "landlord" },
    };
    const res = createResponse();
    let nextError;

    await updateInquiry(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Inquiry not found");
  });

  it("rejects inquiry updates from non-owners", async () => {
    mock.method(Inquiry, "findById", () => ({
      populate: async () => ({
        owner: new mongoose.Types.ObjectId(),
      }),
    }));
    const req = {
      body: { status: "responded", response: "Yes, it is available." },
      params: { id: new mongoose.Types.ObjectId().toString() },
      user: { _id: new mongoose.Types.ObjectId(), role: "landlord" },
    };
    const res = createResponse();
    let nextError;

    await updateInquiry(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 403);
    assert.equal(nextError.message, "Not authorized to manage this inquiry");
  });

  it("paginates a tenant's own inquiries with default page/limit", async () => {
    let findFilters;
    let countFilters;
    mock.method(Inquiry, "find", (filters) => {
      findFilters = filters;
      return mockPopulatedFind([{ _id: "i1" }]);
    });
    mock.method(Inquiry, "countDocuments", (filters) => {
      countFilters = filters;
      return Promise.resolve(45);
    });

    const userId = new mongoose.Types.ObjectId();
    const req = { query: {}, user: { _id: userId } };
    const res = createResponse();

    await listMyInquiries(req, res, () => {});

    assert.deepEqual(findFilters, { sender: userId });
    assert.deepEqual(countFilters, { sender: userId });
    assert.deepEqual(res.body.data, [{ _id: "i1" }]);
    assert.deepEqual(res.body.pagination, { page: 1, limit: 20, total: 45, pages: 3 });
  });

  it("caps the requested page size at 100 for received inquiries", async () => {
    mock.method(Inquiry, "find", () => mockPopulatedFind([]));
    mock.method(Inquiry, "countDocuments", () => Promise.resolve(0));

    const req = { query: { page: "2", limit: "500" }, user: { _id: new mongoose.Types.ObjectId() } };
    const res = createResponse();

    await listReceivedInquiries(req, res, () => {});

    assert.equal(res.body.pagination.page, 2);
    assert.equal(res.body.pagination.limit, 100);
  });
});
