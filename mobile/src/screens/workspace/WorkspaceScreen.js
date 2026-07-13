import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet } from "react-native";
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
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const canManageListings = listingManagerRoles.includes(user?.role);

  // Resets to page 1 and replaces the list - used for the initial load,
  // pull-to-refresh, and the focus-refresh below. Appending additional pages
  // is handled separately by loadMore, so a newly created listing (which
  // sorts first) is never hidden behind stale later pages.
  const load = useCallback(async () => {
    setError("");

    try {
      const { properties: data, pagination: paginationData } = await fetchMyProperties({ page: 1 });
      setProperties(data);
      setPagination(paginationData);
    } catch (err) {
      setError(err.message || "Failed to load your workspace.");
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !pagination || pagination.page >= pagination.pages) {
      return;
    }

    setLoadingMore(true);

    try {
      const nextPage = pagination.page + 1;
      const { properties: data, pagination: paginationData } = await fetchMyProperties({ page: nextPage });
      setProperties((current) => [...current, ...data]);
      setPagination(paginationData);
    } catch {
      // Best-effort - scrolling again re-triggers onEndReached, so a quiet
      // failure here just means the next page didn't load this time.
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, pagination]);

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
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerSpinner} /> : null}
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
  footerSpinner: {
    marginVertical: 16,
  },
  });
