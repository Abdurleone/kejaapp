import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const readSource = (relativePath) => readFile(new URL(`../src/${relativePath}`, import.meta.url), "utf8");

const appSource = await readSource("App.jsx");
const discoverSource = await readSource("pages/DiscoverPage.jsx");
const savedSource = await readSource("pages/SavedPage.jsx");
const accountSource = await readSource("pages/AccountPage.jsx");
const landingSource = await readSource("pages/LandingPage.jsx");

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
    assert.match(discoverSource, /Loading rentals/);
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
    assert.match(savedSource, /Loading saved listings/);
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
});
