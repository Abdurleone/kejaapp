import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMoverRequestSchema } from "../../validators/moverRequestValidators.js";
import { homeSizes } from "../../utils/moverPricing.js";

describe("moverRequestValidators", () => {
  it("requires a home-size category matching the supported set", () => {
    assert.equal(createMoverRequestSchema.homeSize.required, true);
    assert.deepEqual(createMoverRequestSchema.homeSize.enum, homeSizes);
  });
});
