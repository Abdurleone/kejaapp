import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildQueryString,
  createApiUrl,
  formatStatusLabel,
  formatKes,
  getPropertyImage,
  getViewPath,
  nextTheme,
  normalizeApiBaseUrl,
  resolveAssetUrl,
  resolveViewFromPath,
  sortProperties,
  statusTone,
  summarizeProperties,
} from "../app.js";

describe("frontend app utilities", () => {
  it("formats Kenyan shilling amounts", () => {
    assert.equal(formatKes(65000), "Ksh 65,000");
  });

  it("builds query strings without empty filters", () => {
    assert.equal(
      buildQueryString({
        county: "Nairobi",
        area: "",
        minRent: 50000,
      }),
      "?county=Nairobi&minRent=50000"
    );
  });

  it("normalizes backend API URLs", () => {
    assert.equal(normalizeApiBaseUrl("http://localhost:5000/"), "http://localhost:5000");
    assert.equal(normalizeApiBaseUrl(""), "http://localhost:5000");
    assert.equal(createApiUrl("api/health", "http://localhost:5000/"), "http://localhost:5000/api/health");
  });

  it("resolves relative uploaded assets against the API base URL", () => {
    assert.equal(
      resolveAssetUrl("/uploads/properties/image.jpg", "http://localhost:5000"),
      "http://localhost:5000/uploads/properties/image.jpg"
    );
  });

  it("keeps absolute image URLs intact", () => {
    assert.equal(
      getPropertyImage({
        images: [{ url: "https://example.com/home.jpg" }],
      }),
      "https://example.com/home.jpg"
    );
  });

  it("assigns status tones", () => {
    assert.equal(statusTone("active"), "status-active");
    assert.equal(statusTone("suspended"), "status-suspended");
    assert.equal(statusTone("banned"), "status-banned");
  });

  it("formats status labels", () => {
    assert.equal(formatStatusLabel("open_viewing"), "Open Viewing");
  });

  it("toggles between the default and Kenyan flag themes", () => {
    assert.equal(nextTheme("default"), "kenya");
    assert.equal(nextTheme("kenya"), "default");
  });

  it("maps frontend paths to workspace views", () => {
    assert.equal(resolveViewFromPath("/admin"), "admin");
    assert.equal(resolveViewFromPath("/owner/"), "owner");
    assert.equal(resolveViewFromPath("/unknown"), "discover");
    assert.equal(getViewPath("saved"), "/saved");
  });

  it("summarizes property collections", () => {
    const summary = summarizeProperties([
      { price: { rent: 50000 }, viewingType: "open", location: { area: "Kilimani" } },
      { price: { rent: 70000 }, viewingType: "scheduled", location: { area: "Westlands" } },
      { price: { rent: 90000 }, viewingType: "scheduled", location: { area: "Kilimani" } },
    ]);

    assert.equal(summary.total, 3);
    assert.equal(summary.medianRent, 70000);
    assert.equal(summary.openViewings, 1);
    assert.equal(summary.scheduledViewings, 2);
    assert.equal(summary.areaCount, 2);
  });

  it("sorts properties by rent", () => {
    const properties = [
      { title: "B", price: { rent: 70000 } },
      { title: "A", price: { rent: 50000 } },
    ];

    assert.equal(sortProperties(properties, "rent-asc")[0].title, "A");
    assert.equal(sortProperties(properties, "rent-desc")[0].title, "B");
  });
});
