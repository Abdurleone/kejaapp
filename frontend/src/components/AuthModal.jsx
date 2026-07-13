import { useState } from "react";
import { loginUser, registerUser } from "../../app-utils.js";

const emptyAuthForm = { name: "", email: "", username: "", password: "", phone: "", role: "tenant" };

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
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);

  const switchMode = (mode) => {
    setAuthMode(mode);
    setAuthError("");
    setUsernameSuggestions([]);
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
    setAuthLoading(true);
    setAuthError("");
    setUsernameSuggestions([]);

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
      <div className="auth-panel">
        <div className="auth-panel-header">
          <h2>{authMode === "login" ? "Sign in" : "Create account"}</h2>
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
            <input type="password" value={authForm.password} onChange={handleAuthChange("password")} required />
          </label>
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
