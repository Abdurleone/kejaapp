import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createInquirySchema,
  updateInquirySchema,
} from "../../validators/inquiryValidators.js";

describe("inquiryValidators", () => {
  it("supports expected contact preferences", () => {
    assert.deepEqual(createInquirySchema.contactPreference.enum, ["phone", "email", "in_app"]);
  });

  it("limits inquiry subject length", () => {
    const message = createInquirySchema.subject.validate("a".repeat(141));

    assert.equal(message, "subject must be 140 characters or fewer");
  });

  it("limits inquiry message length", () => {
    const message = createInquirySchema.message.validate("a".repeat(1001));

    assert.equal(message, "message must be 1000 characters or fewer");
  });

  it("allows only manageable statuses on update", () => {
    assert.deepEqual(updateInquirySchema.status.enum, ["responded", "closed"]);
  });

  it("limits inquiry response length", () => {
    const message = updateInquirySchema.response.validate("a".repeat(1001));

    assert.equal(message, "response must be 1000 characters or fewer");
  });
});
