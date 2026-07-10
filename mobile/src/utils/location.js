import * as Location from "expo-location";

// Best-effort: resolves with {lat, lng}, or null if unsupported/denied/unavailable.
// Callers should treat pickup coordinates as optional — a mover request is still
// valid without them, it just won't show a pickup-to-dropoff distance.
export const getCurrentPositionOrNull = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      return null;
    }

    const position = await Location.getCurrentPositionAsync({});
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return null;
  }
};
