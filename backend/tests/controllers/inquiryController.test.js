import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  createInquiry,
  updateInquiry,
} from "../../controllers/inquiryController.js";
import Inquiry from "../../models/Inquiry.js";
import Property from "../../models/Property.js";

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
});
