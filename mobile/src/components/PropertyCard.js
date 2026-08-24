import { memo, useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext.js";
import { formatKes } from "../utils/format.js";
import { resolveAssetUrl } from "../context/SettingsContext.js";
import { bodyText, boldText } from "../theme/typography.js";

function PropertyCard({ property, apiBaseUrl, onPress, isSaved, onToggleSave, savingFavorite }) {
  const { colors } = useTheme();
  // Memoized so this doesn't rebuild the whole StyleSheet.create() object on
  // every render - matches every sibling list-row component's convention of
  // computing styles once and only recreating them when colors actually
  // changes (e.g. a theme toggle), not on every parent re-render.
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rent = property.price?.rent ?? property.rent;
  const area = property.location?.area || property.area || "Nairobi";
  const county = property.location?.county || property.county || "Kenya";
  const bedrooms = property.bedrooms ?? property.details?.bedrooms;
  const bathrooms = property.bathrooms ?? property.details?.bathrooms;
  const imageUrl = resolveAssetUrl(property.images?.[0]?.url, apiBaseUrl);

  return (
    <Pressable style={[styles.card, colors.shadowSm]} onPress={onPress}>
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
        {property.owner?.role === "agency" && property.owner.verified ? (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>Verified agency</Text>
          </View>
        ) : null}

        <View style={styles.costRow}>
          <Text style={styles.price}>{formatKes(rent)}</Text>
          <Text style={styles.priceLabel}>per month</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>{bedrooms || "-"} beds</Text>
          <Text style={styles.metaItem}>{bathrooms || "-"} baths</Text>
          <Text style={styles.metaItem}>{property.viewingType || "viewing"}</Text>
        </View>

        <View style={styles.footerRow}>
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
          ) : (
            <View />
          )}
          <Text style={styles.detailsLink}>View details ›</Text>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: colors.radius,
      borderWidth: colors.strokeWidthSm,
      borderColor: colors.stroke,
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
      ...boldText,
      fontSize: 32,
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
      ...boldText,
      fontSize: 12,
      color: colors.green,
      textTransform: "capitalize",
    },
    body: {
      padding: 14,
      gap: 8,
    },
    title: {
      ...boldText,
      fontSize: 16,
      color: colors.ink,
    },
    subtitle: {
      ...bodyText,
      fontSize: 13,
      color: colors.muted,
    },
    verifiedBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    verifiedBadgeText: {
      ...boldText,
      fontSize: 11,
      color: colors.green,
    },
    costRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
    },
    price: {
      ...boldText,
      fontSize: 17,
      color: colors.green,
    },
    priceLabel: {
      ...bodyText,
      fontSize: 12,
      color: colors.muted,
    },
    metaRow: {
      flexDirection: "row",
      gap: 8,
    },
    metaItem: {
      ...boldText,
      fontSize: 12,
      color: colors.muted,
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: colors.radiusSm,
      textTransform: "capitalize",
    },
    footerRow: {
      marginTop: 4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    detailsLink: {
      ...boldText,
      fontSize: 13,
      color: colors.green,
    },
    saveButton: {
      alignSelf: "flex-start",
      backgroundColor: colors.green,
      paddingHorizontal: 16,
      minHeight: 44,
      justifyContent: "center",
      borderRadius: 999,
    },
    saveButtonSaved: {
      backgroundColor: colors.surfaceSoft,
    },
    saveButtonText: {
      ...boldText,
      color: colors.onAccent,
      fontSize: 13,
    },
    saveButtonTextSaved: {
      color: colors.muted,
    },
  });

export default memo(PropertyCard);
