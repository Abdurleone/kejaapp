import { createContext, useContext } from "react";

const AuthContext = createContext(null);

// App.jsx owns the actual signedIn/currentUser state (it's the one that runs
// the session-restore effect and the login/logout handlers) - this just
// makes that state and the "open the sign-in modal" action available to any
// page without threading them through every renderCurrentPage() call site.
export function AuthProvider({ signedIn, currentUser, openAuthPanel, children }) {
  return (
    <AuthContext.Provider value={{ signedIn, currentUser, openAuthPanel }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
