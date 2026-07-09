import assert from "node:assert/strict";
import mongoose from "mongoose";
import { describe, it } from "node:test";
import Inquiry from "../../models/Inquiry.js";

describe("Inquiry model", () => {
  it("defaults new inquiries to open in-app messages", () => {
    const inquiry = new Inquiry({
      property: new mongoose.Types.ObjectId(),
      sender: new mongoose.Types.ObjectId(),
      owner: new mongoose.Types.ObjectId(),
      message: "Is this property still available?",
    });

    assert.equal(inquiry.status, "open");
    assert.equal(inquiry.contactPreference, "in_app");
    assert.equal(inquiry.respondedAt, null);
    assert.equal(inquiry.respondedBy, null);
    assert.equal(inquiry.nudgedAt, null);
  });
});
