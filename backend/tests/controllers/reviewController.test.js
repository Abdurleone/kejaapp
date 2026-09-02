import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  createReview,
  dismissReport,
  hideReview,
  listMyPropertyReviews,
  listPropertyReviews,
  listReportedReviews,
  reportReview,
  respondToReview,
} from "../../controllers/reviewController.js";
import DeviceToken from "../../models/DeviceToken.js";
import Notification from "../../models/Notification.js";
import Property from "../../models/Property.js";
import Review from "../../models/Review.js";
import ViewingRequest from "../../models/ViewingRequest.js";

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

const createReviewQuery = (reviews) => ({
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
    return { lean: () => Promise.resolve(reviews) };
  },
});

describe("reviewController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("lists reviews for the current landlord or agency properties", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const propertyId = new mongoose.Types.ObjectId();
    let propertyFilters;
    let reviewFilters;

    mock.method(Property, "find", (filters) => {
      propertyFilters = filters;

      return {
        select() {
          return Promise.resolve([{ _id: propertyId }]);
        },
      };
    });
    mock.method(Review, "find", (filters) => {
      reviewFilters = filters;
      return createReviewQuery([]);
    });
    mock.method(Review, "countDocuments", async () => 0);

    const req = {
      user: { _id: ownerId, role: "landlord" },
    };
    const res = createResponse();

    await listMyPropertyReviews(req, res, () => {});

    assert.deepEqual(propertyFilters, { owner: ownerId });
    assert.deepEqual(reviewFilters, { property: { $in: [propertyId] } });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, []);
    assert.deepEqual(res.body.pagination, { page: 1, limit: 20, total: 0, pages: 0 });
  });

  it("lets admins list all reviews without ownership filters", async () => {
    let reviewFilters;

    mock.method(Review, "find", (filters) => {
      reviewFilters = filters;
      return createReviewQuery([]);
    });
    mock.method(Review, "countDocuments", async () => 0);

    const req = {
      user: { _id: new mongoose.Types.ObjectId(), role: "admin" },
    };
    const res = createResponse();

    await listMyPropertyReviews(req, res, () => {});

    assert.deepEqual(reviewFilters, {});
    assert.equal(res.statusCode, 200);
  });

  it("allows a property owner to respond to a review", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const reviewId = new mongoose.Types.ObjectId();
    const review = {
      _id: reviewId,
      property: {
        _id: new mongoose.Types.ObjectId(),
        owner: ownerId,
      },
      ownerResponse: {},
      async save() {},
      async populate() {
        return this;
      },
    };

    mock.method(Review, "findById", () => ({
      populate() {
        return Promise.resolve(review);
      },
    }));

    const req = {
      params: { id: reviewId.toString() },
      body: { message: "Thanks for the feedback. We have fixed the issue." },
      user: { _id: ownerId, role: "agency" },
    };
    const res = createResponse();

    await respondToReview(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(review.ownerResponse.message, "Thanks for the feedback. We have fixed the issue.");
    assert.equal(review.ownerResponse.respondedBy, ownerId);
    assert.ok(review.ownerResponse.respondedAt instanceof Date);
  });

  it("strips HTML from an owner's response before storing it", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const reviewId = new mongoose.Types.ObjectId();
    const review = {
      _id: reviewId,
      property: {
        _id: new mongoose.Types.ObjectId(),
        owner: ownerId,
      },
      ownerResponse: {},
      async save() {},
      async populate() {
        return this;
      },
    };

    mock.method(Review, "findById", () => ({
      populate() {
        return Promise.resolve(review);
      },
    }));

    const req = {
      params: { id: reviewId.toString() },
      body: { message: "<script>alert(1)</script>Thanks for the review!" },
      user: { _id: ownerId, role: "agency" },
    };
    const res = createResponse();

    await respondToReview(req, res, () => {});

    assert.equal(review.ownerResponse.message, "alert(1)Thanks for the review!");
  });

  it("rejects review responses from non-owners", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const review = {
      property: {
        owner: ownerId,
      },
    };

    mock.method(Review, "findById", () => ({
      populate() {
        return Promise.resolve(review);
      },
    }));

    const req = {
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { message: "Reply" },
      user: { _id: new mongoose.Types.ObjectId(), role: "landlord" },
    };
    const res = createResponse();
    let nextError;

    await respondToReview(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 403);
    assert.equal(nextError.message, "Not authorized for this review");
  });

  it("returns not found when responding to a missing review", async () => {
    mock.method(Review, "findById", () => ({
      populate() {
        return Promise.resolve(null);
      },
    }));

    const req = {
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { message: "Reply" },
      user: { _id: new mongoose.Types.ObjectId(), role: "landlord" },
    };
    const res = createResponse();
    let nextError;

    await respondToReview(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
    assert.equal(nextError.message, "Review not found");
  });

  it("rejects a review when the tenant has no completed viewing for the property", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const tenantId = new mongoose.Types.ObjectId();
    const propertyId = new mongoose.Types.ObjectId();

    mock.method(Property, "findById", async () => ({ _id: propertyId, owner: ownerId }));
    mock.method(ViewingRequest, "findOne", async () => null);

    const req = {
      body: { property: propertyId.toString(), rating: 5, comment: "Great place" },
      user: { _id: tenantId, role: "tenant" },
    };
    const res = createResponse();
    let nextError;

    await createReview(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 403);
    assert.equal(nextError.message, "You can only review a property after a completed viewing");
  });

  it("creates a review when the tenant has a completed viewing", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const tenantId = new mongoose.Types.ObjectId();
    const propertyId = new mongoose.Types.ObjectId();

    mock.method(Property, "findById", async () => ({ _id: propertyId, owner: ownerId, title: "Modern Kilimani" }));
    mock.method(ViewingRequest, "findOne", async () => ({ _id: new mongoose.Types.ObjectId() }));
    mock.method(Review, "findOne", async () => null);
    mock.method(Review, "create", async (payload) => ({
      ...payload,
      _id: new mongoose.Types.ObjectId(),
      async populate() {
        return this;
      },
    }));
    mock.method(Notification, "create", async (payload) => payload);
    mock.method(DeviceToken, "find", async () => []);

    const req = {
      body: { property: propertyId.toString(), rating: 5, comment: "Great place" },
      user: { _id: tenantId, role: "tenant" },
    };
    const res = createResponse();

    await createReview(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.rating, 5);
  });

  it("lets any other user report a review, but not its own author", async () => {
    const authorId = new mongoose.Types.ObjectId();
    const review = {
      _id: new mongoose.Types.ObjectId(),
      user: authorId,
      report: {},
      async save() {},
      async populate() {
        return this;
      },
    };
    mock.method(Review, "findById", async () => review);

    const ownReq = {
      params: { id: review._id.toString() },
      body: { reason: "This seems fake" },
      user: { _id: authorId, role: "tenant" },
    };
    const res1 = createResponse();
    let ownError;
    await reportReview(ownReq, res1, (error) => {
      ownError = error;
    });
    assert.equal(ownError.statusCode, 400);
    assert.equal(ownError.message, "You cannot report your own review");

    const otherReq = {
      params: { id: review._id.toString() },
      body: { reason: "This seems fake" },
      user: { _id: new mongoose.Types.ObjectId(), role: "tenant" },
    };
    const res2 = createResponse();
    await reportReview(otherReq, res2, (error) => {
      throw error;
    });

    assert.equal(res2.statusCode, 200);
    assert.equal(review.report.reason, "This seems fake");
    assert.ok(review.report.reportedAt instanceof Date);
  });

  it("returns not found when reporting a missing review", async () => {
    mock.method(Review, "findById", async () => null);

    const req = {
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { reason: "Fake" },
      user: { _id: new mongoose.Types.ObjectId(), role: "tenant" },
    };
    const res = createResponse();
    let nextError;

    await reportReview(req, res, (error) => {
      nextError = error;
    });

    assert.equal(nextError.statusCode, 404);
  });

  it("excludes hidden reviews and moderation fields from the public property review list", async () => {
    const propertyId = new mongoose.Types.ObjectId();
    let reviewFilters;
    let selectedFields;
    mock.method(Property, "findById", async () => ({ _id: propertyId }));
    mock.method(Review, "find", (filters) => {
      reviewFilters = filters;
      return {
        select(fields) {
          selectedFields = fields;
          return this;
        },
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
    mock.method(Review, "countDocuments", async () => 0);

    const req = { params: { id: propertyId.toString() }, query: {} };
    await listPropertyReviews(req, createResponse(), () => {});

    assert.deepEqual(reviewFilters, { property: propertyId.toString(), hidden: { $ne: true } });
    assert.equal(selectedFields, "-report -hidden -hiddenBy -hiddenAt");
  });

  it("only lists unresolved reported reviews for the admin queue", async () => {
    let reviewFilters;
    mock.method(Review, "find", (filters) => {
      reviewFilters = filters;
      return createReviewQuery([]);
    });
    mock.method(Review, "countDocuments", async () => 0);

    await listReportedReviews({ query: {} }, createResponse(), () => {});

    assert.deepEqual(reviewFilters, { "report.reportedAt": { $ne: null }, hidden: { $ne: true } });
  });

  it("hides a review and records who hid it", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const review = { _id: new mongoose.Types.ObjectId(), hidden: false, async save() {} };
    mock.method(Review, "findById", async () => review);

    const req = { params: { id: review._id.toString() }, user: { _id: adminId, role: "admin" } };
    const res = createResponse();

    await hideReview(req, res, (error) => {
      throw error;
    });

    assert.equal(review.hidden, true);
    assert.equal(review.hiddenBy, adminId);
    assert.ok(review.hiddenAt instanceof Date);
    assert.equal(res.statusCode, 200);
  });

  it("dismisses a report, clearing it without hiding the review", async () => {
    const review = {
      _id: new mongoose.Types.ObjectId(),
      hidden: false,
      report: { reason: "Fake", reportedBy: new mongoose.Types.ObjectId(), reportedAt: new Date() },
      async save() {},
    };
    mock.method(Review, "findById", async () => review);

    const req = { params: { id: review._id.toString() }, user: { _id: new mongoose.Types.ObjectId(), role: "admin" } };
    const res = createResponse();

    await dismissReport(req, res, (error) => {
      throw error;
    });

    assert.equal(review.report.reason, null);
    assert.equal(review.report.reportedBy, null);
    assert.equal(review.report.reportedAt, null);
    assert.equal(review.hidden, false);
  });
});
