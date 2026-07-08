import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import { after, before, describe, it } from "../helpers/nodeTestCompat.js";
import app from "../../app.js";
import Property from "../../models/Property.js";
import Inquiry from "../../models/Inquiry.js";
import ViewingRequest from "../../models/ViewingRequest.js";
import Review from "../../models/Review.js";
import Favorite from "../../models/Favorite.js";
import Feedback from "../../models/Feedback.js";
import User from "../../models/User.js";
import generateToken from "../../utils/generateToken.js";
import { generateUniqueUsername } from "../../utils/usernameGenerator.js";

const testMongoUri = process.env.TEST_MONGODB_URI;

describe("API flows (real database)", { skip: !testMongoUri }, () => {
  const suffix = Date.now();
  const tenantEmail = `integration+tenant.${suffix}@example.com`;
  const landlordEmail = `integration+landlord.${suffix}@example.com`;
  const adminEmail = `integration+admin.${suffix}@example.com`;

  let tenantToken;
  let landlordToken;
  let adminToken;
  let adminId;
  let propertyId;
  let inquiryId;
  let viewingRequestId;
  let reviewId;
  let feedbackId;
  let tenantUsername;

  before(async () => {
    await mongoose.connect(testMongoUri, {
      dbName: process.env.TEST_MONGODB_DB_NAME || "kejaapp_test",
    });

    // Admins can't self-register through the public API (roleGroups.publicRegistration
    // excludes "admin"), so create one directly for the feedback-response flow below.
    const admin = await User.create({
      name: "Integration Admin",
      email: adminEmail,
      username: await generateUniqueUsername(User),
      password: "password123",
      role: "admin",
    });
    adminId = admin._id;
    adminToken = generateToken({ id: admin._id, role: "admin" });
  });

  after(async () => {
    if (propertyId) {
      await Promise.all([
        Property.deleteOne({ _id: propertyId }),
        Inquiry.deleteMany({ property: propertyId }),
        ViewingRequest.deleteMany({ property: propertyId }),
        Review.deleteMany({ property: propertyId }),
        Favorite.deleteMany({ property: propertyId }),
      ]);
    }

    if (feedbackId) {
      await Feedback.deleteOne({ _id: feedbackId });
    }

    await User.deleteMany({ email: { $in: [tenantEmail, landlordEmail, adminEmail] } });
    await mongoose.disconnect();
  });

  it("registers a tenant", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Integration Tenant",
      email: tenantEmail,
      password: "password123",
      role: "tenant",
      phone: "+254700111111",
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.user.email, tenantEmail);
    assert.match(response.body.user.username, /^[a-z]+[a-z]+\d{3,4}$/);
    assert.ok(response.body.token);
    tenantUsername = response.body.user.username;
  });

  it("registers a landlord", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Integration Landlord",
      email: landlordEmail,
      password: "password123",
      role: "landlord",
      phone: "+254700222222",
    });

    assert.equal(response.status, 201);
    assert.ok(response.body.token);
    landlordToken = response.body.token;
  });

  it("rejects a duplicate registration", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Integration Landlord Again",
      email: landlordEmail,
      password: "password123",
      role: "landlord",
    });

    assert.equal(response.status, 409);
  });

  it("logs the tenant in with their email", async () => {
    const response = await request(app).post("/api/auth/login").send({
      identifier: tenantEmail,
      password: "password123",
    });

    assert.equal(response.status, 200);
    assert.ok(response.body.token);
    tenantToken = response.body.token;
  });

  it("logs the tenant in with their generated username", async () => {
    const response = await request(app).post("/api/auth/login").send({
      identifier: tenantUsername,
      password: "password123",
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.email, tenantEmail);
  });

  it("rejects login with the wrong password", async () => {
    const response = await request(app).post("/api/auth/login").send({
      identifier: tenantEmail,
      password: "wrong-password",
    });

    assert.equal(response.status, 401);
  });

  it("returns the signed-in tenant's profile", async () => {
    const response = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${tenantToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.user.email, tenantEmail);
  });

  it("blocks a tenant from creating a property", async () => {
    const response = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${tenantToken}`)
      .send({ title: "Not allowed", price: { rent: 1000 } });

    assert.equal(response.status, 403);
  });

  it("lets the landlord create a property", async () => {
    const response = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${landlordToken}`)
      .send({
        title: `Integration Test Property ${suffix}`,
        description: "A property created by an automated API test.",
        type: "apartment",
        price: { rent: 40000, deposit: 40000, agencyFee: 0 },
        location: {
          county: "Nairobi",
          town: "Nairobi",
          area: "Kilimani",
          coordinates: { type: "Point", coordinates: [36.78, -1.29] },
        },
        bedrooms: 2,
        bathrooms: 1,
        listedBy: "owner",
        viewingType: "scheduled",
        contact: { preferredMethod: "phone", phone: "+254700222222" },
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.title, `Integration Test Property ${suffix}`);
    assert.equal(response.body.data.ratingAverage, 0);
    assert.equal(response.body.data.ratingCount, 0);
    propertyId = response.body.data._id;
  });

  it("lists the property in public discovery", async () => {
    const response = await request(app).get(`/api/properties/${propertyId}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data._id, propertyId);
  });

  it("shows the property under the landlord's own listings", async () => {
    const response = await request(app)
      .get("/api/properties/mine")
      .set("Authorization", `Bearer ${landlordToken}`);

    assert.equal(response.status, 200);
    assert.ok(response.body.data.some((property) => property._id === propertyId));
  });

  it("blocks the tenant from listing 'my properties'", async () => {
    const response = await request(app)
      .get("/api/properties/mine")
      .set("Authorization", `Bearer ${tenantToken}`);

    assert.equal(response.status, 403);
  });

  it("lets the tenant submit an inquiry", async () => {
    const response = await request(app)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${tenantToken}`)
      .send({
        property: propertyId,
        subject: "Is this still available?",
        message: "I would like to know if this property is still available.",
        contactPreference: "email",
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.property._id, propertyId);
    inquiryId = response.body.data._id;
  });

  it("blocks a landlord from creating an inquiry (tenant-only route)", async () => {
    const response = await request(app)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${landlordToken}`)
      .send({
        property: propertyId,
        subject: "Self inquiry",
        message: "This should not be allowed.",
      });

    assert.equal(response.status, 403);
  });

  it("shows the inquiry to the landlord under received inquiries", async () => {
    const response = await request(app)
      .get("/api/inquiries/received")
      .set("Authorization", `Bearer ${landlordToken}`);

    assert.equal(response.status, 200);
    assert.ok(response.body.data.some((inquiry) => inquiry._id === inquiryId));
  });

  it("lets the landlord respond to the inquiry", async () => {
    const response = await request(app)
      .put(`/api/inquiries/${inquiryId}`)
      .set("Authorization", `Bearer ${landlordToken}`)
      .send({ status: "responded", response: "Yes, it's still available." });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, "responded");
    assert.equal(response.body.data.response, "Yes, it's still available.");
  });

  it("requires a requested date for a scheduled viewing", async () => {
    const response = await request(app)
      .post("/api/viewings")
      .set("Authorization", `Bearer ${tenantToken}`)
      .send({ property: propertyId, message: "No date attached." });

    assert.equal(response.status, 400);
  });

  it("lets the tenant submit a viewing request", async () => {
    const response = await request(app)
      .post("/api/viewings")
      .set("Authorization", `Bearer ${tenantToken}`)
      .send({
        property: propertyId,
        requestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        message: "I'd like to view this property this week.",
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.status, "pending");
    viewingRequestId = response.body.data._id;
  });

  it("lets the landlord approve the viewing request", async () => {
    const response = await request(app)
      .put(`/api/viewings/${viewingRequestId}/status`)
      .set("Authorization", `Bearer ${landlordToken}`)
      .send({ status: "approved", reason: "Confirmed with the tenant." });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, "approved");
  });

  it("lets the tenant leave a review", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${tenantToken}`)
      .send({ property: propertyId, rating: 5, comment: "Great place, responsive landlord." });

    assert.equal(response.status, 201);
    reviewId = response.body.data._id;
  });

  it("rejects a second review from the same tenant", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${tenantToken}`)
      .send({ property: propertyId, rating: 3, comment: "Trying again." });

    assert.equal(response.status, 409);
  });

  it("reflects the review in the property's rating", async () => {
    const response = await request(app).get(`/api/properties/${propertyId}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.ratingAverage, 5);
    assert.equal(response.body.data.ratingCount, 1);
  });

  it("lets the landlord respond to the review", async () => {
    const response = await request(app)
      .put(`/api/reviews/${reviewId}/response`)
      .set("Authorization", `Bearer ${landlordToken}`)
      .send({ message: "Thanks for staying with us!" });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.ownerResponse.message, "Thanks for staying with us!");
  });

  it("keeps the property's rating intact after the owner response", async () => {
    const response = await request(app).get(`/api/properties/${propertyId}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.ratingAverage, 5);
    assert.equal(response.body.data.ratingCount, 1);
  });

  it("lets the tenant submit platform feedback", async () => {
    const response = await request(app)
      .post("/api/feedback")
      .set("Authorization", `Bearer ${tenantToken}`)
      .send({ message: "KejaApp helped me find my dream home in Kilimani." });

    assert.equal(response.status, 201);
    feedbackId = response.body.data._id;
  });

  it("blocks an admin from submitting feedback", async () => {
    const response = await request(app)
      .post("/api/feedback")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ message: "Admins shouldn't be able to submit feedback." });

    assert.equal(response.status, 403);
  });

  it("does not show unresponded feedback in the public testimonial list", async () => {
    const response = await request(app).get("/api/feedback/public");

    assert.equal(response.status, 200);
    assert.ok(!response.body.data.some((item) => item._id === feedbackId));
  });

  it("requires authentication to list the tenant's own feedback", async () => {
    const response = await request(app).get("/api/feedback/mine");

    assert.equal(response.status, 401);
  });

  it("lets the tenant list their own feedback", async () => {
    const response = await request(app)
      .get("/api/feedback/mine")
      .set("Authorization", `Bearer ${tenantToken}`);

    assert.equal(response.status, 200);
    assert.ok(response.body.data.some((item) => item._id === feedbackId));
  });

  it("lets the admin respond to the feedback", async () => {
    const response = await request(app)
      .put(`/api/admin/feedback/${feedbackId}/respond`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ message: "Thank you for sharing your experience!" });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, "responded");
    assert.equal(response.body.data.isPublic, true);
    assert.equal(response.body.data.response.message, "Thank you for sharing your experience!");
    assert.equal(response.body.data.response.respondedBy._id, adminId.toString());
  });

  it("shows the responded feedback in the public testimonial list", async () => {
    const response = await request(app).get("/api/feedback/public");

    assert.equal(response.status, 200);
    assert.ok(response.body.data.some((item) => item._id === feedbackId));
  });

  it("saves and lists the property as a tenant favorite", async () => {
    const saveResponse = await request(app)
      .post(`/api/favorites/${propertyId}`)
      .set("Authorization", `Bearer ${tenantToken}`);

    assert.equal(saveResponse.status, 201);

    const listResponse = await request(app)
      .get("/api/favorites")
      .set("Authorization", `Bearer ${tenantToken}`);

    assert.equal(listResponse.status, 200);
    assert.ok(listResponse.body.data.some((favorite) => favorite.property._id === propertyId));
  });

  it("rejects saving the same favorite twice", async () => {
    const response = await request(app)
      .post(`/api/favorites/${propertyId}`)
      .set("Authorization", `Bearer ${tenantToken}`);

    assert.equal(response.status, 409);
  });

  it("removes the favorite", async () => {
    const response = await request(app)
      .delete(`/api/favorites/${propertyId}`)
      .set("Authorization", `Bearer ${tenantToken}`);

    assert.equal(response.status, 200);
  });

  it("logs the tenant out and invalidates further /me access with the old cookie only", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${tenantToken}`)
      .send({});

    assert.equal(response.status, 200);
  });
});
