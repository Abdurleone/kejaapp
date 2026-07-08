import { useEffect, useMemo, useState } from "react";
import kejaLogo from "../assets/keja-logo.png";
import LandingPage from "./pages/LandingPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DiscoverPage from "./pages/DiscoverPage.jsx";
import SavedPage from "./pages/SavedPage.jsx";
import PropertyDetailPage from "./pages/PropertyDetailPage.jsx";
import PropertyEditPage from "./pages/PropertyEditPage.jsx";
import PropertyCreatePage from "./pages/PropertyCreatePage.jsx";
import WorkspacePage from "./pages/WorkspacePage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import FeedbackPage from "./pages/FeedbackPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import PrivacyPage from "./pages/PrivacyPage.jsx";
import DeleteAccountPage from "./pages/DeleteAccountPage.jsx";
import {
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
  loginUser,
  logoutUser,
  registerUser,
  canAccessView,
  canManageListings,
} from "../app-utils.js";

const apiBaseUrl = normalizeApiBaseUrl(
  localStorage.getItem("keja_base_url") ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000",
);

const navItems = [
  { view: "dashboard", label: "Dashboard", path: getViewPath("dashboard") },
  { view: "discover", label: "Discover", path: getViewPath("discover") },
  { view: "saved", label: "Saved", path: getViewPath("saved") },
  { view: "owner", label: "Workspace", path: getViewPath("owner") },
  { view: "admin", label: "Admin", path: getViewPath("admin") },
  { view: "feedback", label: "Feedback", path: getViewPath("feedback") },
  { view: "account", label: "Account", path: getViewPath("account") },
];

