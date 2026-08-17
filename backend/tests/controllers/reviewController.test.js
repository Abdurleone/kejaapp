import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import {
  listMyPropertyReviews,
  respondToReview,
} from "../../controllers/reviewController.js";
import Property from "../../models/Property.js";
import Review from "../../models/Review.js";

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
});
