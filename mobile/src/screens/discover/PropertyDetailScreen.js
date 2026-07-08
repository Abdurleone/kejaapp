import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchFavorites, fetchProperty, saveFavorite } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { resolveAssetUrl, useSettings } from "../../context/SettingsContext.js";
import PropertyDetailSkeleton from "../../components/PropertyDetailSkeleton.js";
import MessageView from "../../components/MessageView.js";
import { formatKes, formatRatingSummary } from "../../utils/format.js";
import colors from "../../theme/colors.js";

const contactMethodLabels = {
  phone: "Phone",
  email: "Email",
  whatsapp: "WhatsApp",
  inquiry: "In-app inquiry",
};

export default function PropertyDetailScreen({ route, navigation }) {
  const { propertyId } = route.params;
  const { signedIn } = useAuth();
  const { apiBaseUrl } = useSettings();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProperty = useCallback(async () => {
    setError("");

    try {
      const data = await fetchProperty(propertyId);
      setProperty(data);
    } catch (err) {
      setError(err.message || "Failed to load this property.");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    // Kicking off a real fetch here, not deriving avoidable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    loadProperty();
  }, [loadProperty]);

  useEffect(() => {
    if (!signedIn) return;

    fetchFavorites()
      .then((favorites) => {
        const saved = favorites.some(
          (favorite) => (favorite.property?._id || favorite.property?.id || favorite._id) === propertyId
        );
        setIsSaved(saved);
      })
      .catch(() => {});
  }, [signedIn, propertyId]);

  const handleSave = async () => {
    if (!signedIn) {
      navigation.navigate("Login");
      return;
    }

    setSaving(true);

    try {
      await saveFavorite(propertyId);
      setIsSaved(true);
    } catch {
      // Leave unsaved; user can retry.
    } finally {
      setSaving(false);
    }
  };

  const requireAuth = (screen) => {
    if (!signedIn) {
      navigation.navigate("Login");
      return;
    }

    navigation.navigate(screen, { propertyId, viewingType: property?.viewingType });
  };

  if (loading) {
    return <PropertyDetailSkeleton />;
  }

  if (error || !property) {
    return (
      <MessageView
        title="Couldn't load this property"
        message={error || "Property not found."}
        actionLabel={error ? "Retry" : undefined}
        onAction={error ? loadProperty : undefined}
      />
    );
  }

  const imageUrl = resolveAssetUrl(property.images?.[0]?.url, apiBaseUrl);
  const cost = property.costSummary || {};
  const contact = property.contact || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>{property.title?.[0] || "K"}</Text>
        </View>
      )}

      <Text style={styles.title}>{property.title || "Rental property"}</Text>
      <Text style={styles.location}>
        {property.location?.area || "Nairobi"}, {property.location?.county || "Kenya"}
      </Text>
      <Text style={styles.rating}>{formatRatingSummary(property.ratingAverage, property.ratingCount)}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaItem}>{property.bedrooms ?? "-"} beds</Text>
        <Text style={styles.metaItem}>{property.bathrooms ?? "-"} baths</Text>
        <Text style={styles.metaItem}>{property.viewingType || "viewing"}</Text>
        <Text style={styles.metaItem}>{property.status || "available"}</Text>
      </View>

      {property.description ? <Text style={styles.description}>{property.description}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cost summary</Text>
        <View style={styles.costGrid}>
          <CostRow label="Monthly rent" value={formatKes(cost.rent)} />
          <CostRow label="Deposit" value={formatKes(cost.deposit)} />
          <CostRow label="Agency fee" value={formatKes(cost.agencyFee)} />
          <CostRow label="First month total" value={formatKes(cost.firstMonthTotal)} emphasize />
          <CostRow label="Upfront total" value={formatKes(cost.upfrontTotal)} emphasize />
        </View>
      </View>

      {(contact.phone || contact.email || contact.whatsapp || contact.availableHours) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.contactLine}>
            Preferred method: {contactMethodLabels[contact.preferredMethod] || "In-app inquiry"}
          </Text>
          {contact.phone ? <Text style={styles.contactLine}>Phone: {contact.phone}</Text> : null}
          {contact.email ? <Text style={styles.contactLine}>Email: {contact.email}</Text> : null}
          {contact.whatsapp ? <Text style={styles.contactLine}>WhatsApp: {contact.whatsapp}</Text> : null}
          {contact.availableHours ? (
            <Text style={styles.contactLine}>Available: {contact.availableHours}</Text>
          ) : null}
          {contact.notes ? <Text style={styles.contactLine}>{contact.notes}</Text> : null}
        </View>
      ) : null}

      {property.amenities?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenityRow}>
            {property.amenities.map((amenity) => (
              <View key={amenity} style={styles.amenityChip}>
                <Text style={styles.amenityChipText}>{amenity}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={[styles.primaryButton, isSaved && styles.primaryButtonDisabled]}
          onPress={handleSave}
          disabled={isSaved || saving}
        >
          <Text style={[styles.primaryButtonText, isSaved && styles.primaryButtonTextDisabled]}>
            {saving ? "Saving..." : isSaved ? "Saved" : signedIn ? "Save" : "Sign in to save"}
          </Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => requireAuth("InquiryForm")}>
          <Text style={styles.secondaryButtonText}>Send inquiry</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => requireAuth("ViewingRequestForm")}>
          <Text style={styles.secondaryButtonText}>Request viewing</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function CostRow({ label, value, emphasize }) {
  return (
    <View style={styles.costRow}>
      <Text style={styles.costLabel}>{label}</Text>
      <Text style={[styles.costValue, emphasize && styles.costValueEmphasis]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  image: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: 48,
    fontWeight: "800",
    color: colors.greenDark,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
  },
  location: {
    fontSize: 14,
    color: colors.muted,
  },
  rating: {
    fontSize: 13,
    color: colors.greenDark,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaItem: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    textTransform: "capitalize",
  },
  description: {
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  section: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
  },
  costGrid: {
    gap: 6,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  costLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  costValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  costValueEmphasis: {
    color: colors.greenDark,
    fontSize: 14,
  },
  contactLine: {
    fontSize: 13,
    color: colors.ink,
  },
  amenityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  amenityChip: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  amenityChipText: {
    fontSize: 12,
    color: colors.ink,
    textTransform: "capitalize",
  },
  actions: {
    gap: 8,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: colors.greenDark,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: colors.surfaceSoft,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
  primaryButtonTextDisabled: {
    color: colors.muted,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: "700",
  },
});
