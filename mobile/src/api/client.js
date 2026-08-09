import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

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

// The auth JWT lives in SecureStore (iOS Keychain / Android Keystore-backed),
// not AsyncStorage - AsyncStorage is plain, unencrypted disk storage, so a
// rooted/jailbroken device or an unencrypted local device backup could read
// a token straight out of it. Everything else here (base URL) isn't
// sensitive and stays in AsyncStorage.
export const getAuthToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export const setAuthToken = async (token) => {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
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
  } catch {
    throw new Error(
      `Could not reach the API at ${baseUrl}. Check the API server address in Settings and that the server is running.`
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || `Request failed with status ${response.status}`);
    if (payload.suggestions) {
      error.suggestions = payload.suggestions;
    }
    throw error;
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
