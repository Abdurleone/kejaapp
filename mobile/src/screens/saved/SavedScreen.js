import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchFavorites, removeFavorite } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { useSettings } from "../../context/SettingsContext.js";
import PropertyCard from "../../components/PropertyCard.js";
import { PropertyCardSkeletonList } from "../../components/PropertyCardSkeleton.js";
import MessageView from "../../components/MessageView.js";
import { useTheme } from "../../context/ThemeContext.js";

export default function SavedScreen() {
  const navigation = useNavigation();
  const { signedIn } = useAuth();
  const { apiBaseUrl } = useSettings();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);

  const load = useCallback(async () => {
    setError("");

    try {
      const data = await fetchFavorites();
      setFavorites(data);
    } catch (err) {
      setError(err.message || "Failed to load saved listings.");
    }
  }, []);

  useEffect(() => {
    if (!signedIn) {
      return;
    }

    // Kicking off a real fetch here, not deriving avoidable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [signedIn, load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleRemove = async (propertyId) => {
    setRemovingId(propertyId);

    try {
      await removeFavorite(propertyId);
      setFavorites((current) =>
        current.filter((favorite) => (favorite.property?._id || favorite._id) !== propertyId)
      );
    } catch {
      // Leave it in the list; user can retry.
    } finally {
      setRemovingId(null);
    }
  };

  if (!signedIn) {
    return (
      <MessageView
        title="Sign in required"
        message="Sign in to see your saved rentals."
        actionLabel="Sign in"
        onAction={() => navigation.navigate("Login")}
      />
    );
  }

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.list}>
        <PropertyCardSkeletonList />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <MessageView title="Couldn't load saved listings" message={error} actionLabel="Retry" onAction={load} />
    );
  }

  if (favorites.length === 0) {
    return (
      <MessageView
        title="No saved listings yet"
        message="Explore properties in Discover to add your favorites."
      />
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={favorites}
      keyExtractor={(item) => item.property?._id || item._id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      renderItem={({ item }) => {
        const property = item.property || item;
        const propertyId = property._id || property.id;

        return (
          <View>
            <PropertyCard
              property={property}
              apiBaseUrl={apiBaseUrl}
              onPress={() => navigation.navigate("Discover", { screen: "PropertyDetail", params: { propertyId } })}
            />
            <Pressable
              style={styles.removeButton}
              onPress={() => handleRemove(propertyId)}
              disabled={removingId === propertyId}
            >
              <Text style={styles.removeButtonText}>
                {removingId === propertyId ? "Removing..." : "Remove from saved"}
              </Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  list: {
    padding: 16,
  },
  removeButton: {
    marginTop: -8,
    marginBottom: 16,
    alignSelf: "flex-start",
    paddingHorizontal: 4,
  },
  removeButtonText: {
    color: colors.red,
    fontWeight: "700",
    fontSize: 13,
  },
  });
