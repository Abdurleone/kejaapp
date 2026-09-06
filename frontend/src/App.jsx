import { useEffect, useMemo, useRef, useState } from "react";
import kejaLogo from "../assets/keja-logo.png";
import AuthModal from "./components/AuthModal.jsx";
import UserMenu from "./components/UserMenu.jsx";
import NotificationBadge from "./components/NotificationBadge.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DiscoverPage from "./pages/DiscoverPage.jsx";
import SavedPage from "./pages/SavedPage.jsx";
import PropertyDetailPage from "./pages/PropertyDetailPage.jsx";
import PropertyEditPage from "./pages/PropertyEditPage.jsx";
import PropertyCreatePage from "./pages/PropertyCreatePage.jsx";
import WorkspacePage from "./pages/WorkspacePage.jsx";
import MoversPage from "./pages/MoversPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import FeedbackPage from "./pages/FeedbackPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import TermsPage from "./pages/TermsPage.jsx";
import DataProtectionPage from "./pages/DataProtectionPage.jsx";
import DeleteAccountPage from "./pages/DeleteAccountPage.jsx";
import SelectRolePage from "./pages/SelectRolePage.jsx";
import SupportPage from "./pages/SupportPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import {
  defaultApiBaseUrl,
  normalizeApiBaseUrl,
  resolveViewFromPath,
  getPropertyIdFromPath,
  getPropertyDetailPath,
  getPropertyEditPath,
  getPropertyEditIdFromPath,
  getPropertyCreatePath,
  shouldShowSplash,
  getViewPath,
  getDefaultViewForRole,
  fetchCurrentUser,
  logoutUser,
  canAccessView,
  canManageListings,
  canOpenPropertyDetails,
  canSearchListings,
} from "../app-utils.js";

const apiBaseUrl = normalizeApiBaseUrl(localStorage.getItem("keja_base_url") || defaultApiBaseUrl);

const navItems = [
  { view: "dashboard", label: "Dashboard", path: getViewPath("dashboard") },
  { view: "discover", label: "Discover", path: getViewPath("discover") },
  { view: "saved", label: "Saved", path: getViewPath("saved") },
  { view: "owner", label: "Workspace", path: getViewPath("owner") },
  { view: "movers", label: "Movers", path: getViewPath("movers") },
  { view: "admin", label: "Admin", path: getViewPath("admin") },
  { view: "notifications", label: "Notifications", path: getViewPath("notifications") },
  { view: "feedback", label: "Feedback", path: getViewPath("feedback") },
  { view: "account", label: "Account", path: getViewPath("account") },
];

const defaultMeta = {
  title: "KejaApp",
  description:
    "Find verified rentals, message landlords and agencies, and arrange moving services in Kenya - all from one KejaApp workspace.",
};

// The 6 routes crawlers/sitemap.xml actually point at (public, not behind
// sign-in) also carry these as their real <meta name="description">/
// canonical values (see the useEffect below) - everything else only ever
// updates document.title, since no search engine or social unfurler is
// sent to an authenticated page.
const metaByView = {
  discover: {
    title: "Discover Homes | KejaApp",
    description: "Browse verified rental listings across Kenya - no account required to search.",
  },
  movers: {
    title: "Movers | KejaApp",
    description: "Find moving-service providers to help with your next move.",
  },
  privacy: { title: "Privacy Policy | KejaApp", description: "How KejaApp collects, uses, and protects your data." },
  dataProtection: {
    title: "Data Protection | KejaApp",
    description: "KejaApp's data protection rights and how to exercise them.",
  },
  terms: { title: "Terms of Service | KejaApp", description: "The terms governing use of KejaApp." },
  dashboard: { title: "Dashboard | KejaApp" },
  saved: { title: "Saved Homes | KejaApp" },
  propertyDetail: { title: "Property Details | KejaApp" },
  propertyEdit: { title: "Edit Listing | KejaApp" },
  propertyCreate: { title: "New Listing | KejaApp" },
  owner: { title: "Workspace | KejaApp" },
  admin: { title: "Admin | KejaApp" },
  notifications: { title: "Notifications | KejaApp" },
  feedback: { title: "Feedback | KejaApp" },
  account: { title: "Account | KejaApp" },
  selectRole: { title: "Choose Your Role | KejaApp" },
  deleteAccount: { title: "Delete Account | KejaApp" },
  support: { title: "Support KejaApp" },
  notFound: { title: "Page Not Found | KejaApp" },
};

