import assert from "node:assert/strict";
import { describe, it } from "node:test";
import validateRequest from "../../middlewares/validateRequest.js";
import { initiateSupportPaymentSchema } from "../../validators/supportPaymentValidators.js";

const validate = (body) => {
  const res = {
    body: null,
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  let nextCalled = false;

  validateRequest(initiateSupportPaymentSchema)({ body }, res, () => {
    nextCalled = true;
  });

  return { nextCalled, res };
};

describe("supportPaymentValidators", () => {
  it("accepts a valid payload", () => {
    const { nextCalled } = validate({ phoneNumber: "0712345678", amount: 100 });
    assert.equal(nextCalled, true);
  });

  it("rejects a malformed phone number", () => {
    const { res } = validate({ phoneNumber: "0812345678", amount: 100 });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, ["phoneNumber must be a valid Kenyan phone number"]);
  });

  it("rejects an amount below 1", () => {
    const { res } = validate({ phoneNumber: "0712345678", amount: 0 });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, ["amount must be at least 1"]);
  });

  it("rejects an amount over the cap", () => {
    const { res } = validate({ phoneNumber: "0712345678", amount: 150001 });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, ["amount must be 150000 or less"]);
  });

  it("rejects a fractional amount", () => {
    const { res } = validate({ phoneNumber: "0712345678", amount: 99.5 });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, [
      "amount must be a whole number of KES (M-Pesa doesn't support fractional shillings)",
    ]);
  });

  it("requires both fields", () => {
    const { res } = validate({});
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, ["phoneNumber is required", "amount is required"]);
  });
});
