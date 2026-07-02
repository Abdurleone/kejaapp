import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "keja_token";
const BASE_URL_KEY = "keja_base_url";

// Loopback rules differ per target: the Android emulator can't reach the
// host machine via "localhost" (that's the emulator itself) and needs the
// special 10.0.2.2 alias instead. A physical device via Expo Go needs the
// dev machine's real LAN IP, which can't be guessed — override it via
// setApiBaseUrl (exposed as a field on the Login screen).
const defaultApiBaseUrl =
  Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";

export const getApiBaseUrl = async () => {
  const stored = await AsyncStorage.getItem(BASE_URL_KEY);
  return stored || defaultApiBaseUrl;
};

export const setApiBaseUrl = async (url) => {
  const trimmed = (url || "").trim().replace(/\/+$/, "");

  if (trimmed) {
    await AsyncStorage.setItem(BASE_URL_KEY, trimmed);
  } else {
    await AsyncStorage.removeItem(BASE_URL_KEY);
  }
};

export const getAuthToken = () => AsyncStorage.getItem(TOKEN_KEY);

export const setAuthToken = async (token) => {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
};

export const apiFetch = async (path, options = {}) => {
  const [baseUrl, token] = await Promise.all([getApiBaseUrl(), getAuthToken()]);
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new Error(
      `Could not reach the API at ${baseUrl}. Check the API server address in Settings and that the server is running.`
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }

  return payload;
};

export const buildQueryString = (filters) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
};
