import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPropertyFilters } from "../../utils/propertyFilters.js";

describe("buildPropertyFilters", () => {
  it("defaults to available listings with no other filters", () => {
    assert.deepEqual(buildPropertyFilters({}), { status: "available" });
  });

  it("filters by type", () => {
    const filters = buildPropertyFilters({ type: "studio" });
    assert.equal(filters.type, "studio");
  });

  it("rejects an unsupported status", () => {
    assert.throws(() => buildPropertyFilters({ status: "not-a-status" }), /status must be one of/);
  });

  it("filters by a minRent/maxRent range", () => {
    const filters = buildPropertyFilters({ minRent: "10000", maxRent: "20000" });
    assert.deepEqual(filters["price.rent"], { $gte: 10000, $lte: 20000 });
  });

  it("rejects a non-numeric minRent", () => {
    assert.throws(() => buildPropertyFilters({ minRent: "abc" }), /minRent must be a number/);
  });

  it("filters by a bedroom minimum ('N+ bedrooms'), not an exact match", () => {
    const filters = buildPropertyFilters({ bedrooms: "2" });
    assert.deepEqual(filters.bedrooms, { $gte: 2 });
  });

  it("rejects a negative or non-numeric bedrooms value", () => {
    assert.throws(() => buildPropertyFilters({ bedrooms: "-1" }), /bedrooms must be a non-negative number/);
    assert.throws(() => buildPropertyFilters({ bedrooms: "abc" }), /bedrooms must be a non-negative number/);
  });

  it("omits the bedrooms filter when not provided", () => {
    const filters = buildPropertyFilters({});
    assert.equal(filters.bedrooms, undefined);
  });

  it("builds a geo radius filter from lat/lng/radiusKm", () => {
    const filters = buildPropertyFilters({ lat: "-1.3", lng: "36.8", radiusKm: "5" });
    assert.ok(filters["location.coordinates"].$geoWithin.$centerSphere);
    const [[lng, lat], radiusRadians] = filters["location.coordinates"].$geoWithin.$centerSphere;
    assert.equal(lng, 36.8);
    assert.equal(lat, -1.3);
    assert.ok(radiusRadians > 0);
  });

  it("requires both lat and lng together", () => {
    assert.throws(() => buildPropertyFilters({ lat: "-1.3" }), /lat and lng are required/);
  });

  it("rejects a radiusKm outside the allowed range", () => {
    assert.throws(
      () => buildPropertyFilters({ lat: "-1.3", lng: "36.8", radiusKm: "150" }),
      /radiusKm must be greater than 0/
    );
  });

  it("combines multiple filters together", () => {
    const filters = buildPropertyFilters({ type: "apartment", bedrooms: "3", minRent: "5000" });
    assert.equal(filters.type, "apartment");
    assert.deepEqual(filters.bedrooms, { $gte: 3 });
    assert.deepEqual(filters["price.rent"], { $gte: 5000 });
  });

  it("escapes regex metacharacters in county/town/area so they match literally", () => {
    const filters = buildPropertyFilters({ county: "Nairobi (Central)", town: "a.*b", area: "c+d" });
    assert.equal(filters["location.county"].source, "Nairobi \\(Central\\)");
    assert.equal(filters["location.town"].source, "a\\.\\*b");
    assert.equal(filters["location.area"].source, "c\\+d");
  });

  it("does not choke on a pathological regex-like county value (ReDoS guard)", () => {
    const pathological = "(a+)+$";
    const start = Date.now();
    const filters = buildPropertyFilters({ county: pathological });
    assert.ok(Date.now() - start < 50);
    assert.equal(filters["location.county"].test("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!"), false);
  });
});
