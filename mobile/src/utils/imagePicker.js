import * as ImagePicker from "expo-image-picker";

// Best-effort, mirroring utils/location.js's getCurrentPositionOrNull -
// resolves with an array of { uri, fileName, mimeType, base64 } (empty if
// denied/canceled/unavailable), so callers don't need their own
// permission-branching UI. Multi-select lets a landlord add a batch of
// photos in one picker trip instead of repeating the flow per photo.
export const pickImagesOrEmpty = async () => {
  try {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!granted) {
      return [];
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 8,
    });

    if (result.canceled || !result.assets?.length) {
      return [];
    }

    return result.assets
      .filter((asset) => asset.base64)
      .map((asset, index) => ({
        uri: asset.uri,
        fileName: asset.fileName || `photo-${Date.now()}-${index}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        base64: asset.base64,
      }));
  } catch {
    return [];
  }
};
