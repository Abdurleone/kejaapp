import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { createSavedSearch, fetchFavorites, fetchProperties, saveFavorite } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { useSettings } from "../../context/SettingsContext.js";
import PropertyCard from "../../components/PropertyCard.js";
import { PropertyCardSkeletonList } from "../../components/PropertyCardSkeleton.js";
import MessageView from "../../components/MessageView.js";
import { useTheme } from "../../context/ThemeContext.js";

const radiusOptions = [3, 5, 10, 20];

export default function DiscoverScreen({ navigation }) {
  const { signedIn } = useAuth();
  const { apiBaseUrl } = useSettings();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState(null);
  const [radius, setRadius] = useState(5);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [savedIds, setSavedIds] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveSearchMessage, setSaveSearchMessage] = useState("");

  const loadProperties = useCallback(async ({ lat, lng, radiusKm } = {}) => {
    setError("");

    try {
      const params = { page: 1, limit: 20 };

      if (lat != null && lng != null) {
        params.lat = lat;
        params.lng = lng;
        params.radiusKm = radiusKm || radius;
      }

      const data = await fetchProperties(params);
      setProperties(data);
    } catch (err) {
      setError(err.message || "Failed to load properties.");
    }
  }, [radius]);

  const loadFavorites = useCallback(async () => {
    if (!signedIn) {
      setSavedIds([]);
      return;
    }

    try {
      const favorites = await fetchFavorites();
      setSavedIds(
        favorites
          .map((favorite) => favorite.property?._id || favorite.property?.id || favorite._id)
          .filter(Boolean)
      );
    } catch {
      // Non-fatal: favorites just won't show as saved yet.
    }
  }, [signedIn]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadProperties(), loadFavorites()]);
      setLoading(false);
    })();
    // Intentionally only re-runs on sign-in state, not on every loadProperties/loadFavorites
    // identity change (which happens whenever radius changes) — radius-driven reloads are
    // already triggered explicitly by handleRadiusChange, so adding them here would double-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadProperties(coords ? { lat: coords.lat, lng: coords.lng, radiusKm: radius } : {}),
      loadFavorites(),
    ]);
    setRefreshing(false);
  };

  const handleNearMe = async () => {
    setLocationError("");
    setLocating(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationError("Location permission was denied.");
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setCoords({ lat, lng });
      await loadProperties({ lat, lng, radiusKm: radius });
    } catch {
      setLocationError("Unable to retrieve your location.");
    } finally {
      setLocating(false);
    }
  };

  const handleRadiusChange = async (value) => {
    setRadius(value);

    if (coords) {
      await loadProperties({ lat: coords.lat, lng: coords.lng, radiusKm: value });
    }
  };

  const handleSaveSearch = async () => {
    if (!signedIn) {
      navigation.navigate("Login");
      return;
    }

    setSaveSearchMessage("");
    setSavingSearch(true);

    try {
      await createSavedSearch({ lat: coords.lat, lng: coords.lng, radiusKm: radius });
      setSaveSearchMessage("Saved! We'll notify you when a matching listing appears.");
    } catch (err) {
      setSaveSearchMessage(err.message || "Could not save this search.");
    } finally {
      setSavingSearch(false);
    }
  };

  const handleSave = async (propertyId) => {
    if (!signedIn) {
      navigation.navigate("Login");
      return;
    }

    setSavingId(propertyId);

    try {
      await saveFavorite(propertyId);
      setSavedIds((current) => [...new Set([...current, propertyId])]);
    } catch {
      // Swallow: card just stays unsaved, user can retry.
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.list}>
        <PropertyCardSkeletonList />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <View style={styles.radiusRow}>
          {radiusOptions.map((option) => (
            <Pressable
              key={option}
              style={[styles.radiusChip, radius === option && styles.radiusChipActive]}
              onPress={() => handleRadiusChange(option)}
            >
              <Text style={[styles.radiusChipText, radius === option && styles.radiusChipTextActive]}>
                {option} km
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.nearMeButton} onPress={handleNearMe} disabled={locating}>
          <Text style={styles.nearMeButtonText}>{locating ? "Locating..." : "Near me"}</Text>
        </Pressable>
        {coords ? (
          <Pressable style={styles.nearMeButton} onPress={handleSaveSearch} disabled={savingSearch}>
            <Text style={styles.nearMeButtonText}>{savingSearch ? "Saving..." : "Save search"}</Text>
          </Pressable>
        ) : null}
      </View>

      {locationError ? <Text style={styles.inlineError}>{locationError}</Text> : null}
      {saveSearchMessage ? <Text style={styles.inlineMessage}>{saveSearchMessage}</Text> : null}

      {error ? (
        <MessageView
          title="Couldn't load rentals"
          message={error}
          actionLabel="Retry"
          onAction={() => loadProperties(coords ? { lat: coords.lat, lng: coords.lng, radiusKm: radius } : {})}
        />
      ) : properties.length === 0 ? (
        <MessageView title="No rentals found" message="Try clearing location search or widening the radius." />
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={({ item }) => {
            const propertyId = item._id || item.id;
            return (
              <PropertyCard
                property={item}
                apiBaseUrl={apiBaseUrl}
                isSaved={savedIds.includes(propertyId)}
                savingFavorite={savingId === propertyId}
                onToggleSave={() => handleSave(propertyId)}
                onPress={() => navigation.navigate("PropertyDetail", { propertyId })}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  radiusRow: {
    flexDirection: "row",
    gap: 6,
  },
  radiusChip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  radiusChipActive: {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
  },
  radiusChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  radiusChipTextActive: {
    color: colors.white,
  },
  nearMeButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  nearMeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  inlineError: {
    color: colors.red,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  inlineMessage: {
    color: colors.greenDark,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  list: {
    padding: 16,
    paddingTop: 4,
  },
  });
