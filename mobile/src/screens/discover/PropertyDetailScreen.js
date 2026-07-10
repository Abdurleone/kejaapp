import { useCallback, useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchFavorites, fetchProperty, fetchPropertyMovers, saveFavorite } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { resolveAssetUrl, useSettings } from "../../context/SettingsContext.js";
import PropertyDetailSkeleton from "../../components/PropertyDetailSkeleton.js";
import MessageView from "../../components/MessageView.js";
import { formatKes, formatRatingSummary, formatStatusLabel } from "../../utils/format.js";
import { useTheme } from "../../context/ThemeContext.js";
import { buildEmailUrl, buildPhoneUrl, buildWhatsAppUrl, getPreferredContactUrl } from "../../utils/contact.js";

const contactMethodLabels = {
  phone: "Phone",
  email: "Email",
  whatsapp: "WhatsApp",
  inquiry: "In-app inquiry",
};

const openContactUrl = (url) => {
  if (url) Linking.openURL(url).catch(() => {});
};

export default function PropertyDetailScreen({ route, navigation }) {
  const { propertyId } = route.params;
  const { signedIn, user } = useAuth();
  const canViewDetails = signedIn && user?.role === "tenant";
  const { apiBaseUrl } = useSettings();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [propertyMovers, setPropertyMovers] = useState({ affiliates: [], nearby: [] });

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
    if (!canViewDetails) return;

    // Kicking off a real fetch here, not deriving avoidable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    loadProperty();
  }, [canViewDetails, loadProperty]);

  useEffect(() => {
    if (!canViewDetails) return;

    fetchFavorites()
      .then((favorites) => {
        const saved = favorites.some(
          (favorite) => (favorite.property?._id || favorite.property?.id || favorite._id) === propertyId
        );
        setIsSaved(saved);
      })
      .catch(() => {});
  }, [canViewDetails, propertyId]);

  useEffect(() => {
    if (!canViewDetails) return;

    fetchPropertyMovers(propertyId)
      .then((data) => setPropertyMovers(data))
      .catch(() => {});
  }, [canViewDetails, propertyId]);

  const handleSave = async () => {
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
    navigation.navigate(screen, { propertyId, viewingType: property?.viewingType });
  };

  const requestMoverService = (mover) => {
    navigation.navigate("MoverRequestForm", { propertyId, moverId: mover._id, moverName: mover.name });
  };

  if (!canViewDetails) {
    return (
      <MessageView
        title="Sign in as a tenant"
        message="Sign in with a tenant account to view full property details and contact the owner."
        actionLabel="Sign in"
        onAction={() => navigation.navigate("Login")}
      />
    );
  }

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
  const preferredContactUrl = getPreferredContactUrl(contact);

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

      {property.owner?.name ? (
        <View style={styles.ownerRow}>
          <Text style={styles.ownerLine}>Listed by {property.owner.name}</Text>
          {property.owner.role === "agency" && property.owner.verified ? (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>Verified agency</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cost summary</Text>
        <View style={styles.costGrid}>
          <CostRow label="Monthly rent" value={formatKes(cost.rent)} styles={styles} />
          <CostRow label="Deposit" value={formatKes(cost.deposit)} styles={styles} />
          <CostRow label="Agency fee" value={formatKes(cost.agencyFee)} styles={styles} />
          <CostRow label="First month total" value={formatKes(cost.firstMonthTotal)} emphasize styles={styles} />
          <CostRow label="Upfront total" value={formatKes(cost.upfrontTotal)} emphasize styles={styles} />
        </View>
      </View>

      {(contact.phone || contact.email || contact.whatsapp || contact.availableHours) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.contactLine}>
            Preferred method: {contactMethodLabels[contact.preferredMethod] || "In-app inquiry"}
          </Text>

          {preferredContactUrl ? (
            <Pressable style={styles.contactButton} onPress={() => openContactUrl(preferredContactUrl)}>
              <Text style={styles.contactButtonText}>
                Contact via {contactMethodLabels[contact.preferredMethod]}
              </Text>
            </Pressable>
          ) : null}

          {contact.phone ? (
            <Pressable onPress={() => openContactUrl(buildPhoneUrl(contact.phone))}>
              <Text style={styles.contactLineLink}>Phone: {contact.phone}</Text>
            </Pressable>
          ) : null}
          {contact.email ? (
            <Pressable onPress={() => openContactUrl(buildEmailUrl(contact.email))}>
              <Text style={styles.contactLineLink}>Email: {contact.email}</Text>
            </Pressable>
          ) : null}
          {contact.whatsapp ? (
            <Pressable onPress={() => openContactUrl(buildWhatsAppUrl(contact.whatsapp))}>
              <Text style={styles.contactLineLink}>WhatsApp: {contact.whatsapp}</Text>
            </Pressable>
          ) : null}
          {contact.availableHours ? (
            <Text style={styles.contactLine}>Available: {contact.availableHours}</Text>
          ) : null}
          {contact.notes ? <Text style={styles.contactLine}>{contact.notes}</Text> : null}
        </View>
      ) : null}

      {propertyMovers.affiliates.length > 0 || propertyMovers.nearby.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Movers for this move</Text>
          {propertyMovers.affiliates.length > 0 ? (
            <View style={styles.moverGroup}>
              <Text style={styles.moverGroupTitle}>Recommended by the owner</Text>
              {propertyMovers.affiliates.map((mover) => (
                <MoverRow key={mover._id} mover={mover} styles={styles} onRequest={() => requestMoverService(mover)} />
              ))}
            </View>
          ) : null}
          {propertyMovers.nearby.length > 0 ? (
            <View style={styles.moverGroup}>
              <Text style={styles.moverGroupTitle}>Movers nearby</Text>
              {propertyMovers.nearby.map((mover) => (
                <MoverRow key={mover._id} mover={mover} styles={styles} onRequest={() => requestMoverService(mover)} />
              ))}
            </View>
          ) : null}
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
            {saving ? "Saving..." : isSaved ? "Saved" : "Save"}
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

function CostRow({ label, value, emphasize, styles }) {
  return (
    <View style={styles.costRow}>
      <Text style={styles.costLabel}>{label}</Text>
      <Text style={[styles.costValue, emphasize && styles.costValueEmphasis]}>{value}</Text>
    </View>
  );
}

function MoverRow({ mover, styles, onRequest }) {
  return (
    <View style={styles.moverCard}>
      <Text style={styles.moverName}>{mover.name}</Text>
      <Text style={styles.contactLine}>
        {(mover.serviceTypes || []).map((type) => formatStatusLabel(type)).join(", ") || "General moving"}
      </Text>
      <View style={styles.costRow}>
        <Text style={styles.costValueEmphasis}>{formatKes(mover.basePrice)}</Text>
        <Text style={styles.costLabel}>base price</Text>
      </View>
      <Pressable style={styles.secondaryButton} onPress={onRequest}>
        <Text style={styles.secondaryButtonText}>Request service</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
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
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ownerLine: {
    fontSize: 13,
    color: colors.muted,
  },
  verifiedBadge: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.greenDark,
  },
  moverGroup: {
    gap: 8,
  },
  moverGroupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
  },
  moverCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    backgroundColor: colors.surfaceSoft,
  },
  moverName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
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
  contactLineLink: {
    fontSize: 13,
    color: colors.greenDark,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  contactButton: {
    backgroundColor: colors.greenDark,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginVertical: 4,
  },
  contactButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 14,
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
