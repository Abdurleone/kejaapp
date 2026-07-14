import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const readSource = (relativePath) => readFile(new URL(`../src/${relativePath}`, import.meta.url), "utf8");

const appSource = await readSource("App.jsx");
const discoverSource = await readSource("pages/DiscoverPage.jsx");
const landingSource = await readSource("pages/LandingPage.jsx");
const notificationsSource = await readSource("pages/NotificationsPage.jsx");
const propertyEditSource = await readSource("pages/PropertyEditPage.jsx");
const propertyCreateSource = await readSource("pages/PropertyCreatePage.jsx");
const propertyFormSource = await readSource("components/PropertyForm.jsx");

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
    assert.match(discoverSource, /params\.radiusKm\s*=\s*appliedFilters\.radiusKm/);
    assert.match(discoverSource, /Radius/);
    assert.match(discoverSource, /Near me/);
    assert.match(discoverSource, /Clear location/);
    assert.match(discoverSource, /<PropertyCardSkeletonGrid/);
    assert.match(discoverSource, /No rentals found/);
  });

  // Auth-gated saving, the Saving.../Saved/disabled states, and the
  // signed-out "Sign in to save" label are now covered by real render +
  // interaction tests in discover-page.render.test.jsx, which click the
  // actual buttons and assert on saveFavorite/onRequireAuth being called -
  // not just that these strings exist somewhere in the source.

  // SavedPage's fetch/error/retry/remove behavior is now covered by real
  // render + interaction tests in saved-page.render.test.jsx.

  it("keeps app navigation and protected views in sync", () => {
    assert.match(appSource, /const navItems = \[/);
    assert.match(appSource, /canAccessView\(currentUser\?\.role, item\.view\)/);
    assert.match(appSource, /authPanelOpen && <AuthModal/);
    assert.match(appSource, /You need an owner or agency account/);
    assert.match(appSource, /Admin access is required/);
  });

  // The auth modal itself (sign-in/register mode switching, username-
  // suggestion-on-conflict, submit wiring to loginUser/registerUser) was
  // extracted out of App.jsx into components/AuthModal.jsx and is covered
  // by real render + interaction tests in auth-modal.render.test.jsx -
  // which click the actual tabs/buttons and assert on loginUser/registerUser
  // being called, not just that these strings exist somewhere in the source.

  it("wires the Feedback tab into navigation and view routing", () => {
    assert.match(appSource, /view: "feedback", label: "Feedback"/);
    assert.match(appSource, /case "feedback":/);
    assert.match(appSource, /canAccessView\(currentUser\?\.role, "feedback"\)/);
    assert.match(appSource, /<FeedbackPage \/>/);
  });

  it("wires the Notifications tab into navigation and view routing", () => {
    assert.match(appSource, /view: "notifications", label: "Notifications"/);
    assert.match(appSource, /case "notifications":/);
    assert.match(appSource, /canAccessView\(currentUser\?\.role, "notifications"\)/);
    assert.match(appSource, /<NotificationsPage \/>/);
  });

  it("lists notifications, filters unread, and marks them read", () => {
    assert.match(notificationsSource, /fetchNotifications\(unreadOnly \? \{ unread: "true" \} : \{\}\)/);
    assert.match(notificationsSource, /markNotificationAsRead\(notificationId\)/);
    assert.match(notificationsSource, /className="property-grid compact-grid"/);
    assert.match(notificationsSource, /!item\.isRead/);
  });

  // FeedbackPage's submit/list flow (submitter view) and list/respond flow
  // (admin view) are now covered by real render + interaction tests in
  // feedback-page.render.test.jsx.

  it("lets a signed-in tenant save the current Discover search", () => {
    assert.match(discoverSource, /const payload = \{ lat: coords\.lat, lng: coords\.lng, radiusKm: radius \}/);
    assert.match(discoverSource, /await createSavedSearch\(payload\)/);
    assert.match(discoverSource, /"Save this search"/);
  });

  it("lets Discover filter by type, bedrooms, and rent range", () => {
    assert.match(discoverSource, /if \(appliedFilters\.type\) params\.type = appliedFilters\.type/);
    assert.match(discoverSource, /if \(appliedFilters\.bedrooms\) params\.bedrooms = appliedFilters\.bedrooms/);
    assert.match(discoverSource, /if \(appliedFilters\.minRent\) params\.minRent = appliedFilters\.minRent/);
    assert.match(discoverSource, /if \(appliedFilters\.maxRent\) params\.maxRent = appliedFilters\.maxRent/);
    assert.match(discoverSource, /if \(type\) payload\.type = type/);
    assert.match(discoverSource, /if \(bedrooms\) payload\.bedrooms = Number\(bedrooms\)/);
    assert.match(discoverSource, /if \(minRent\) payload\.minRent = Number\(minRent\)/);
    assert.match(discoverSource, /if \(maxRent\) payload\.maxRent = Number\(maxRent\)/);
  });

  // AccountPage's saved-searches list/remove and account-deletion flows are
  // now covered by real render + interaction tests in
  // account-page.render.test.jsx.

  it("keeps landing entry points available", () => {
    assert.match(landingSource, /className="landing-page"/);
    assert.match(landingSource, /Start searching/);
    assert.match(landingSource, /onStart/);
  });

  it("shows public testimonials on the landing page once available", () => {
    assert.match(landingSource, /fetchPublicTestimonials\(\)/);
    assert.match(landingSource, /className="landing-testimonials"/);
    assert.match(landingSource, /testimonials\.length > 0/);
  });

  it("does not keep placeholder component tests around", () => {
    assert.doesNotMatch(discoverSource, new RegExp(["Rest", "of", "your", "rendering", "logic"].join("\\s+")));
    assert.doesNotMatch(discoverSource, new RegExp(["Ensure", "this", "is", "imported"].join("\\s+")));
  });

  // DashboardPage's role-aware summary rendering (tenant/owner/agency/mover/
  // admin sections, plus the error/retry state) is now covered by real
  // render tests in dashboard-page.render.test.jsx.

  it("adds Dashboard as the default nav item for every role", () => {
    assert.match(appSource, /view: "dashboard", label: "Dashboard"/);
    assert.match(appSource, /case "dashboard":/);
    assert.match(appSource, /getDefaultViewForRole/);
  });

  // WorkspacePage's listings/inquiries fetch, edit action, retry, and
  // inquiry-response behavior are now covered by real render + interaction
  // tests in workspace-page.render.test.jsx.

  it("wires the propertyEdit view into app navigation and access control", () => {
    assert.match(appSource, /case "propertyEdit":/);
    assert.match(appSource, /canManageListings\(currentUser\?\.role\)/);
    assert.match(appSource, /getPropertyEditPath\(propertyId\)/);
    assert.match(appSource, /onEditProperty=\{\(propertyId\) => navigate\(getPropertyEditPath\(propertyId\)\)\}/);
  });

  it("renders a property edit form backed by the update API", () => {
    assert.match(propertyEditSource, /fetchPropertyById\(propertyId\)/);
    assert.match(propertyEditSource, /updateProperty\(propertyId, formToPropertyPayload\(form, property\)\)/);
    assert.match(propertyEditSource, /submitLabel="Save changes"/);
  });

  it("shares the property form between create and edit, preserving geo data on edit", () => {
    assert.match(propertyFormSource, /location\.coordinates = originalProperty\.location\.coordinates/);
    assert.match(propertyFormSource, /export default function PropertyForm/);
  });

  it("lets landlords create a new listing via the shared form", () => {
    assert.match(propertyCreateSource, /createProperty\(formToPropertyPayload\(form\)\)/);
    assert.match(propertyCreateSource, /emptyPropertyForm/);
    assert.match(propertyCreateSource, /submitLabel="Create listing"/);
  });

  it("wires the propertyCreate view into app navigation, workspace, and access control", () => {
    assert.match(appSource, /case "propertyCreate":/);
    assert.match(appSource, /You need an owner or agency account to create listings\./);
    assert.match(appSource, /onCreated=\{\(created\) => navigate\(getPropertyEditPath\(created\._id\)\)\}/);
  });
});
