import { useEffect, useRef, useState } from "react";
import { loginUser, registerUser } from "../../app-utils.js";
import GoogleSignInButton from "./GoogleSignInButton.jsx";

const emptyAuthForm = { name: "", email: "", username: "", password: "", phone: "", role: "tenant" };
const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Extracted out of App.jsx, which owned this as inline state/JSX alongside
// routing and everything else. Since App only ever mounts this behind
// `authPanelOpen && <AuthModal ... />`, a fresh mount already resets all of
// this component's state on every open - no need to thread a "reset" call
// back through props the way App.jsx's old openAuthPanel() did.
export default function AuthModal({ onClose, onAuthenticated }) {
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const panelRef = useRef(null);

  useEffect(() => {
    // Focus the first actual field (skipping the Close button) rather than
    // just "the first focusable element" - a user opening this expects to
    // start typing, not land on a button.
    panelRef.current?.querySelector("input, select, textarea")?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      // Trap focus inside the dialog - recomputed on every Tab press (not
      // memoized) so it stays correct as register mode adds/removes fields.
      const focusable = Array.from(panelRef.current.querySelectorAll(focusableSelector));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const switchMode = (mode) => {
    setAuthMode(mode);
    setAuthError("");
    setUsernameSuggestions([]);
    setConfirmPassword("");
  };

  const handleAuthChange = (field) => (event) => {
    if (field === "username") {
      setUsernameSuggestions([]);
    }
    setAuthForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const applyUsernameSuggestion = (suggestion) => {
    setAuthForm((prev) => ({ ...prev, username: suggestion }));
    setUsernameSuggestions([]);
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setUsernameSuggestions([]);

    if (authMode === "register" && authForm.password !== confirmPassword) {
      setAuthError("Password and confirmation don't match.");
      return;
    }

    setAuthLoading(true);

    try {
      const payload =
        authMode === "login"
          ? await loginUser({ identifier: authForm.email, password: authForm.password })
          : await registerUser(authForm);

      onAuthenticated(payload.user);
    } catch (err) {
      setAuthError(err.message || "Authentication failed");
      setUsernameSuggestions(err.suggestions || []);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="auth-panel-overlay">
      <div className="auth-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="auth-panel-title">
        <div className="auth-panel-header">
          <h2 id="auth-panel-title">{authMode === "login" ? "Sign in" : "Create account"}</h2>
          <button className="text-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="auth-panel-tabs">
          <button
            type="button"
            className={authMode === "login" ? "active" : "secondary-button"}
            onClick={() => switchMode("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={authMode === "register" ? "active" : "secondary-button"}
            onClick={() => switchMode("register")}
          >
            Register
          </button>
        </div>
        {Boolean(import.meta.env?.VITE_GOOGLE_CLIENT_ID) && (
          <>
            <GoogleSignInButton
              onAuthenticated={onAuthenticated}
              onError={(message) => setAuthError(message)}
            />
            <p className="muted-copy auth-panel-divider">or</p>
          </>
        )}
        <form className="auth-panel-form" onSubmit={handleAuthSubmit}>
          {authMode === "register" && (
            <>
              <label>
                Name
                <input type="text" value={authForm.name} onChange={handleAuthChange("name")} required />
              </label>
              <label>
                Username
                <input type="text" value={authForm.username} onChange={handleAuthChange("username")} required />
              </label>
              {usernameSuggestions.length > 0 && (
                <div className="form-actions">
                  {usernameSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="secondary-button"
                      onClick={() => applyUsernameSuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
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
                  <option value="mover">Mover</option>
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
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={authForm.password}
                onChange={handleAuthChange("password")}
                minLength={authMode === "register" ? 8 : undefined}
                required
              />
              <button
                type="button"
                className="text-button password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          {authMode === "register" && (
            <label>
              Confirm password
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
          )}
          {authError && <p className="error-text">{authError}</p>}
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={authLoading}>
              {authLoading ? "Working..." : authMode === "login" ? "Sign in" : "Register"}
            </button>
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
