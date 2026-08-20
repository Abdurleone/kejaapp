import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildQueryString,
  canAccessView,
  canManageListings,
  canOpenPropertyDetails,
  canSearchListings,
  createApiUrl,
  formatStatusLabel,
  formatKes,
  formatRatingSummary,
  getPropertyDetailPath,
  getPropertyEditIdFromPath,
  getPropertyEditPath,
  getPropertyCreatePath,
  getPropertyIdFromPath,
  getPropertyImage,
  getViewPath,
  getDefaultViewForRole,
  normalizeApiBaseUrl,
  resolveAssetUrl,
  resolveViewFromPath,
  shouldShowSplash,
  statusTone,
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

  it("maps frontend paths to workspace views", () => {
    assert.equal(resolveViewFromPath("/"), "discover");
    assert.equal(resolveViewFromPath("/search"), "discover");
    assert.equal(resolveViewFromPath("/admin"), "admin");
    assert.equal(resolveViewFromPath("/owner/"), "owner");
    assert.equal(resolveViewFromPath("/dashboard"), "dashboard");
    assert.equal(resolveViewFromPath("/unknown"), "notFound");
    assert.equal(getViewPath("discover"), "/search");
    assert.equal(getViewPath("saved"), "/saved");
    assert.equal(getViewPath("dashboard"), "/dashboard");
    assert.equal(getViewPath("dataProtection"), "/data-protection");
    assert.equal(resolveViewFromPath("/data-protection"), "dataProtection");
    assert.equal(getViewPath("selectRole"), "/select-role");
    assert.equal(resolveViewFromPath("/select-role"), "selectRole");
    assert.equal(getViewPath("support"), "/support");
    assert.equal(resolveViewFromPath("/support"), "support");
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

  it("routes property edit paths to the propertyEdit view and back", () => {
    assert.equal(getPropertyEditPath("abc123"), "/owner/properties/abc123/edit");
    assert.equal(resolveViewFromPath("/owner/properties/abc123/edit"), "propertyEdit");
    assert.equal(resolveViewFromPath("/owner/properties/abc123/edit/"), "propertyEdit");
    assert.equal(getPropertyEditIdFromPath("/owner/properties/abc123/edit"), "abc123");
    assert.equal(getPropertyEditIdFromPath("/owner/properties/abc123/edit/"), "abc123");
    assert.equal(getPropertyEditIdFromPath("/owner"), null);
    assert.equal(getPropertyEditIdFromPath("/property/abc123"), null);
  });

  it("routes the property create path to the propertyCreate view, not propertyEdit", () => {
    assert.equal(getPropertyCreatePath(), "/owner/properties/new");
    assert.equal(resolveViewFromPath("/owner/properties/new"), "propertyCreate");
    assert.equal(getViewPath("propertyCreate"), "/owner/properties/new");
    assert.equal(getPropertyEditIdFromPath("/owner/properties/new"), null);
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
    assert.equal(canAccessView("admin", "owner"), false);
    assert.equal(canAccessView("admin", "dashboard"), true);
    assert.equal(canAccessView(undefined, "dataProtection"), true);
    // Always reachable regardless of role - App.jsx forces this view itself
    // whenever the signed-in user's role isn't confirmed yet.
    assert.equal(canAccessView(undefined, "selectRole"), true);
    assert.equal(canAccessView("tenant", "selectRole"), true);
    assert.equal(canAccessView("admin", "selectRole"), true);
    // Same reasoning as selectRole above - App.jsx itself gates on signedIn
    // before rendering SupportPage, so canAccessView doesn't need to (and
    // shouldn't - it isn't role-specific, just auth-specific).
    assert.equal(canAccessView(undefined, "support"), true);
    assert.equal(canAccessView("tenant", "support"), true);
    assert.equal(canAccessView("landlord", "support"), true);
    assert.equal(canAccessView("admin", "support"), true);
    assert.equal(getDefaultViewForRole("tenant"), "dashboard");
    assert.equal(getDefaultViewForRole("landlord"), "dashboard");
    assert.equal(getDefaultViewForRole("admin"), "dashboard");
    assert.equal(canSearchListings(undefined), true);
    assert.equal(canSearchListings("tenant"), true);
    assert.equal(canSearchListings("agency"), false);
    assert.equal(canOpenPropertyDetails(undefined), false);
    assert.equal(canOpenPropertyDetails("tenant"), true);
    assert.equal(canOpenPropertyDetails("landlord"), true);
    assert.equal(canOpenPropertyDetails("mover"), false);
    assert.equal(canManageListings("tenant"), false);
    assert.equal(canManageListings("agency"), true);
    assert.equal(canManageListings("admin"), false);
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

  it("averages the two middle values for an even-length rent collection", () => {
    const summary = summarizeProperties([
      { price: { rent: 50000 } },
      { price: { rent: 70000 } },
      { price: { rent: 90000 } },
      { price: { rent: 110000 } },
    ]);

    assert.equal(summary.medianRent, 80000);
  });
});
