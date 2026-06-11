import assert from "node:assert/strict";
import { describe, it } from "node:test";
import request from "./helpers/testApp.js";

describe("KejaApp API", () => {
  it("returns health metadata", async () => {
    const response = await request("/");

    assert.equal(response.status, 200);
    assert.equal(response.body.message, "KejaApp API is running...");
  });

  it("returns API health status", async () => {
    const response = await request("/api/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "degraded");
    assert.equal(response.body.database.path, "/kejaapp");
    assert.equal(response.body.database.status, "disconnected");
  });

  it("validates register payloads", async () => {
    const response = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "Validation failed");
    assert.deepEqual(response.body.errors, [
      "name is required",
      "email is required",
      "password is required",
    ]);
  });

  it("requires authentication for current user", async () => {
    const response = await request("/api/auth/me");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for profile updates", async () => {
    const response = await request("/api/auth/me", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated User" }),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for password changes", async () => {
    const response = await request("/api/auth/password", {
      method: "PUT",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("rejects malformed bearer tokens for current user", async () => {
    const response = await request("/api/auth/me", {
      headers: {
        Authorization: "Bearer not-a-token",
      },
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token invalid");
  });

  it("rejects malformed auth cookies for current user", async () => {
    const response = await request("/api/auth/me", {
      headers: {
        Cookie: "keja_token=not-a-token",
      },
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token invalid");
  });

  it("clears auth cookies on logout", async () => {
    const response = await request("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.message, "Logged out");
    assert.match(response.headers["set-cookie"], /keja_token=/);
  });

  it("requires authentication for creating properties", async () => {
    const response = await request("/api/properties", {
      method: "POST",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for adding property images", async () => {
    const response = await request("/api/properties/000000000000000000000000/images", {
      method: "POST",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for removing property images", async () => {
    const response = await request(
      "/api/properties/000000000000000000000000/images/000000000000000000000001",
      {
        method: "DELETE",
        body: JSON.stringify({}),
      }
    );

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("rejects invalid property filters", async () => {
    const response = await request("/api/properties?minRent=abc");

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "minRent must be a number");
  });

  it("calculates property costs without authentication", async () => {
    const response = await request("/api/properties/costs/calculate", {
      method: "POST",
      body: JSON.stringify({
        price: {
          rent: 65000,
          deposit: 65000,
          agencyFee: 5000,
        },
      }),
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
    const response = await request("/api/properties/costs/calculate", {
      method: "POST",
      body: JSON.stringify({
        price: {
          deposit: 65000,
        },
      }),
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "Validation failed");
    assert.deepEqual(response.body.errors, ["price.rent is required and must be a number"]);
  });

  it("rejects invalid mover filters", async () => {
    const response = await request("/api/movers?minRating=great");

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "minRating must be a number");
  });

  it("rejects unsupported mover service types", async () => {
    const response = await request("/api/movers?serviceType=teleport");

    assert.equal(response.status, 400);
    assert.match(response.body.message, /serviceType must be one of/);
  });

  it("rejects invalid mover max base price filters", async () => {
    const response = await request("/api/movers?maxBasePrice=cheap");

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "maxBasePrice must be a number");
  });

  it("requires authentication for creating reviews", async () => {
    const response = await request("/api/reviews", {
      method: "POST",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for creating inquiries", async () => {
    const response = await request("/api/inquiries", {
      method: "POST",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for listing my inquiries", async () => {
    const response = await request("/api/inquiries");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for updating inquiries", async () => {
    const response = await request("/api/inquiries/000000000000000000000000", {
      method: "PUT",
      body: JSON.stringify({ status: "responded" }),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for listing property inquiries", async () => {
    const response = await request("/api/properties/000000000000000000000000/inquiries");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for creating viewing requests", async () => {
    const response = await request("/api/viewings", {
      method: "POST",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for listing favorites", async () => {
    const response = await request("/api/favorites");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for saving favorites", async () => {
    const response = await request("/api/favorites/000000000000000000000000", {
      method: "POST",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for removing favorites", async () => {
    const response = await request("/api/favorites/000000000000000000000000", {
      method: "DELETE",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for listing my viewing requests", async () => {
    const response = await request("/api/viewings");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for updating viewing request status", async () => {
    const response = await request("/api/viewings/000000000000000000000000/status", {
      method: "PUT",
      body: JSON.stringify({ status: "approved" }),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for listing property viewing requests", async () => {
    const response = await request("/api/properties/000000000000000000000000/viewings");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for listing notifications", async () => {
    const response = await request("/api/notifications");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for marking notifications read", async () => {
    const response = await request("/api/notifications/000000000000000000000000/read", {
      method: "PUT",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for agency verification", async () => {
    const response = await request("/api/agencies/verify", {
      method: "POST",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for agency status", async () => {
    const response = await request("/api/agencies/status");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for admin agency verification list", async () => {
    const response = await request("/api/admin/agencies/verifications");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("requires authentication for admin agency approval", async () => {
    const response = await request("/api/admin/agencies/verifications/000000000000000000000000/approve", {
      method: "PUT",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("handles unknown routes", async () => {
    const response = await request("/api/unknown");

    assert.equal(response.status, 404);
    assert.equal(response.body.message, "Not found - /api/unknown");
  });
});
