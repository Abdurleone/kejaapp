import { useEffect, useMemo, useState } from "react";
import LandingPage from "./pages/LandingPage.jsx";
import DiscoverPage from "./pages/DiscoverPage.jsx";
import SavedPage from "./pages/SavedPage.jsx";
import WorkspacePage from "./pages/WorkspacePage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import PrivacyPage from "./pages/PrivacyPage.jsx";
import DeleteAccountPage from "./pages/DeleteAccountPage.jsx";
import {
  normalizeApiBaseUrl,
  resolveViewFromPath,
  shouldShowSplash,
  nextColorMode,
  nextTheme,
  getViewPath,
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  canAccessView,
} from "../app-utils.js";

const apiBaseUrl = normalizeApiBaseUrl(
  localStorage.getItem("keja_base_url") || "http://localhost:5000",
);

const navItems = [
  { view: "discover", label: "Discover", path: getViewPath("discover") },
  { view: "saved", label: "Saved", path: getViewPath("saved") },
  { view: "owner", label: "Workspace", path: getViewPath("owner") },
  { view: "admin", label: "Admin", path: getViewPath("admin") },
  { view: "account", label: "Account", path: getViewPath("account") },
];

function App() {
  const [theme, setTheme] = useState(localStorage.getItem("keja_theme") || "default");
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
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.colorMode = colorMode;
    localStorage.setItem("keja_theme", theme);
    localStorage.setItem("keja_color_mode", colorMode);
  }, [theme, colorMode]);

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
        }
      } catch (err) {
        setSignedIn(false);
        setCurrentUser(null);
        setAuthPanelOpen(false);
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, [signedIn]);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const view = useMemo(() => resolveViewFromPath(path), [path]);
  const showSplash = shouldShowSplash({ isSignedIn: signedIn, path });

  const navigate = (nextPath) => {
    if (nextPath === path) return;
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  };

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
        ? await loginUser({ email: authForm.email, password: authForm.password })
        : await registerUser(authForm);

      setCurrentUser(payload.user);
      setSignedIn(true);
      setAuthPanelOpen(false);
      setAuthForm({ name: "", email: "", password: "", phone: "", role: "tenant" });
    } catch (err) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
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
      case "discover":
        return <DiscoverPage signedIn={signedIn} onRequireAuth={openAuthPanel} currentUser={currentUser} />;
      case "saved":
        if (!signedIn) {
          return (
            <div className="panel">
              <p className="muted-copy">Sign in to see your saved rentals and manage favorites.</p>
            </div>
          );
        }

        return <SavedPage signedIn={signedIn} onRequireAuth={openAuthPanel} />;
      case "owner":
        if (!signedIn || !canAccessView(currentUser?.role, "owner")) {
          return (
            <div className="panel">
              <p className="muted-copy">You need an owner or agency account to use the workspace.</p>
            </div>
          );
        }

        return <WorkspacePage signedIn={signedIn} onRequireAuth={openAuthPanel} currentUser={currentUser} />;
      case "admin":
        if (!signedIn || !canAccessView(currentUser?.role, "admin")) {
          return (
            <div className="panel">
              <p className="muted-copy">Admin access is required to view this page.</p>
            </div>
          );
        }

        return <AdminPage signedIn={signedIn} onRequireAuth={openAuthPanel} currentUser={currentUser} />;
      case "account":
        if (!signedIn) {
          return (
            <div className="panel">
              <p className="muted-copy">Sign in to manage or delete your account.</p>
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
          <span className="brand-mark" aria-label="KejaApp logo">
            <span>K</span>
          </span>
          <div>
            <h1>KejaApp</h1>
            {!showSplash && <p>Real rental pages powered by React. API base: {apiBaseUrl}</p>}
          </div>
        </div>

        <div className="header-actions">
          <button className="text-button" type="button" onClick={() => setTheme(nextTheme(theme))}>
            Theme
          </button>
          <button className="text-button" type="button" onClick={() => setColorMode(nextColorMode(colorMode))}>
            Mode
          </button>
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
          <>
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
                          <input
                            type="text"
                            value={authForm.name}
                            onChange={handleAuthChange("name")}
                            required
                          />
                        </label>
                        <label>
                          Phone
                          <input
                            type="tel"
                            value={authForm.phone}
                            onChange={handleAuthChange("phone")}
                          />
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
                      Email
                      <input
                        type="email"
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
                    {authError && <p className="muted-copy">{authError}</p>}
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
          </>
        )}
      </main>
    </div>
  );
}

export default App;
