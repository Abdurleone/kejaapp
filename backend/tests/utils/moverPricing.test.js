import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateMoverPriceEstimate } from "../../utils/moverPricing.js";

describe("calculateMoverPriceEstimate", () => {
  it("returns null when distanceKm is missing", () => {
    assert.equal(calculateMoverPriceEstimate({ homeSize: "2br", basePrice: 1000 }), null);
  });

  it("returns null when homeSize is missing", () => {
    assert.equal(calculateMoverPriceEstimate({ distanceKm: 5, basePrice: 1000 }), null);
  });

  it("weighs home size as primary and distance as secondary for a short move", () => {
    // distanceKm 5 < the 10km threshold: sizeCost (2br=4000) full weight,
    // distanceCost (5*50=250) at the reduced 0.3 weight.
    const estimate = calculateMoverPriceEstimate({ distanceKm: 5, homeSize: "2br", basePrice: 1000 });

    assert.equal(estimate, 1000 + 4000 + 250 * 0.3);
  });

  it("weighs distance as primary and home size as secondary for a long move", () => {
    // distanceKm 20 >= the 10km threshold: distanceCost (20*50=1000) full
    // weight, sizeCost (studio=1500) at the reduced 0.3 weight.
    const estimate = calculateMoverPriceEstimate({ distanceKm: 20, homeSize: "studio", basePrice: 0 });

    assert.equal(estimate, 1000 + 1500 * 0.3);
  });

  it("treats a distance exactly at the threshold as a long move", () => {
    const estimate = calculateMoverPriceEstimate({ distanceKm: 10, homeSize: "studio", basePrice: 0 });

    // distanceCost (10*50=500) primary, sizeCost (1500) secondary.
    assert.equal(estimate, 500 + 1500 * 0.3);
  });

  it("treats a missing basePrice as zero rather than throwing", () => {
    const estimate = calculateMoverPriceEstimate({ distanceKm: 5, homeSize: "studio" });

    assert.equal(estimate, 0 + 1500 + 5 * 50 * 0.3);
  });
});
