import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildQueryString,
  canAccessView,
  canManageListings,
  canOpenPropertyDetails,
  canRegisterRole,
  canSearchListings,
  canUseTenantPropertyActions,
  createApiUrl,
  getDemoEmailForRole,
  formatStatusLabel,
  formatKes,
  formatRatingSummary,
  findPropertyById,
  getPropertyDetailPath,
  getPropertyIdFromPath,
  getPropertyImage,
  getViewPath,
  getDefaultViewForRole,
  nextColorMode,
  nextTheme,
  normalizeApiBaseUrl,
  resolveAssetUrl,
  resolveViewFromPath,
  shouldShowSplash,
  sortProperties,
  statusTone,
  summarizeReview,
  summarizeProperties,
} from "../app-utils.js";

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

  it("formats listing rating summaries", () => {
    assert.equal(formatRatingSummary(4.25, 3), "4.3 rating (3)");
    assert.equal(formatRatingSummary(0, 0), "No ratings");
  });

  it("toggles between the default and Kenyan flag themes", () => {
    assert.equal(nextTheme("default"), "kenya");
    assert.equal(nextTheme("kenya"), "default");
  });

  it("toggles between light and dark color modes", () => {
    assert.equal(nextColorMode("light"), "dark");
    assert.equal(nextColorMode("dark"), "light");
  });

  it("maps demo account roles to login emails", () => {
    assert.equal(getDemoEmailForRole("tenant"), "tenant@example.com");
    assert.equal(getDemoEmailForRole("landlord"), "landlord@example.com");
    assert.equal(getDemoEmailForRole("agency"), "agency@example.com");
    assert.equal(getDemoEmailForRole("admin"), "admin@example.com");
    assert.equal(getDemoEmailForRole("unknown"), "tenant@example.com");
  });

  it("allows public sign-up for non-admin user categories", () => {
    assert.equal(canRegisterRole("tenant"), true);
    assert.equal(canRegisterRole("landlord"), true);
    assert.equal(canRegisterRole("agency"), true);
    assert.equal(canRegisterRole("admin"), false);
  });

  it("maps frontend paths to workspace views", () => {
    assert.equal(resolveViewFromPath("/"), "discover");
    assert.equal(resolveViewFromPath("/search"), "discover");
    assert.equal(resolveViewFromPath("/admin"), "admin");
    assert.equal(resolveViewFromPath("/owner/"), "owner");
    assert.equal(resolveViewFromPath("/dashboard"), "dashboard");
    assert.equal(resolveViewFromPath("/unknown"), "discover");
    assert.equal(getViewPath("discover"), "/search");
    assert.equal(getViewPath("saved"), "/saved");
    assert.equal(getViewPath("dashboard"), "/dashboard");
  });

  it("routes property detail paths to the propertyDetail view and back", () => {
    assert.equal(getPropertyDetailPath("abc123"), "/property/abc123");
    assert.equal(resolveViewFromPath("/property/abc123"), "propertyDetail");
    assert.equal(resolveViewFromPath("/property/abc123/"), "propertyDetail");
    assert.equal(getPropertyIdFromPath("/property/abc123"), "abc123");
    assert.equal(getPropertyIdFromPath("/property/abc123/"), "abc123");
    assert.equal(getPropertyIdFromPath("/search"), null);
    assert.equal(getPropertyIdFromPath("/property/"), null);
  });

  it("shows the splash only for anonymous users on the root path", () => {
    assert.equal(shouldShowSplash({ isSignedIn: false, path: "/" }), true);
    assert.equal(shouldShowSplash({ isSignedIn: false, path: "/search" }), false);
    assert.equal(shouldShowSplash({ isSignedIn: true, path: "/" }), false);
  });

  it("enforces role-specific frontend access", () => {
    assert.equal(canAccessView(undefined, "discover"), true);
    assert.equal(canAccessView(undefined, "saved"), false);
    assert.equal(canAccessView(undefined, "dashboard"), false);
    assert.equal(canAccessView("tenant", "owner"), false);
    assert.equal(canAccessView("tenant", "saved"), true);
    assert.equal(canAccessView("tenant", "dashboard"), true);
    assert.equal(canAccessView("landlord", "discover"), false);
    assert.equal(canAccessView("landlord", "owner"), true);
    assert.equal(canAccessView("landlord", "dashboard"), true);
    assert.equal(canAccessView("agency", "admin"), false);
    assert.equal(canAccessView("admin", "discover"), false);
    assert.equal(canAccessView("admin", "admin"), true);
    assert.equal(canAccessView("admin", "owner"), true);
    assert.equal(canAccessView("admin", "dashboard"), true);
    assert.equal(getDefaultViewForRole("tenant"), "dashboard");
    assert.equal(getDefaultViewForRole("landlord"), "dashboard");
    assert.equal(getDefaultViewForRole("admin"), "dashboard");
    assert.equal(canSearchListings(undefined), true);
    assert.equal(canSearchListings("tenant"), true);
    assert.equal(canSearchListings("agency"), false);
    assert.equal(canUseTenantPropertyActions("tenant"), true);
    assert.equal(canUseTenantPropertyActions("landlord"), false);
    assert.equal(canOpenPropertyDetails(undefined), false);
    assert.equal(canOpenPropertyDetails("tenant"), true);
    assert.equal(canOpenPropertyDetails("landlord"), false);
    assert.equal(canManageListings("tenant"), false);
    assert.equal(canManageListings("agency"), true);
  });

  it("finds properties across cached frontend collections", () => {
    const property = { _id: "p2", title: "Found home" };

    assert.equal(
      findPropertyById([[{ _id: "p1" }], [property]], "p2"),
      property
    );
    assert.equal(findPropertyById([[{ _id: "p1" }]], "missing"), undefined);
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

  it("summarizes reviews for owner and admin tables", () => {
    assert.equal(
      summarizeReview({
        property: { title: "Modern Kilimani Apartment" },
        user: { name: "Demo Tenant" },
        rating: 4,
      }),
      "Modern Kilimani Apartment - 4/5 by Demo Tenant"
    );
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