function App() {
  const [colorMode, setColorMode] = useState(() => localStorage.getItem("keja_color_mode") || "system");
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [path, setPath] = useState(window.location.pathname);
  // The auth session now lives entirely in an httpOnly cookie (not readable
  // by JS), so there's no client-side value to guess this from anymore -
  // the session-restore effect below always asks the server via
  // fetchCurrentUser() instead, and updates this once that resolves.
  const [signedIn, setSignedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [highlightRequestId, setHighlightRequestId] = useState(null);
  const tabRefs = useRef(new Map());

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => setSystemPrefersDark(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const resolvedColorMode = colorMode === "system" ? (systemPrefersDark ? "dark" : "light") : colorMode;

  useEffect(() => {
    document.documentElement.dataset.colorMode = resolvedColorMode;
    localStorage.setItem("keja_color_mode", colorMode);
  }, [colorMode, resolvedColorMode]);

  const navigate = (nextPath) => {
    if (nextPath === path) return;
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  };

  const navigateToRequest = ({ view, highlightId }) => {
    setHighlightRequestId(highlightId);
    navigate(getViewPath(view));
  };

  // Roving-tabindex arrow-key navigation for the main nav's ARIA tablist -
  // matches its existing click behavior (moving to a tab immediately
  // navigates there) rather than a separate focus-then-activate step.
  const handleTabKeyDown = (event, items, index) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const lastIndex = items.length - 1;
    let nextIndex = index;

    if (event.key === "ArrowLeft") nextIndex = index === 0 ? lastIndex : index - 1;
    else if (event.key === "ArrowRight") nextIndex = index === lastIndex ? 0 : index + 1;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = lastIndex;

    const nextItem = items[nextIndex];
    navigate(nextItem.path);
    tabRefs.current.get(nextItem.view)?.focus();
  };

  useEffect(() => {
    let active = true;

    // With the session living entirely in an httpOnly cookie, there's no
    // client-side value to check before deciding whether to bother asking -
    // just ask once, on mount, and let the 401 (if any) answer it. Explicit
    // sign-in/out (handleAuthenticated/handleLogout/handleAccountDeleted)
    // already set signedIn/currentUser directly at their own call sites, so
    // this doesn't need to re-run when those fire.
    const loadUser = async () => {
      try {
        const user = await fetchCurrentUser();
        if (active) {
          setSignedIn(true);
          setCurrentUser(user);

          // A restored session landing on the bare root has no meaningful
          // default (resolveViewFromPath always maps "/" to "discover"),
          // so send non-tenant roles to their own default view instead -
          // unless their role isn't confirmed yet (first sign-in after
          // Google Sign-In), which takes priority over any default view.
          if (path === "/") {
            navigate(
              getViewPath(user.roleConfirmed === false ? "selectRole" : getDefaultViewForRole(user.role))
            );
          }
        }
      } catch {
        if (active) {
          setSignedIn(false);
          setCurrentUser(null);
          setAuthPanelOpen(false);
        }
      }
    };

    loadUser();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once on mount only, see comment above
  }, []);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const view = useMemo(() => resolveViewFromPath(path), [path]);
  // Forces the role-picker regardless of whatever path was requested - a
  // fresh Google signup has no role yet, so nothing else should render
  // until this is resolved. Doesn't touch `path`/the URL bar itself; the
  // navigate() calls below additionally route here so the URL agrees with
  // what's on screen.
  const effectiveView = currentUser?.roleConfirmed === false ? "selectRole" : view;
  const showSplash = shouldShowSplash({ isSignedIn: signedIn, path });

  // Real browser tabs and JS-executing crawlers (Googlebot) see this;
  // non-JS social unfurlers only ever see index.html's static defaults,
  // since this app has no SSR - see CHANGELOG.md's SEO-basics entry.
  useEffect(() => {
    const meta = metaByView[effectiveView] || defaultMeta;
    document.title = meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", meta.description || defaultMeta.description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = `https://kejaapp-backend-7iu3.onrender.com${path}`;
  }, [effectiveView, path]);

  const openAuthPanel = () => setAuthPanelOpen(true);

  const closeAuthPanel = () => setAuthPanelOpen(false);

  const handleAuthenticated = (user) => {
    setCurrentUser(user);
    setSignedIn(true);
    setAuthPanelOpen(false);
    navigate(
      getViewPath(user.roleConfirmed === false ? "selectRole" : getDefaultViewForRole(user.role))
    );
  };

  const handleRoleConfirmed = (user) => {
    setCurrentUser(user);
    navigate(getViewPath(getDefaultViewForRole(user.role)));
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore failure and clear local auth state anyway.
    }

    setSignedIn(false);
    setCurrentUser(null);
    setAuthPanelOpen(false);
    navigate(getViewPath("discover"));
  };

  const handleAccountDeleted = () => {
    setSignedIn(false);
    setCurrentUser(null);
    setAuthPanelOpen(false);
    navigate(getViewPath("deleteAccount"));
  };

  const navigationItems = navItems.filter((item) => canAccessView(currentUser?.role, item.view));
  // Sub-views reached from a tab (propertyDetail, propertyEdit, privacy,
  // terms, deleteAccount) have no tab of their own showing as selected -
  // leave the panel unlabelled rather than pointing aria-labelledby at a
  // tab id that doesn't exist for those.
  const activeTabId = navigationItems.some((item) => item.view === effectiveView)
    ? `tab-${effectiveView}`
    : undefined;

  const renderCurrentPage = () => {
    switch (effectiveView) {
      case "dashboard":
        if (!signedIn) {
          return (
            <div className="panel">
              <p className="muted-copy">Sign in to see your dashboard.</p>
              <button className="primary-button" type="button" onClick={openAuthPanel}>
                Sign in
              </button>
            </div>
          );
        }

        return <DashboardPage />;
      case "discover":
        if (!canSearchListings(currentUser?.role)) {
          return (
            <div className="panel">
              <p className="muted-copy">
                Browsing available listings is for tenants only. Landlords and agencies manage their own
                listings from the Workspace tab, and movers work from the Movers tab.
              </p>
            </div>
          );
        }

        return <DiscoverPage onOpenProperty={(propertyId) => navigate(getPropertyDetailPath(propertyId))} />;
      case "saved":
        if (!signedIn) {
          return (
            <div className="panel">
              <p className="muted-copy">Sign in to see your saved rentals and manage favorites.</p>
              <button className="primary-button" type="button" onClick={openAuthPanel}>
                Sign in
              </button>
            </div>
          );
        }

        return (
          <SavedPage
            onOpenProperty={(propertyId) => navigate(getPropertyDetailPath(propertyId))}
            onBrowse={() => navigate(getViewPath("discover"))}
          />
        );
      case "propertyDetail":
        if (!canOpenPropertyDetails(currentUser?.role)) {
          return (
            <div className="panel">
              <p className="muted-copy">
                {currentUser?.role === "mover"
                  ? "As a transportation facilitator, you work from service requests and notifications, not individual property listings."
                  : "Sign in to view full property details and contact the owner."}
              </p>
              {!currentUser && (
                <button className="primary-button" type="button" onClick={openAuthPanel}>
                  Sign in
                </button>
              )}
            </div>
          );
        }

        return (
          <PropertyDetailPage
            propertyId={getPropertyIdFromPath(path)}
            apiBaseUrl={apiBaseUrl}
            onBack={() => navigate(getViewPath("discover"))}
          />
        );
      case "propertyEdit":
        if (!signedIn || !canManageListings(currentUser?.role)) {
          return (
            <div className="panel">
              <p className="muted-copy">You need an owner or agency account to edit listings.</p>
            </div>
          );
        }

        return (
          <PropertyEditPage
            propertyId={getPropertyEditIdFromPath(path)}
            apiBaseUrl={apiBaseUrl}
            onBack={() => navigate(getViewPath("owner"))}
          />
        );
      case "propertyCreate":
        if (!signedIn || !canManageListings(currentUser?.role)) {
          return (
            <div className="panel">
              <p className="muted-copy">You need an owner or agency account to create listings.</p>
            </div>
          );
        }

        return (
          <PropertyCreatePage
            onBack={() => navigate(getViewPath("owner"))}
            onCreated={(created) => navigate(getPropertyEditPath(created._id))}
          />
        );
      case "owner":
        if (!signedIn || !canAccessView(currentUser?.role, "owner")) {
          return (
            <div className="panel">
              <p className="muted-copy">You need an owner or agency account to use the workspace.</p>
            </div>
          );
        }

        return (
          <WorkspacePage
            onEditProperty={(propertyId) => navigate(getPropertyEditPath(propertyId))}
            onCreateProperty={() => navigate(getPropertyCreatePath())}
            highlightId={highlightRequestId}
          />
        );
      case "movers":
        return <MoversPage highlightId={highlightRequestId} />;
      case "admin":
        if (!signedIn || !canAccessView(currentUser?.role, "admin")) {
          return (
            <div className="panel">
              <p className="muted-copy">Admin access is required to view this page.</p>
            </div>
          );
        }

        return <AdminPage />;
      case "notifications":
        if (!signedIn || !canAccessView(currentUser?.role, "notifications")) {
          return (
            <div className="panel">
              <p className="muted-copy">Sign in to view your notifications.</p>
              <button className="primary-button" type="button" onClick={openAuthPanel}>
                Sign in
              </button>
            </div>
          );
        }

        return <NotificationsPage currentUser={currentUser} onNavigateToRequest={navigateToRequest} />;
      case "feedback":
        if (!signedIn || !canAccessView(currentUser?.role, "feedback")) {
          return (
            <div className="panel">
              <p className="muted-copy">Sign in to view or submit feedback.</p>
            </div>
          );
        }

        return <FeedbackPage />;
      case "account":
        if (!signedIn) {
          return (
            <div className="panel">
              <p className="muted-copy">Sign in to manage or delete your account.</p>
              <button className="primary-button" type="button" onClick={openAuthPanel}>
                Sign in
              </button>
            </div>
          );
        }

        return (
          <AccountPage
            onAccountDeleted={handleAccountDeleted}
            onBrowse={() => navigate(getViewPath("discover"))}
          />
        );
      case "selectRole":
        if (!signedIn) {
          return (
            <div className="panel">
              <p className="muted-copy">Sign in to continue.</p>
            </div>
          );
        }

        return <SelectRolePage onRoleConfirmed={handleRoleConfirmed} />;
      case "privacy":
      case "dataProtection":
        // Kenya's Data Protection Act treats privacy and data protection as
        // the same subject - one page/PDF covers both rather than keeping
        // two documents in sync with each other.
        return <DataProtectionPage />;
      case "terms":
        return <TermsPage />;
      case "deleteAccount":
        return <DeleteAccountPage />;
      case "support":
        if (!signedIn) {
          return (
            <div className="panel">
              <p className="muted-copy">Sign in to continue.</p>
            </div>
          );
        }

        return <SupportPage />;
      case "notFound":
        return <NotFoundPage onBrowse={() => navigate(getViewPath("discover"))} />;
      default:
        return <DiscoverPage />;
    }
  };

  return (
    <AuthProvider
      signedIn={signedIn}
      currentUser={currentUser}
      openAuthPanel={openAuthPanel}
      setCurrentUser={setCurrentUser}
    >
      <div className="app-shell">
        <header className={`app-header${showSplash ? " app-header--splash" : ""}`}>
          <div className="brand-block">
            <button type="button" className="brand-mark-button" onClick={() => navigate("/")} aria-label="Go to homepage">
              <img className="brand-mark" src={kejaLogo} alt="" />
            </button>
            <div>
              <h1>
                Keja<span className="brand-word-accent">App</span>
              </h1>
              {!showSplash && <p>Real rental pages powered by React.</p>}
            </div>
          </div>

          <div className="header-actions">
            <div className="mode-toggle" role="radiogroup" aria-label="Color mode">
              {["system", "light", "dark"].map((mode) => (
                <label key={mode} className={`mode-option${colorMode === mode ? " active" : ""}`}>
                  <input
                    type="radio"
                    name="colorMode"
                    value={mode}
                    checked={colorMode === mode}
                    onChange={() => setColorMode(mode)}
                    aria-label={mode === "system" ? "Match system" : mode === "light" ? "Light mode" : "Dark mode"}
                  />
                  <span aria-hidden="true">{mode === "system" ? "◐" : mode === "light" ? "☀" : "☾"}</span>
                </label>
              ))}
            </div>
            {signedIn ? (
              <UserMenu
                label={currentUser?.name || currentUser?.email || "Signed in"}
                onSignOut={handleLogout}
              />
            ) : (
              <button className="primary-button" type="button" onClick={openAuthPanel}>
                Sign in
              </button>
            )}
          </div>
        </header>

        <main>
          {showSplash ? (
            <LandingPage
              onStart={() => navigate(getViewPath("discover"))}
              onNavigateLegal={(view) => navigate(getViewPath(view))}
            />
          ) : (
            <div className="workspace">
              <div className="tabs" role="tablist" aria-label="Main navigation">
                {navigationItems.map((item, index) => {
                  const isSelected = effectiveView === item.view;

                  return (
                    <button
                      key={item.view}
                      ref={(el) => {
                        if (el) tabRefs.current.set(item.view, el);
                        else tabRefs.current.delete(item.view);
                      }}
                      id={`tab-${item.view}`}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      aria-controls="view-content-panel"
                      tabIndex={isSelected ? 0 : -1}
                      className={`tab ${isSelected ? "active" : ""}`}
                      onClick={() => navigate(item.path)}
                      onKeyDown={(event) => handleTabKeyDown(event, navigationItems, index)}
                    >
                      {item.view === "notifications" ? (
                        <>
                          <svg
                            className="tab-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
                            <path d="M10 19a2 2 0 0 0 4 0" />
                          </svg>{" "}
                          {item.label}
                          <NotificationBadge view={effectiveView} />
                        </>
                      ) : (
                        item.label
                      )}
                    </button>
                  );
                })}
              </div>
              <div
                className="view-content"
                id="view-content-panel"
                role="tabpanel"
                aria-labelledby={activeTabId}
              >
                {renderCurrentPage()}
              </div>
              <footer className="legal-footer">
                <button className="text-button" type="button" onClick={() => navigate(getViewPath("privacy"))}>
                  Privacy
                </button>
                <button className="text-button" type="button" onClick={() => navigate(getViewPath("terms"))}>
                  Terms
                </button>
                <button className="text-button" type="button" onClick={() => navigate(getViewPath("support"))}>
                  Support KejaApp
                </button>
                <button className="text-button" type="button" onClick={() => navigate(getViewPath("deleteAccount"))}>
                  Delete account
                </button>
                <span className="muted-copy footer-copyright">© {new Date().getFullYear()} KejaApp</span>
              </footer>
            </div>
          )}
          {authPanelOpen && <AuthModal onClose={closeAuthPanel} onAuthenticated={handleAuthenticated} />}
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
