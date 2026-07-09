import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { deleteSavedSearch, fetchSavedSearches } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import colors from "../../theme/colors.js";

function describeSavedSearch(savedSearch) {
  const parts = [];

  if (savedSearch.lat != null && savedSearch.lng != null) {
    parts.push(`within ${savedSearch.radiusKm || 5}km of a location`);
  }

  if (savedSearch.county) parts.push(`in ${savedSearch.county}`);
  if (savedSearch.town) parts.push(`near ${savedSearch.town}`);
  if (savedSearch.type) parts.push(savedSearch.type);
  if (savedSearch.bedrooms) parts.push(`${savedSearch.bedrooms}+ bed`);
  if (savedSearch.minRent || savedSearch.maxRent) {
    parts.push(`KES ${savedSearch.minRent || 0}-${savedSearch.maxRent || "any"}`);
  }

  return parts.length > 0 ? parts.join(", ") : "Any listing";
}

function SavedSearchesCard() {
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setError("");

    try {
      const data = await fetchSavedSearches();
      setSavedSearches(data);
    } catch (err) {
      setError(err.message || "Failed to load your saved searches.");
    }
  }, []);

  useEffect(() => {
    // Kicking off a real fetch here, not deriving avoidable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleDelete = async (savedSearchId) => {
    setDeletingId(savedSearchId);

    try {
      await deleteSavedSearch(savedSearchId);
      setSavedSearches((current) => current.filter((item) => item._id !== savedSearchId));
    } catch (err) {
      setError(err.message || "Could not delete this saved search.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Saved searches</Text>
      {loading ? (
        <Text style={styles.subtitleSmall}>Loading...</Text>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : savedSearches.length === 0 ? (
        <Text style={styles.subtitleSmall}>
          You have no saved searches yet. Save one from the Discover tab's location filters.
        </Text>
      ) : (
        savedSearches.map((savedSearch) => (
          <View key={savedSearch._id} style={styles.savedSearchRow}>
            <Text style={styles.savedSearchText}>{describeSavedSearch(savedSearch)}</Text>
            <Pressable disabled={deletingId === savedSearch._id} onPress={() => handleDelete(savedSearch._id)}>
              <Text style={styles.removeText}>{deletingId === savedSearch._id ? "Removing..." : "Remove"}</Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

export default function AccountScreen() {
  const navigation = useNavigation();
  const { user, signedIn, logout } = useAuth();

  const confirmSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logout },
    ]);
  };

  if (!signedIn) {
    return (
      <View style={styles.signedOutContainer}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Sign in to manage your profile and view your activity.</Text>
        <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.primaryButtonText}>Sign in</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("Register")}>
          <Text style={styles.secondaryButtonText}>Create account</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <DetailRow label="Name" value={user?.name || "Not set"} />
        <DetailRow label="Username" value={user?.username || "Not set"} />
        <DetailRow label="Email" value={user?.email || "Not set"} />
        <DetailRow label="Role" value={user?.role || "Not set"} />
        <DetailRow label="Phone" value={user?.phone || "Not set"} />
      </View>

      {user?.role === "tenant" ? <SavedSearchesCard /> : null}

      <Pressable style={styles.dangerButton} onPress={confirmSignOut}>
        <Text style={styles.dangerButtonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
    gap: 16,
  },
  signedOutContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  detailRow: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
  },
  subtitleSmall: {
    fontSize: 13,
    color: colors.muted,
  },
  error: {
    fontSize: 13,
    color: colors.red,
  },
  savedSearchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  savedSearchText: {
    fontSize: 13,
    color: colors.ink,
    flexShrink: 1,
  },
  removeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.red,
  },
  detailValue: {
    fontSize: 15,
    color: colors.ink,
  },
  primaryButton: {
    backgroundColor: colors.greenDark,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: "700",
  },
  dangerButton: {
    backgroundColor: colors.red,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
});