function App() {
  const [colorMode, setColorMode] = useState(localStorage.getItem("keja_color_mode") || "light");
  const [path, setPath] = useState(window.location.pathname);
  const [signedIn, setSignedIn] = useState(Boolean(localStorage.getItem("keja_token")));
  const [currentUser, setCurrentUser] = useState(null);
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "tenant",
  });

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode;
    localStorage.setItem("keja_color_mode", colorMode);
  }, [colorMode]);

  const navigate = (nextPath) => {
    if (nextPath === path) return;
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  };

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      if (!signedIn) {
        setCurrentUser(null);
        return;
      }

      try {
        const user = await fetchCurrentUser();
        if (active) {
          setCurrentUser(user);

          // A restored session landing on the bare root has no meaningful
          // default (resolveViewFromPath always maps "/" to "discover"),
          // so send non-tenant roles to their own default view instead.
          if (path === "/") {
            navigate(getViewPath(getDefaultViewForRole(user.role)));
          }
        }
      } catch {
        setSignedIn(false);
        setCurrentUser(null);
        setAuthPanelOpen(false);
      }
    };

    loadUser();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on sign-in state changes, not on every path/navigate change
  }, [signedIn]);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const view = useMemo(() => resolveViewFromPath(path), [path]);
  const showSplash = shouldShowSplash({ isSignedIn: signedIn, path });

  const openAuthPanel = () => {
    setAuthMode("login");
    setAuthError("");
    setAuthForm({ name: "", email: "", password: "", phone: "", role: "tenant" });
    setAuthPanelOpen(true);
  };

  const closeAuthPanel = () => {
    setAuthPanelOpen(false);
    setAuthError("");
  };

  const handleAuthChange = (field) => (event) => {
    setAuthForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const payload = authMode === "login"
        ? await loginUser({ identifier: authForm.email, password: authForm.password })
        : await registerUser(authForm);

      setCurrentUser(payload.user);
      setSignedIn(true);
      setAuthPanelOpen(false);
      setAuthForm({ name: "", email: "", password: "", phone: "", role: "tenant" });
      navigate(getViewPath(getDefaultViewForRole(payload.user.role)));
    } catch (err) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
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

  const renderCurrentPage = () => {
    switch (view) {
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

        return <DashboardPage currentUser={currentUser} />;
      case "discover":
        return (
          <DiscoverPage
            signedIn={signedIn}
            onRequireAuth={openAuthPanel}
            currentUser={currentUser}
            onOpenProperty={(propertyId) => navigate(getPropertyDetailPath(propertyId))}
          />
        );
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
            signedIn={signedIn}
            onRequireAuth={openAuthPanel}
            onOpenProperty={(propertyId) => navigate(getPropertyDetailPath(propertyId))}
          />
        );
      case "propertyDetail":
        return (
          <PropertyDetailPage
            propertyId={getPropertyIdFromPath(path)}
            signedIn={signedIn}
            onRequireAuth={openAuthPanel}
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
            signedIn={signedIn}
            onRequireAuth={openAuthPanel}
            currentUser={currentUser}
            onEditProperty={(propertyId) => navigate(getPropertyEditPath(propertyId))}
            onCreateProperty={() => navigate(getPropertyCreatePath())}
          />
        );
      case "admin":
        if (!signedIn || !canAccessView(currentUser?.role, "admin")) {
          return (
            <div className="panel">
              <p className="muted-copy">Admin access is required to view this page.</p>
            </div>
          );
        }

        return <AdminPage signedIn={signedIn} onRequireAuth={openAuthPanel} currentUser={currentUser} />;
      case "feedback":
        if (!signedIn || !canAccessView(currentUser?.role, "feedback")) {
          return (
            <div className="panel">
              <p className="muted-copy">Sign in to view or submit feedback.</p>
            </div>
          );
        }

        return <FeedbackPage currentUser={currentUser} />;
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

        return <AccountPage currentUser={currentUser} onAccountDeleted={handleAccountDeleted} />;
      case "privacy":
        return <PrivacyPage />;
      case "deleteAccount":
        return <DeleteAccountPage />;
      default:
        return <DiscoverPage signedIn={signedIn} onRequireAuth={openAuthPanel} currentUser={currentUser} />;
    }
  };

  return (
    <div className="app-shell">
      <header className={`app-header${showSplash ? " app-header--splash" : ""}`}>
        <div className="brand-block">
          <button type="button" className="brand-mark-button" onClick={() => navigate("/")} aria-label="Go to homepage">
            <img className="brand-mark" src={kejaLogo} alt="" />
          </button>
          <div>
            <h1>KejaApp</h1>
            {!showSplash && <p>Real rental pages powered by React. API base: {apiBaseUrl}</p>}
          </div>
        </div>

        <div className="header-actions">
          <div className="mode-toggle" role="radiogroup" aria-label="Color mode">
            {["light", "dark"].map((mode) => (
              <label key={mode} className={`mode-option${colorMode === mode ? " active" : ""}`}>
                <input
                  type="radio"
                  name="colorMode"
                  value={mode}
                  checked={colorMode === mode}
                  onChange={() => setColorMode(mode)}
                  aria-label={mode === "light" ? "Light mode" : "Dark mode"}
                />
                <span aria-hidden="true">{mode === "light" ? "☀" : "☾"}</span>
              </label>
            ))}
          </div>
          {signedIn ? (
            <>
              <span className="user-pill">{currentUser?.name || currentUser?.email || "Signed in"}</span>
              <button className="text-button" type="button" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <button className="primary-button" type="button" onClick={openAuthPanel}>
              Sign in
            </button>
          )}
        </div>
      </header>

      <main>
        {showSplash ? (
          <LandingPage onStart={() => navigate(getViewPath("discover"))} />
        ) : (
          <div className="workspace">
            <div className="tabs" role="tablist" aria-label="Main navigation">
              {navigationItems.map((item) => (
                <button
                  key={item.view}
                  type="button"
                  className={`tab ${view === item.view ? "active" : ""}`}
                  onClick={() => navigate(item.path)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="view-content">{renderCurrentPage()}</div>
            <footer className="legal-footer">
              <button className="text-button" type="button" onClick={() => navigate(getViewPath("privacy"))}>
                Privacy
              </button>
              <button className="text-button" type="button" onClick={() => navigate(getViewPath("deleteAccount"))}>
                Delete account
              </button>
            </footer>
          </div>
        )}
        {authPanelOpen && (
          <div className="auth-panel-overlay">
            <div className="auth-panel">
              <div className="auth-panel-header">
                <h2>{authMode === "login" ? "Sign in" : "Create account"}</h2>
                <button className="text-button" type="button" onClick={closeAuthPanel}>
                  Close
                </button>
              </div>
              <div className="auth-panel-tabs">
                <button
                  type="button"
                  className={authMode === "login" ? "active" : "secondary-button"}
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={authMode === "register" ? "active" : "secondary-button"}
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError("");
                  }}
                >
                  Register
                </button>
              </div>
              <form className="auth-panel-form" onSubmit={handleAuthSubmit}>
                {authMode === "register" && (
                  <>
                    <label>
                      Name
                      <input type="text" value={authForm.name} onChange={handleAuthChange("name")} required />
                    </label>
                    <label>
                      Phone
                      <input type="tel" value={authForm.phone} onChange={handleAuthChange("phone")} />
                    </label>
                    <label>
                      Role
                      <select value={authForm.role} onChange={handleAuthChange("role")}>
                        <option value="tenant">Tenant</option>
                        <option value="landlord">Landlord</option>
                        <option value="agency">Agency</option>
                      </select>
                    </label>
                  </>
                )}
                <label>
                  {authMode === "login" ? "Email or username" : "Email"}
                  <input
                    type={authMode === "login" ? "text" : "email"}
                    value={authForm.email}
                    onChange={handleAuthChange("email")}
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={handleAuthChange("password")}
                    required
                  />
                </label>
                {authError && <p className="error-text">{authError}</p>}
                <div className="form-actions">
                  <button className="primary-button" type="submit" disabled={authLoading}>
                    {authLoading ? "Working..." : authMode === "login" ? "Sign in" : "Register"}
                  </button>
                  <button className="secondary-button" type="button" onClick={closeAuthPanel}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
