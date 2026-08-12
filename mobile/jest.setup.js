jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Reanimated's own test setup: replaces its native worklet runtime with a
// synchronous JS one so animated styles/shared values resolve immediately
// in tests instead of needing a real UI thread.
require("react-native-reanimated").setUpTests();

// jest-expo's auto-generated native-module mock for expo-secure-store has no
// actual storage behind it (every call just resolves undefined), so round-
// tripping a value through it would silently fail - provide a simple
// in-memory store instead, mirroring the AsyncStorage mock above.
jest.mock("expo-secure-store", () => {
  const store = new Map();

  return {
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});
