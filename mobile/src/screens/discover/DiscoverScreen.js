import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { createSavedSearch, fetchFavorites, fetchProperties, saveFavorite } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { useSettings } from "../../context/SettingsContext.js";
import PropertyCard from "../../components/PropertyCard.js";
import { PropertyCardSkeletonList } from "../../components/PropertyCardSkeleton.js";
import MessageView from "../../components/MessageView.js";
import { useTheme } from "../../context/ThemeContext.js";
import { bodyText, boldText } from "../../theme/typography.js";

const radiusOptions = [3, 5, 10, 20];
const typeOptions = [
  { value: "", label: "Any type" },
  { value: "apartment", label: "Apartment" },
  { value: "bedsitter", label: "Bedsitter" },
  { value: "maisonette", label: "Maisonette" },
  { value: "house", label: "House" },
  { value: "studio", label: "Studio" },
  { value: "other", label: "Other" },
];
const bedroomOptions = [
  { value: "", label: "Any beds" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
];

export default function DiscoverScreen({ navigation }) {
  const { signedIn } = useAuth();
  const { apiBaseUrl } = useSettings();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState(null);
  const [radius, setRadius] = useState(5);
  const [type, setType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [savedIds, setSavedIds] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveSearchMessage, setSaveSearchMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The filter set actually fetched, as opposed to the raw min/max rent
  // inputs below - those only feed a fetch once "Apply price" is tapped,
  // everything else applies immediately on change.
  const [appliedFilters, setAppliedFilters] = useState({
    lat: null,
    lng: null,
    radiusKm: radius,
    type: "",
    bedrooms: "",
    minRent: "",
    maxRent: "",
  });

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
    // Kicking off a real fetch here, not deriving avoidable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFavorites();
  }, [loadFavorites]);

  // Deriving the fetch from appliedFilters (rather than calling a shared
  // loadProperties function ad hoc from every handler) is what makes the
  // active-flag guard actually work: React runs this effect's cleanup
  // before the next one fires whenever appliedFilters/retryKey changes, so
  // a still-in-flight, now-stale request can never overwrite a newer one.
  // loading only reflects the very first run (its initial value is true,
  // and nothing here ever sets it back to true) so filter taps update the
  // list silently, matching the screen's original no-flicker behavior.
  useEffect(() => {
    let active = true;

    const run = async () => {
      setError("");

      try {
        const params = { page: 1, limit: 20 };

        if (appliedFilters.lat != null && appliedFilters.lng != null) {
          params.lat = appliedFilters.lat;
          params.lng = appliedFilters.lng;
          params.radiusKm = appliedFilters.radiusKm;
        }

        if (appliedFilters.type) params.type = appliedFilters.type;
        if (appliedFilters.bedrooms) params.bedrooms = appliedFilters.bedrooms;
        if (appliedFilters.minRent) params.minRent = appliedFilters.minRent;
        if (appliedFilters.maxRent) params.maxRent = appliedFilters.maxRent;

        const data = await fetchProperties(params);
        if (active) setProperties(data);
      } catch (err) {
        if (active) setError(err.message || "Failed to load properties.");
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [appliedFilters, retryKey]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadFavorites();
    setRetryKey((key) => key + 1);
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
      setAppliedFilters((current) => ({ ...current, lat, lng, radiusKm: radius }));
    } catch {
      setLocationError("Unable to retrieve your location.");
    } finally {
      setLocating(false);
    }
  };

  const handleRadiusChange = (value) => {
    setRadius(value);

    if (coords) {
      setAppliedFilters((current) => ({ ...current, lat: coords.lat, lng: coords.lng, radiusKm: value }));
    }
  };

  const handleTypeChange = (value) => {
    setType(value);
    setAppliedFilters((current) => ({ ...current, lat: coords?.lat ?? null, lng: coords?.lng ?? null, type: value }));
  };

  const handleBedroomsChange = (value) => {
    setBedrooms(value);
    setAppliedFilters((current) => ({
      ...current,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      bedrooms: value,
    }));
  };

  const handleApplyPriceFilter = () => {
    setAppliedFilters((current) => ({
      ...current,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      minRent,
      maxRent,
    }));
  };

  const handleSaveSearch = async () => {
    if (!signedIn) {
      navigation.navigate("Login");
      return;
    }

    setSaveSearchMessage("");
    setSavingSearch(true);

    try {
      const payload = { lat: coords.lat, lng: coords.lng, radiusKm: radius };
      if (type) payload.type = type;
      if (bedrooms) payload.bedrooms = Number(bedrooms);
      if (minRent) payload.minRent = Number(minRent);
      if (maxRent) payload.maxRent = Number(maxRent);

      await createSavedSearch(payload);
      setSaveSearchMessage("Saved! We'll notify you when a matching listing appears.");
    } catch (err) {
      setSaveSearchMessage(err.message || "Could not save this search.");
    } finally {
      setSavingSearch(false);
    }
  };

  const handleSave = useCallback(
    async (propertyId) => {
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
    },
    [signedIn, navigation]
  );

  const renderPropertyItem = useCallback(
    ({ item }) => {
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
    },
    [apiBaseUrl, savedIds, savingId, handleSave, navigation]
  );

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.list}>
        <PropertyCardSkeletonList />
      </ScrollView>
    );
  }

  const activeFilterCount =
    (radius !== 5 ? 1 : 0) +
    (type ? 1 : 0) +
    (bedrooms ? 1 : 0) +
    (minRent ? 1 : 0) +
    (maxRent ? 1 : 0);

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <Pressable
          style={styles.filterToggle}
          onPress={() => setFiltersOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: filtersOpen }}
        >
          <Text style={styles.filterToggleText}>
            Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
          </Text>
          <Text style={styles.filterToggleIcon}>{filtersOpen ? "▴" : "▾"}</Text>
        </Pressable>

        {filtersOpen ? (
          <>
            <View style={styles.filterRow}>
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

            <View style={styles.filterRow}>
              {typeOptions.map((option) => (
                <Pressable
                  key={option.value || "any-type"}
                  style={[styles.radiusChip, type === option.value && styles.radiusChipActive]}
                  onPress={() => handleTypeChange(option.value)}
                >
                  <Text style={[styles.radiusChipText, type === option.value && styles.radiusChipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.filterRow}>
              {bedroomOptions.map((option) => (
                <Pressable
                  key={option.value || "any-beds"}
                  style={[styles.radiusChip, bedrooms === option.value && styles.radiusChipActive]}
                  onPress={() => handleBedroomsChange(option.value)}
                >
                  <Text style={[styles.radiusChipText, bedrooms === option.value && styles.radiusChipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.filterRow}>
              <TextInput
                style={styles.rentInput}
                value={minRent}
                onChangeText={setMinRent}
                placeholder="Min rent"
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.rentInput}
                value={maxRent}
                onChangeText={setMaxRent}
                placeholder="Max rent"
                keyboardType="number-pad"
              />
              <Pressable style={styles.nearMeButton} onPress={handleApplyPriceFilter}>
                <Text style={styles.nearMeButtonText}>Apply price</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>

      {locationError ? <Text style={styles.inlineError}>{locationError}</Text> : null}
      {saveSearchMessage ? <Text style={styles.inlineMessage}>{saveSearchMessage}</Text> : null}

      {error ? (
        <MessageView
          title="Couldn't load rentals"
          message={error}
          actionLabel="Retry"
          onAction={() => setRetryKey((key) => key + 1)}
        />
      ) : properties.length === 0 ? (
        <MessageView title="No rentals found" message="Try clearing location search or widening the radius." />
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={renderPropertyItem}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  filterToggleText: {
    ...boldText,
    fontSize: 14,
    color: colors.ink,
  },
  filterToggleIcon: {
    ...boldText,
    fontSize: 14,
    color: colors.muted,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  radiusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  rentInput: {
    ...bodyText,
    borderWidth: colors.strokeWidthSm,
    borderColor: colors.stroke,
    borderRadius: colors.radiusSm,
    paddingHorizontal: 12,
    minHeight: 44,
    minWidth: 100,
    flexGrow: 1,
    fontSize: 13,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  radiusChip: {
    borderWidth: colors.strokeWidthSm,
    borderColor: colors.stroke,
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  radiusChipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  radiusChipText: {
    ...boldText,
    fontSize: 12,
    color: colors.ink,
  },
  radiusChipTextActive: {
    color: colors.onAccent,
  },
  nearMeButton: {
    borderWidth: colors.strokeWidthSm,
    borderColor: colors.stroke,
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  nearMeButtonText: {
    ...boldText,
    fontSize: 12,
    color: colors.ink,
  },
  inlineError: {
    ...bodyText,
    color: colors.red,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  inlineMessage: {
    ...boldText,
    color: colors.green,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  list: {
    padding: 16,
    paddingTop: 4,
  },
  });
