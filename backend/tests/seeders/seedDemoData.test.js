import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { properties, users } from "../../seeders/seedDemoData.js";

describe("seedDemoData", () => {
  it("includes demo users for each supported role", () => {
    const roles = new Set(users.map((user) => user.role));

    assert.equal(roles.has("tenant"), true);
    assert.equal(roles.has("landlord"), true);
    assert.equal(roles.has("agency"), true);
    assert.equal(roles.has("admin"), true);
  });

  it("provides known demo login credentials", () => {
    const emails = users.map((user) => user.email);

    assert.equal(emails.includes("tenant@example.com"), true);
    assert.equal(emails.includes("landlord@example.com"), true);
    assert.equal(emails.includes("agency@example.com"), true);
    assert.equal(emails.includes("admin@example.com"), true);
    assert.equal(users.every((user) => user.password === "password123"), true);
  });

  it("includes properties across active and inactive lifecycle states", () => {
    const statuses = new Set(properties.map((property) => property.status));

    assert.equal(statuses.has("available"), true);
    assert.equal(statuses.has("draft"), true);
    assert.equal(statuses.has("taken"), true);
  });
});
