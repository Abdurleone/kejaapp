import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createViewingRequestSchema,
  updateViewingStatusSchema,
} from "../../validators/viewingValidators.js";

describe("viewingValidators", () => {
  it("does not require requested dates before the property viewing type is known", () => {
    assert.equal(createViewingRequestSchema.requestedDate.required, undefined);
  });

  it("accepts valid future requested dates", () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const message = createViewingRequestSchema.requestedDate.validate(futureDate);

    assert.equal(message, null);
  });

  it("rejects invalid requested dates", () => {
    const message = createViewingRequestSchema.requestedDate.validate("not-a-date");

    assert.equal(message, "requestedDate must be a valid date");
  });

  it("rejects past requested dates", () => {
    const message = createViewingRequestSchema.requestedDate.validate("2020-01-01T10:00:00.000Z");

    assert.equal(message, "requestedDate must be in the future");
  });

  it("allows actionable status updates", () => {
    assert.deepEqual(updateViewingStatusSchema.status.enum, [
      "approved",
      "rejected",
      "cancelled",
      "completed",
    ]);
  });

  it("limits viewing request messages", () => {
    const message = createViewingRequestSchema.message.validate("a".repeat(1001));

    assert.equal(message, "message must be 1000 characters or fewer");
  });
});
