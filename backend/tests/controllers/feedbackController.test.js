import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  createFeedback,
  listFeedbackForAdmin,
  listMyFeedback,
  listPublicFeedback,
  respondToFeedback,
} from "../../controllers/feedbackController.js";
import Feedback from "../../models/Feedback.js";
import Notification from "../../models/Notification.js";

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

const createFeedbackQuery = (feedback) => ({
  populate() {
    return this;
  },
  sort() {
    return Promise.resolve(feedback);
  },
});

describe("feedbackController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("creates feedback for the current user", async () => {
    const submitterId = new mongoose.Types.ObjectId();
    const created = {
      _id: new mongoose.Types.ObjectId(),
      submitter: submitterId,
      message: "KejaApp helped me find my dream home.",
      async populate() {
        return this;
      },
    };

    const create = mock.method(Feedback, "create", async (payload) => {
      assert.deepEqual(payload, { submitter: submitterId, message: "KejaApp helped me find my dream home." });
      return created;
    });

    const req = {
      user: { _id: submitterId },
      body: { message: "KejaApp helped me find my dream home." },
    };
    const res = createResponse();

    await createFeedback(req, res, (error) => {
      throw error;
    });

    assert.equal(create.mock.callCount(), 1);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data, created);
  });

  it("lists only the current user's feedback", async () => {
    const submitterId = new mongoose.Types.ObjectId();
    let filters;

    mock.method(Feedback, "find", (query) => {
      filters = query;
      return createFeedbackQuery([]);
    });

    const req = { user: { _id: submitterId } };
    const res = createResponse();

    await listMyFeedback(req, res, (error) => {
      throw error;
    });

    assert.deepEqual(filters, { submitter: submitterId });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, []);
  });

  it("lists all feedback for admins, with an optional status filter", async () => {
    let filters;

    mock.method(Feedback, "find", (query) => {
      filters = query;
      return createFeedbackQuery([]);
    });

    const req = { query: { status: "pending" } };
    const res = createResponse();

    await listFeedbackForAdmin(req, res, (error) => {
      throw error;
    });

    assert.deepEqual(filters, { status: "pending" });
    assert.equal(res.statusCode, 200);
  });

  it("responds to feedback and notifies the submitter", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const feedbackId = new mongoose.Types.ObjectId();
    const feedback = {
      _id: feedbackId,
      submitter: new mongoose.Types.ObjectId(),
      status: "pending",
      isPublic: false,
      response: {},
      async save() {},
      async populate() {
        return this;
      },
    };

    mock.method(Feedback, "findById", async () => feedback);
    const notificationCreate = mock.method(Notification, "create", async (payload) => payload);

    const req = {
      params: { id: feedbackId.toString() },
      body: { message: "Thanks for sharing your experience!" },
      user: { _id: adminId },
    };
    const res = createResponse();

    await respondToFeedback(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(feedback.status, "responded");
    assert.equal(feedback.isPublic, true);
    assert.equal(feedback.response.message, "Thanks for sharing your experience!");
    assert.equal(feedback.response.respondedBy, adminId);
    assert.ok(feedback.response.respondedAt instanceof Date);
    assert.equal(notificationCreate.mock.callCount(), 1);
  });

  it("returns not found when responding to missing feedback", async () => {
    mock.method(Feedback, "findById", async () => null);

    const req = {
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { message: "Reply" },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = createResponse();
    let nextError;

    await respondToFeedback(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Feedback not found");
  });

  it("lists only public feedback, capped at 50", async () => {
    let filters;
    let limitValue;

    mock.method(Feedback, "find", (query) => {
      filters = query;
      return {
        populate() {
          return this;
        },
        sort() {
          return this;
        },
        limit(value) {
          limitValue = value;
          return Promise.resolve([]);
        },
      };
    });

    const req = { query: { limit: "1000" } };
    const res = createResponse();

    await listPublicFeedback(req, res, (error) => {
      throw error;
    });

    assert.deepEqual(filters, { isPublic: true });
    assert.equal(limitValue, 50);
    assert.equal(res.statusCode, 200);
  });
});
