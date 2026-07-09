import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchMyProperties } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { useSettings } from "../../context/SettingsContext.js";
import PropertyCard from "../../components/PropertyCard.js";
import { PropertyCardSkeletonList } from "../../components/PropertyCardSkeleton.js";
import MessageView from "../../components/MessageView.js";
import { useTheme } from "../../context/ThemeContext.js";

const listingManagerRoles = ["landlord", "agency"];

export default function WorkspaceScreen() {
  const navigation = useNavigation();
  const { user, signedIn } = useAuth();
  const { apiBaseUrl } = useSettings();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const canManageListings = listingManagerRoles.includes(user?.role);

  const load = useCallback(async () => {
    setError("");

    try {
      const data = await fetchMyProperties();
      setProperties(data);
    } catch (err) {
      setError(err.message || "Failed to load your workspace.");
    }
  }, []);

  useEffect(() => {
    if (!signedIn || !canManageListings) {
      return;
    }

    // Kicking off a real fetch here, not deriving avoidable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [signedIn, canManageListings, load]);

  useEffect(() => {
    // Refresh after returning from the create-listing screen, so a newly
    // created property shows up without a manual pull-to-refresh.
    const unsubscribe = navigation.addListener("focus", () => {
      if (signedIn && canManageListings) {
        load();
      }
    });

    return unsubscribe;
  }, [navigation, signedIn, canManageListings, load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!signedIn) {
    return (
      <MessageView
        title="Sign in required"
        message="Sign in to manage your property listings."
        actionLabel="Sign in"
        onAction={() => navigation.navigate("Login")}
      />
    );
  }

  if (!canManageListings) {
    return (
      <MessageView
        title="Owner or agency account required"
        message="You need a landlord or agency account to list properties."
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
      <MessageView title="Couldn't load your workspace" message={error} actionLabel="Retry" onAction={load} />
    );
  }

  if (properties.length === 0) {
    return (
      <MessageView title="No listings yet" message="Tap New listing above to add your first property." />
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={properties}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      renderItem={({ item }) => (
        <PropertyCard
          property={item}
          apiBaseUrl={apiBaseUrl}
          onPress={() =>
            navigation.navigate("Discover", { screen: "PropertyDetail", params: { propertyId: item._id } })
          }
        />
      )}
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
  });
