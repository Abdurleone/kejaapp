import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl, setApiBaseUrl as persistApiBaseUrl } from "../api/index.js";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [apiBaseUrl, setApiBaseUrlState] = useState(null);

  useEffect(() => {
    getApiBaseUrl().then(setApiBaseUrlState);
  }, []);

  const setApiBaseUrl = useCallback(async (url) => {
    await persistApiBaseUrl(url);
    setApiBaseUrlState(await getApiBaseUrl());
  }, []);

  const value = useMemo(() => ({ apiBaseUrl, setApiBaseUrl }), [apiBaseUrl, setApiBaseUrl]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }

  return context;
};

export const resolveAssetUrl = (url, apiBaseUrl) => {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${(apiBaseUrl || "").replace(/\/$/, "")}${url}`;
};
