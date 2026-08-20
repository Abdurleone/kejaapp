import assert from "node:assert/strict";
import { describe, it } from "node:test";
import request from "supertest";
import app from "../app.js";

describe("KejaApp API", () => {
  it("returns health metadata", async () => {
    const response = await request(app).get("/");

    assert.equal(response.status, 200);
    assert.equal(response.body.message, "KejaApp API is running...");
  });

  it("returns API health status", async () => {
    const response = await request(app).get("/api/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "degraded");
    assert.equal(response.body.database.status, "disconnected");
    // host/name/path (the live Mongo hostname/db name/connection-string
    // path) are deliberately redacted - this is a public, unauthenticated
    // endpoint.
    assert.equal(response.body.database.host, undefined);
    assert.equal(response.body.database.name, undefined);
    assert.equal(response.body.database.path, undefined);
  });

  it("returns liveness status for load balancers", async () => {
    const response = await request(app).get("/api/health/live");

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "ok");
  });

  it("returns readiness status for load balancers", async () => {
    const response = await request(app).get("/api/health/ready");

    assert.equal(response.status, 503);
    assert.equal(response.body.status, "not_ready");
    assert.equal(response.body.database.ok, false);
  });

  it("serves OpenAPI documentation", async () => {
    const response = await request(app).get("/api/docs/openapi.json");

    assert.equal(response.status, 200);
    assert.equal(response.body.openapi, "3.1.0");
    assert.equal(response.body.info.title, "KejaApp API");
  });

  it("returns database readiness status", async () => {
    const response = await request(app).get("/api/health/database");

    assert.equal(response.status, 503);
    assert.equal(response.body.status, "unavailable");
    assert.equal(response.body.database.ok, false);
    assert.equal(response.body.database.message, "Database is not connected");
  });

  it("validates register payloads", async () => {
    const response = await request(app).post("/api/auth/register").send({});

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "Validation failed");
    assert.deepEqual(response.body.errors, [
      "name is required",
      "email is required",
      "username is required",
      "password is required",
    ]);
  });

  it("requires authentication for current user", async () => {
    const response = await request(app).get("/api/auth/me");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for dashboard summary", async () => {
    const response = await request(app).get("/api/dashboard/summary");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for profile updates", async () => {
    const response = await request(app).put("/api/auth/me").send({ name: "Updated User" });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for password changes", async () => {
    const response = await request(app).put("/api/auth/password").send({});

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("rejects malformed bearer tokens for current user", async () => {
    const response = await request(app).get("/api/auth/me").set("Authorization", "Bearer not-a-token");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token invalid");
  });

  it("rejects malformed auth cookies for current user", async () => {
    const response = await request(app).get("/api/auth/me").set("Cookie", "keja_token=not-a-token");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token invalid");
  });

  it("clears auth cookies on logout", async () => {
    const response = await request(app).post("/api/auth/logout").send({});

    assert.equal(response.status, 200);
    assert.equal(response.body.message, "Logged out");
    assert.match(response.headers["set-cookie"].join(";"), /keja_token=/);
    assert.match(response.headers["set-cookie"].join(";"), /keja_refresh=/);
  });

  it("logs out even with no request body at all, matching how the frontend actually calls it", async () => {
    // The frontend's logoutUser() sends no body and no Content-Type header,
    // so express.json() never populates req.body here - unlike .send({}) above.
    const response = await request(app).post("/api/auth/logout");

    assert.equal(response.status, 200);
    assert.equal(response.body.message, "Logged out");
  });

  it("requires refresh tokens for auth refresh", async () => {
    const response = await request(app).post("/api/auth/refresh").send({});

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Refresh token missing");
  });

  it("requires authentication for creating properties", async () => {
    const response = await request(app).post("/api/properties").send({});

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for listing my properties", async () => {
    const response = await request(app).get("/api/properties/mine");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for adding property images", async () => {
    const response = await request(app).post("/api/properties/000000000000000000000000/images").send({});

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for uploading property images", async () => {
    const response = await request(app)
      .post("/api/properties/000000000000000000000000/images/upload")
      .send({});

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("accepts image upload bodies bigger than express's 100kb JSON default", async () => {
    // Base64 image data inflates ~4/3 over the raw file, so a body well past
    // express.json()'s 100kb default has to clear the parser to ever reach
    // env.maxUploadBytes's own size check. This only proves the body parser
    // lets it through - it 401s afterward since there's no auth token.
    const response = await request(app)
      .post("/api/properties/000000000000000000000000/images/upload")
      .send({ mimeType: "image/png", data: "a".repeat(200 * 1024) });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for removing property images", async () => {
    const response = await request(app).delete(
      "/api/properties/000000000000000000000000/images/000000000000000000000001"
    );

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("rejects invalid property filters", async () => {
    const response = await request(app).get("/api/properties?minRent=abc");

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "minRent must be a number");
  });

  it("requires both lat and lng for property radius searches", async () => {
    const response = await request(app).get("/api/properties?lat=-1.2921");

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "lat and lng are required for radius search");
  });

  it("rejects invalid property latitude filters", async () => {
    const response = await request(app).get("/api/properties?lat=100&lng=36.782");

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "lat must be between -90 and 90");
  });

  it("rejects invalid property radius filters", async () => {
    const response = await request(app).get("/api/properties?lat=-1.2921&lng=36.782&radiusKm=0");

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "radiusKm must be greater than 0 and less than or equal to 100");
  });

  it("calculates property costs without authentication", async () => {
    const response = await request(app)
      .post("/api/properties/costs/calculate")
      .send({
        price: {
          rent: 65000,
          deposit: 65000,
          agencyFee: 5000,
        },
      });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.costSummary, {
      rent: 65000,
      deposit: 65000,
      agencyFee: 5000,
      firstMonthTotal: 70000,
      upfrontTotal: 135000,
      recurringMonthlyTotal: 65000,
    });
  });

  it("validates property cost calculation payloads", async () => {
    const response = await request(app)
      .post("/api/properties/costs/calculate")
      .send({
        price: {
          deposit: 65000,
        },
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "Validation failed");
    assert.deepEqual(response.body.errors, ["price.rent is required and must be a number"]);
  });

  it("rejects unsupported mover service types", async () => {
    const response = await request(app).get("/api/movers?serviceType=teleport");

    assert.equal(response.status, 400);
    assert.match(response.body.message, /serviceType must be one of/);
  });

  it("rejects invalid mover max base price filters", async () => {
    const response = await request(app).get("/api/movers?maxBasePrice=cheap");

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "maxBasePrice must be a number");
  });

  it("requires authentication for creating reviews", async () => {
    const response = await request(app).post("/api/reviews").send({});

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for owner review lists", async () => {
    const response = await request(app).get("/api/reviews/mine");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for owner review responses", async () => {
    const response = await request(app)
      .put("/api/reviews/000000000000000000000000/response")
      .send({ message: "Thank you." });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for creating inquiries", async () => {
    const response = await request(app).post("/api/inquiries").send({});

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for listing my inquiries", async () => {
    const response = await request(app).get("/api/inquiries");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for updating inquiries", async () => {
    const response = await request(app)
      .put("/api/inquiries/000000000000000000000000")
      .send({ status: "responded" });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for listing property inquiries", async () => {
    const response = await request(app).get("/api/properties/000000000000000000000000/inquiries");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for creating viewing requests", async () => {
    const response = await request(app).post("/api/viewings").send({});

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for listing favorites", async () => {
    const response = await request(app).get("/api/favorites");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for saving favorites", async () => {
    const response = await request(app).post("/api/favorites/000000000000000000000000").send({});

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for removing favorites", async () => {
    const response = await request(app).delete("/api/favorites/000000000000000000000000").send({});

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for listing my viewing requests", async () => {
    const response = await request(app).get("/api/viewings");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for updating viewing request status", async () => {
    const response = await request(app)
      .put("/api/viewings/000000000000000000000000/status")
      .send({ status: "approved" });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for listing property viewing requests", async () => {
    const response = await request(app).get("/api/properties/000000000000000000000000/viewings");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for listing notifications", async () => {
    const response = await request(app).get("/api/notifications");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for marking notifications read", async () => {
    const response = await request(app).put("/api/notifications/000000000000000000000000/read").send({});

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for agency verification", async () => {
    const response = await request(app).post("/api/agencies/verify").send({});

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for agency status", async () => {
    const response = await request(app).get("/api/agencies/status");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for admin agency verification list", async () => {
    const response = await request(app).get("/api/admin/agencies/verifications");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for admin user list", async () => {
    const response = await request(app).get("/api/admin/users");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for admin user summary", async () => {
    const response = await request(app).get("/api/admin/users/000000000000000000000000/summary");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for admin user status updates", async () => {
    const response = await request(app)
      .put("/api/admin/users/000000000000000000000000/status")
      .send({ status: "suspended" });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for admin user status history", async () => {
    const response = await request(app).get("/api/admin/users/000000000000000000000000/status-history");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for admin review list", async () => {
    const response = await request(app).get("/api/admin/reviews");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for admin violation list", async () => {
    const response = await request(app).get("/api/admin/violations");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for admin agency approval", async () => {
    const response = await request(app)
      .put("/api/admin/agencies/verifications/000000000000000000000000/approve")
      .send({});

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("handles unknown routes", async () => {
    const response = await request(app).get("/api/unknown");

    assert.equal(response.status, 404);
    assert.equal(response.body.message, "Not found - /api/unknown");
  });
});
