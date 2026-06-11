import assert from "node:assert/strict";
import { describe, it } from "node:test";
import validateRequest from "../../middlewares/validateRequest.js";
import { agencyVerificationSchema } from "../../validators/agencyValidators.js";

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

  validateRequest(agencyVerificationSchema)({ body }, res, () => {
    nextCalled = true;
  });

  return { nextCalled, res };
};

describe("agencyValidators", () => {
  it("requires agency verification details", () => {
    const { res } = validate({});

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.errors, [
      "agencyName is required",
      "registrationNumber is required",
      "businessEmail is required",
      "businessPhone is required",
      "officeAddress is required",
    ]);
  });

  it("accepts a valid agency verification payload", () => {
    const { nextCalled } = validate({
      agencyName: "Demo Homes Agency",
      registrationNumber: "BN-123456",
      businessEmail: "agency@example.com",
      businessPhone: "+254700000000",
      officeAddress: "Kilimani, Nairobi",
      documents: [
        {
          type: "business_registration",
          url: "https://example.com/document.pdf",
        },
      ],
    });

    assert.equal(nextCalled, true);
  });
});
