import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchCurrentUser,
  getAuthToken,
  loginUser,
  logoutUser,
  registerUser,
} from "../api/index.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const token = await getAuthToken();

      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const me = await fetchCurrentUser();
        if (active) setUser(me);
      } catch {
        // Stored token is stale/invalid; fall through to signed-out state.
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const login = async (credentials) => {
    const response = await loginUser(credentials);
    setUser(response.user);
    return response.user;
  };

  const register = async (payload) => {
    const response = await registerUser(payload);
    setUser(response.user);
    return response.user;
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, signedIn: Boolean(user), loading, login, register, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
