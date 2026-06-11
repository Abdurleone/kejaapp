import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachCostSummaries,
  attachCostSummary,
  calculatePropertyCosts,
} from "../../services/costService.js";

describe("costService", () => {
  it("calculates first month, upfront, and recurring property costs", () => {
    const costs = calculatePropertyCosts({
      rent: 65000,
      deposit: 65000,
      agencyFee: 5000,
    });

    assert.deepEqual(costs, {
      rent: 65000,
      deposit: 65000,
      agencyFee: 5000,
      firstMonthTotal: 70000,
      upfrontTotal: 135000,
      recurringMonthlyTotal: 65000,
    });
  });

  it("defaults missing and invalid amounts to zero", () => {
    const costs = calculatePropertyCosts({
      rent: "45000",
      deposit: undefined,
      agencyFee: "not-a-number",
    });

    assert.deepEqual(costs, {
      rent: 45000,
      deposit: 0,
      agencyFee: 0,
      firstMonthTotal: 45000,
      upfrontTotal: 45000,
      recurringMonthlyTotal: 45000,
    });
  });

  it("attaches a cost summary without mutating the source property", () => {
    const property = {
      title: "Modern Kilimani Apartment",
      price: {
        rent: 65000,
        deposit: 65000,
        agencyFee: 5000,
      },
    };

    const result = attachCostSummary(property);

    assert.equal(property.costSummary, undefined);
    assert.equal(result.title, property.title);
    assert.equal(result.costSummary.upfrontTotal, 135000);
  });

  it("supports Mongoose-style documents that expose toObject", () => {
    const property = {
      toObject() {
        return {
          title: "Westlands Studio",
          price: {
            rent: 35000,
            deposit: 35000,
          },
        };
      },
    };

    const result = attachCostSummary(property);

    assert.equal(result.title, "Westlands Studio");
    assert.equal(result.costSummary.upfrontTotal, 70000);
  });

  it("attaches cost summaries to property lists", () => {
    const properties = [
      {
        price: {
          rent: 30000,
        },
      },
      {
        price: {
          rent: 50000,
          deposit: 50000,
          agencyFee: 3000,
        },
      },
    ];

    const results = attachCostSummaries(properties);

    assert.equal(results.length, 2);
    assert.equal(results[0].costSummary.upfrontTotal, 30000);
    assert.equal(results[1].costSummary.upfrontTotal, 103000);
  });
});
