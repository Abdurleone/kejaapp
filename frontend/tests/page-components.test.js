import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const readSource = (relativePath) => readFile(new URL(`../src/${relativePath}`, import.meta.url), "utf8");

const appSource = await readSource("App.jsx");
const discoverSource = await readSource("pages/DiscoverPage.jsx");
const savedSource = await readSource("pages/SavedPage.jsx");
const accountSource = await readSource("pages/AccountPage.jsx");
const landingSource = await readSource("pages/LandingPage.jsx");
const dashboardSource = await readSource("pages/DashboardPage.jsx");
const workspaceSource = await readSource("pages/WorkspacePage.jsx");
const propertyEditSource = await readSource("pages/PropertyEditPage.jsx");

describe("frontend page component contracts", () => {
  it("renders discover listings with API data, cards, and save actions", () => {
    assert.match(discoverSource, /fetchProperties\(params\)/);
    assert.match(discoverSource, /fetchFavorites\(\)/);
    assert.match(discoverSource, /saveFavorite\(propertyId\)/);
    assert.match(discoverSource, /getPropertyImage\(property\)/);
    assert.match(discoverSource, /className="property-grid"/);
    assert.match(discoverSource, /className="property-card"/);
    assert.match(discoverSource, /className="property-photo"/);
    assert.match(discoverSource, /className="card-actions"/);
  });

  it("keeps discover location search and empty/error states wired", () => {
    assert.match(discoverSource, /navigator\.geolocation\.getCurrentPosition/);
    assert.match(discoverSource, /params\.radiusKm\s*=\s*radiusKm/);
    assert.match(discoverSource, /Radius/);
    assert.match(discoverSource, /Near me/);
    assert.match(discoverSource, /Clear location/);
    assert.match(discoverSource, /<PropertyCardSkeletonGrid/);
    assert.match(discoverSource, /No rentals found/);
  });

  it("gates saving behind authentication and reflects saved state", () => {
    assert.match(discoverSource, /if \(!signedIn\)\s*{\s*onRequireAuth\(\);/s);
    assert.match(discoverSource, /savingPropertyId === propertyId \? "Saving\.\.\."/);
    assert.match(discoverSource, /isSaved \? "Saved"/);
    assert.match(discoverSource, /"Sign in to save"/);
    assert.match(discoverSource, /disabled=\{isSaved \|\| savingPropertyId === propertyId\}/);
  });

  it("keeps saved listings connected to the favorites API", () => {
    assert.match(savedSource, /fetchFavorites\(\)/);
    assert.match(savedSource, /removeFavorite\(propertyId\)/);
    assert.match(savedSource, /className="property-grid compact-grid"/);
    assert.match(savedSource, /No saved listings yet/);
    assert.match(savedSource, /<PropertyCardSkeletonGrid/);
  });

  it("keeps app navigation, auth modal, and protected views in sync", () => {
    assert.match(appSource, /const navItems = \[/);
    assert.match(appSource, /canAccessView\(currentUser\?\.role, item\.view\)/);
    assert.match(appSource, /authPanelOpen &&/);
    assert.match(appSource, /authMode === "login" \? "Sign in" : "Create account"/);
    assert.match(appSource, /loginUser\(\{ email: authForm\.email, password: authForm\.password \}\)/);
    assert.match(appSource, /registerUser\(authForm\)/);
    assert.match(appSource, /You need an owner or agency account/);
    assert.match(appSource, /Admin access is required/);
  });

  it("keeps account deletion and landing entry points available", () => {
    assert.match(accountSource, /deleteCurrentAccount\(\)/);
    assert.match(accountSource, /confirmation === "DELETE"/);
    assert.match(accountSource, /Delete my account/);
    assert.match(landingSource, /className="landing-page"/);
    assert.match(landingSource, /Start searching/);
    assert.match(landingSource, /onStart/);
  });

  it("does not keep placeholder component tests around", () => {
    assert.doesNotMatch(discoverSource, new RegExp(["Rest", "of", "your", "rendering", "logic"].join("\\s+")));
    assert.doesNotMatch(discoverSource, new RegExp(["Ensure", "this", "is", "imported"].join("\\s+")));
  });

  it("renders a role-aware dashboard summary", () => {
    assert.match(dashboardSource, /fetchDashboardSummary\(\)/);
    assert.match(dashboardSource, /summary\.notifications\.unread/);
    assert.match(dashboardSource, /summary\.tenant/);
    assert.match(dashboardSource, /summary\.owner/);
    assert.match(dashboardSource, /summary\.agency/);
    assert.match(dashboardSource, /summary\.admin/);
    assert.match(dashboardSource, /<DashboardSkeleton/);
  });

  it("adds Dashboard as the default nav item for every role", () => {
    assert.match(appSource, /view: "dashboard", label: "Dashboard"/);
    assert.match(appSource, /case "dashboard":/);
    assert.match(appSource, /getDefaultViewForRole/);
  });

  it("lets landlords open an edit action from their workspace listings", () => {
    assert.match(workspaceSource, /fetchMyProperties\(\)/);
    assert.match(workspaceSource, /onEditProperty\(property\._id\)/);
    assert.match(workspaceSource, /className="card-actions"/);
  });

  it("wires the propertyEdit view into app navigation and access control", () => {
    assert.match(appSource, /case "propertyEdit":/);
    assert.match(appSource, /canManageListings\(currentUser\?\.role\)/);
    assert.match(appSource, /getPropertyEditPath\(propertyId\)/);
    assert.match(appSource, /onEditProperty=\{\(propertyId\) => navigate\(getPropertyEditPath\(propertyId\)\)\}/);
  });

  it("renders a property edit form backed by the update API", () => {
    assert.match(propertyEditSource, /fetchPropertyById\(propertyId\)/);
    assert.match(propertyEditSource, /updateProperty\(propertyId, formToPayload\(form, property\)\)/);
    assert.match(propertyEditSource, /location\.coordinates = originalProperty\.location\.coordinates/);
    assert.match(propertyEditSource, /Save changes/);
  });
});
