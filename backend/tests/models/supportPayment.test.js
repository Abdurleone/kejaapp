import assert from "node:assert/strict";
import mongoose from "mongoose";
import { describe, it } from "node:test";
import SupportPayment, { supportPaymentStatuses } from "../../models/SupportPayment.js";

const baseFields = {
  user: new mongoose.Types.ObjectId(),
  phoneNumber: "254712345678",
  amount: 100,
  merchantRequestId: "merchant-1",
  checkoutRequestId: "checkout-1",
};

describe("SupportPayment model", () => {
  it("defaults new payments to pending with no result yet", () => {
    const payment = new SupportPayment(baseFields);

    assert.equal(payment.status, "pending");
    assert.equal(payment.resultCode, null);
    assert.equal(payment.resultDesc, "");
    assert.equal(payment.mpesaReceiptNumber, "");
  });

  it("requires user, phoneNumber, amount, merchantRequestId, checkoutRequestId", () => {
    const payment = new SupportPayment({});
    const error = payment.validateSync();

    assert.ok(error.errors.user);
    assert.ok(error.errors.phoneNumber);
    assert.ok(error.errors.amount);
    assert.ok(error.errors.merchantRequestId);
    assert.ok(error.errors.checkoutRequestId);
  });

  it("rejects an amount below 1", () => {
    const payment = new SupportPayment({ ...baseFields, amount: 0 });
    const error = payment.validateSync();

    assert.ok(error.errors.amount);
  });

  it("only allows pending/completed/failed/cancelled statuses", () => {
    assert.deepEqual(supportPaymentStatuses, ["pending", "completed", "failed", "cancelled"]);

    const payment = new SupportPayment({ ...baseFields, status: "archived" });
    const error = payment.validateSync();

    assert.ok(error.errors.status);
  });

  it("defines the user/createdAt index", () => {
    const indexes = SupportPayment.schema.indexes();
    const userIndex = indexes.find(([fields]) => fields.user === 1 && fields.createdAt === -1);

    assert.ok(userIndex);
  });

  it("marks checkoutRequestId unique", () => {
    const checkoutRequestIdPath = SupportPayment.schema.path("checkoutRequestId");
    assert.equal(checkoutRequestIdPath.options.unique, true);
  });
});
