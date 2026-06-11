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

  it("requires authentication for creating properties", async () => {
    const response = await request("/api/properties", {
      method: "POST",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Not authorized, token missing");
  });

  it("rejects invalid property filters", async () => {
    const response = await request("/api/properties?minRent=abc");

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "minRent must be a number");
  });

  it("rejects invalid mover filters", async () => {
    const response = await request("/api/movers?minRating=great");

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "minRating must be a number");
  });

  it("requires authentication for creating reviews", async () => {
    const response = await request("/api/reviews", {
      method: "POST",
      body: JSON.stringify({}),
    });

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

  it("handles unknown routes", async () => {
    const response = await request("/api/unknown");

    assert.equal(response.status, 404);
    assert.equal(response.body.message, "Not found - /api/unknown");
  });
});
