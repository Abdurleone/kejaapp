import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import colors from "../theme/colors.js";
import { formatKes } from "../utils/format.js";
import { resolveAssetUrl } from "../context/SettingsContext.js";

export default function PropertyCard({ property, apiBaseUrl, onPress, isSaved, onToggleSave, savingFavorite }) {
  const rent = property.price?.rent ?? property.rent;
  const area = property.location?.area || property.area || "Nairobi";
  const county = property.location?.county || property.county || "Kenya";
  const bedrooms = property.bedrooms ?? property.details?.bedrooms;
  const bathrooms = property.bathrooms ?? property.details?.bathrooms;
  const imageUrl = resolveAssetUrl(property.images?.[0]?.url, apiBaseUrl);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>{property.title?.[0] || "K"}</Text>
          </View>
        )}
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{property.status || "available"}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{property.title || "Rental property"}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{area}, {county}</Text>

        <View style={styles.costRow}>
          <Text style={styles.price}>{formatKes(rent)}</Text>
          <Text style={styles.priceLabel}>per month</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>{bedrooms || "-"} beds</Text>
          <Text style={styles.metaItem}>{bathrooms || "-"} baths</Text>
          <Text style={styles.metaItem}>{property.viewingType || "viewing"}</Text>
        </View>

        {onToggleSave ? (
          <Pressable
            style={[styles.saveButton, isSaved && styles.saveButtonSaved]}
            onPress={onToggleSave}
            disabled={isSaved || savingFavorite}
          >
            <Text style={[styles.saveButtonText, isSaved && styles.saveButtonTextSaved]}>
              {savingFavorite ? "Saving..." : isSaved ? "Saved" : "Save"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    marginBottom: 16,
  },
  imageWrap: {
    position: "relative",
    aspectRatio: 16 / 10,
    backgroundColor: colors.surfaceSoft,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.green,
  },
  statusPill: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.greenDark,
    textTransform: "capitalize",
  },
  body: {
    padding: 14,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  costRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  price: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.greenDark,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
  },
  metaItem: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textTransform: "capitalize",
  },
  saveButton: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: colors.green,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonSaved: {
    backgroundColor: colors.surfaceSoft,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
  saveButtonTextSaved: {
    color: colors.muted,
  },
});
