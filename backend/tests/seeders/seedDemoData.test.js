import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  agencyVerifications,
  inquiries,
  properties,
  users,
  viewingRequests,
} from "../../seeders/seedDemoData.js";

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
    assert.equal(emails.includes("rejected.agency@example.com"), true);
    assert.equal(emails.includes("admin@example.com"), true);
    assert.equal(users.every((user) => user.password === "password123"), true);
  });

  it("includes properties across active and inactive lifecycle states", () => {
    const statuses = new Set(properties.map((property) => property.status));

    assert.equal(statuses.has("available"), true);
    assert.equal(statuses.has("draft"), true);
    assert.equal(statuses.has("taken"), true);
  });

  it("includes a duplicate image fixture for violation testing", () => {
    const imageUrls = properties.flatMap((property) => property.images?.map((image) => image.url) || []);
    const duplicateImageUrls = imageUrls.filter((url, index) => imageUrls.indexOf(url) !== index);

    assert.equal(
      duplicateImageUrls.includes(
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=70"
      ),
      true
    );
  });

  it("includes agency verification records for admin testing", () => {
    const statuses = new Set(agencyVerifications.map((verification) => verification.status));
    const userEmails = agencyVerifications.map((verification) => verification.userEmail);

    assert.equal(statuses.has("pending"), true);
    assert.equal(statuses.has("approved"), true);
    assert.equal(statuses.has("rejected"), true);
    assert.equal(userEmails.includes("agency@example.com"), true);
    assert.equal(userEmails.includes("urban.agency@example.com"), true);
    assert.equal(userEmails.includes("rejected.agency@example.com"), true);
  });

  it("includes tenant inquiry records for workflow testing", () => {
    const statuses = new Set(inquiries.map((inquiry) => inquiry.status));

    assert.equal(inquiries.length >= 2, true);
    assert.equal(statuses.has("open"), true);
    assert.equal(statuses.has("responded"), true);
    assert.equal(inquiries.every((inquiry) => inquiry.senderEmail), true);
    assert.equal(inquiries.every((inquiry) => inquiry.propertyTitle), true);
  });

  it("includes viewing request records for workflow testing", () => {
    const statuses = new Set(viewingRequests.map((viewingRequest) => viewingRequest.status));

    assert.equal(viewingRequests.length >= 2, true);
    assert.equal(statuses.has("pending"), true);
    assert.equal(statuses.has("approved"), true);
    assert.equal(viewingRequests.every((viewingRequest) => viewingRequest.requesterEmail), true);
    assert.equal(viewingRequests.every((viewingRequest) => viewingRequest.propertyTitle), true);
  });
});
