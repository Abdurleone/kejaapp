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
const feedbackSource = await readSource("pages/FeedbackPage.jsx");
const notificationsSource = await readSource("pages/NotificationsPage.jsx");
const workspaceSource = await readSource("pages/WorkspacePage.jsx");
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
    assert.match(appSource, /loginUser\(\{ identifier: authForm\.email, password: authForm\.password \}\)/);
    assert.match(appSource, /registerUser\(authForm\)/);
    assert.match(appSource, /You need an owner or agency account/);
    assert.match(appSource, /Admin access is required/);
  });

  it("lets a registering user pick their own username and apply a suggestion on conflict", () => {
    assert.match(appSource, /value={authForm\.username}/);
    assert.match(appSource, /setUsernameSuggestions\(err\.suggestions \|\| \[\]\)/);
    assert.match(appSource, /usernameSuggestions\.map\(\(suggestion\) =>/);
    assert.match(appSource, /applyUsernameSuggestion/);
  });

  it("wires the Feedback tab into navigation and view routing", () => {
    assert.match(appSource, /view: "feedback", label: "Feedback"/);
    assert.match(appSource, /case "feedback":/);
    assert.match(appSource, /canAccessView\(currentUser\?\.role, "feedback"\)/);
    assert.match(appSource, /<FeedbackPage currentUser=\{currentUser\}/);
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

  it("submits feedback and lists the current user's own submissions", () => {
    assert.match(feedbackSource, /fetchMyFeedback\(\)/);
    assert.match(feedbackSource, /createFeedback\(\{ message \}\)/);
    assert.match(feedbackSource, /className="property-grid compact-grid"/);
    assert.match(feedbackSource, /className="auth-panel-form"/);
    assert.match(feedbackSource, /statusTone\(item\.status\)/);
    assert.match(feedbackSource, /item\.response\?\.message/);
  });

  it("lets admins list all feedback and respond to it", () => {
    assert.match(feedbackSource, /fetchAdminFeedback\(\)/);
    assert.match(feedbackSource, /respondToFeedback\(feedbackId, \{ message: responseMessage \}\)/);
    assert.match(feedbackSource, /currentUser\?\.role === "admin"/);
    assert.match(feedbackSource, /"Send response"/);
  });

  it("lets a signed-in tenant save the current Discover search", () => {
    assert.match(discoverSource, /createSavedSearch\(\{ lat: coords\.lat, lng: coords\.lng, radiusKm: radius \}\)/);
    assert.match(discoverSource, /"Save this search"/);
  });

  it("lists and removes saved searches on the Account page", () => {
    assert.match(accountSource, /fetchSavedSearches\(\)/);
    assert.match(accountSource, /deleteSavedSearch\(savedSearchId\)/);
    assert.match(accountSource, /currentUser\?\.role === "tenant"/);
  });

  it("keeps account deletion and landing entry points available", () => {
    assert.match(accountSource, /deleteCurrentAccount\(\)/);
    assert.match(accountSource, /confirmation === "DELETE"/);
    assert.match(accountSource, /Delete my account/);
    assert.match(accountSource, /currentUser\?\.username \|\| "Not set"/);
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

  it("renders a role-aware dashboard summary", () => {
    assert.match(dashboardSource, /fetchDashboardSummary\(\)/);
    assert.match(dashboardSource, /summary\.notifications\.unread/);
    assert.match(dashboardSource, /summary\.tenant/);
    assert.match(dashboardSource, /summary\.owner/);
    assert.match(dashboardSource, /summary\.agency/);
    assert.match(dashboardSource, /summary\.admin/);
    assert.match(dashboardSource, /summary\.admin\.feedback/);
    assert.match(dashboardSource, /<DashboardSkeleton/);
  });

  it("adds Dashboard as the default nav item for every role", () => {
    assert.match(appSource, /view: "dashboard", label: "Dashboard"/);
    assert.match(appSource, /case "dashboard":/);
    assert.match(appSource, /getDefaultViewForRole/);
  });

  it("lets landlords open an edit action from their workspace listings", () => {
    assert.match(workspaceSource, /fetchMyProperties\(\{ page: propertiesPage \}\)/);
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
    assert.match(workspaceSource, /onClick=\{onCreateProperty\}/);
    assert.match(workspaceSource, /New listing/);
  });
});
