import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchMyProperties, fetchReceivedInquiries, respondToInquiry } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { useSettings } from "../../context/SettingsContext.js";
import PropertyCard from "../../components/PropertyCard.js";
import { PropertyCardSkeletonList } from "../../components/PropertyCardSkeleton.js";
import MessageView from "../../components/MessageView.js";
import { formatStatusLabel } from "../../utils/format.js";
import { useTheme } from "../../context/ThemeContext.js";

const listingManagerRoles = ["landlord", "agency"];

const tabs = [
  { key: "listings", label: "Listings" },
  { key: "inquiries", label: "Inquiries" },
];

function InquiryRow({ inquiry, onResponded, styles }) {
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleAction = async (status) => {
    setError("");
    setBusy(true);

    try {
      const updated = await respondToInquiry(inquiry._id, { status, response: response.trim() });
      onResponded(updated);
    } catch (err) {
      setError(err.message || "Could not update this inquiry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>{inquiry.property?.title || "Property"}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{formatStatusLabel(inquiry.status)}</Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>From {inquiry.sender?.name || "Tenant"}</Text>
      {inquiry.subject ? <Text style={styles.cardSubject}>{inquiry.subject}</Text> : null}
      <Text style={styles.cardMessage}>{inquiry.message}</Text>

      {inquiry.response ? (
        <View style={styles.responseBox}>
          <Text style={styles.responseLabel}>Your response</Text>
          <Text style={styles.responseText}>{inquiry.response}</Text>
        </View>
      ) : null}

      {inquiry.status === "open" ? (
        <>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={response}
            onChangeText={setResponse}
            placeholder="Write a response (optional)"
            multiline
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actionsRow}>
            <Pressable style={styles.primaryButton} disabled={busy} onPress={() => handleAction("responded")}>
              <Text style={styles.primaryButtonText}>Send response</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} disabled={busy} onPress={() => handleAction("closed")}>
              <Text style={styles.secondaryButtonText}>Close</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

export default function WorkspaceScreen() {
  const navigation = useNavigation();
  const { user, signedIn } = useAuth();
  const { apiBaseUrl } = useSettings();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [tab, setTab] = useState("listings");

  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [inquiries, setInquiries] = useState([]);
  const [inquiriesPagination, setInquiriesPagination] = useState(null);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);
  const [inquiriesRefreshing, setInquiriesRefreshing] = useState(false);
  const [loadingMoreInquiries, setLoadingMoreInquiries] = useState(false);
  const [inquiriesError, setInquiriesError] = useState("");

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

  const loadInquiries = useCallback(async () => {
    setInquiriesError("");

    try {
      const { inquiries: data, pagination: paginationData } = await fetchReceivedInquiries({ page: 1 });
      setInquiries(data);
      setInquiriesPagination(paginationData);
    } catch (err) {
      setInquiriesError(err.message || "Failed to load received inquiries.");
    }
  }, []);

  const loadMoreInquiries = useCallback(async () => {
    if (loadingMoreInquiries || !inquiriesPagination || inquiriesPagination.page >= inquiriesPagination.pages) {
      return;
    }

    setLoadingMoreInquiries(true);

    try {
      const nextPage = inquiriesPagination.page + 1;
      const { inquiries: data, pagination } = await fetchReceivedInquiries({ page: nextPage });
      setInquiries((current) => [...current, ...data]);
      setInquiriesPagination(pagination);
    } catch {
      // Best-effort - scrolling again re-triggers onEndReached.
    } finally {
      setLoadingMoreInquiries(false);
    }
  }, [loadingMoreInquiries, inquiriesPagination]);

  useEffect(() => {
    if (!signedIn || !canManageListings) {
      return;
    }

    // Kicking off real fetches here, not deriving avoidable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInquiriesLoading(true);
    loadInquiries().finally(() => setInquiriesLoading(false));
  }, [signedIn, canManageListings, load, loadInquiries]);

  useEffect(() => {
    // Refresh after returning from the create/edit-listing screens, so
    // changes show up without a manual pull-to-refresh.
    const unsubscribe = navigation.addListener("focus", () => {
      if (signedIn && canManageListings) {
        load();
        loadInquiries();
      }
    });

    return unsubscribe;
  }, [navigation, signedIn, canManageListings, load, loadInquiries]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleInquiriesRefresh = async () => {
    setInquiriesRefreshing(true);
    await loadInquiries();
    setInquiriesRefreshing(false);
  };

  const handleInquiryResponded = (updated) => {
    setInquiries((current) => current.map((item) => (item._id === updated._id ? updated : item)));
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

  return (
    <View style={styles.flex}>
      <View style={styles.tabRow}>
        {tabs.map((option) => (
          <Pressable
            key={option.key}
            style={[styles.tab, tab === option.key && styles.tabActive]}
            onPress={() => setTab(option.key)}
          >
            <Text style={[styles.tabText, tab === option.key && styles.tabTextActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "listings" ? (
        loading ? (
          <ScrollView style={styles.container} contentContainerStyle={styles.list}>
            <PropertyCardSkeletonList />
          </ScrollView>
        ) : error ? (
          <MessageView title="Couldn't load your workspace" message={error} actionLabel="Retry" onAction={load} />
        ) : properties.length === 0 ? (
          <MessageView title="No listings yet" message="Tap New listing above to add your first property." />
        ) : (
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
                onPress={() => navigation.navigate("PropertyEdit", { propertyId: item._id })}
              />
            )}
          />
        )
      ) : inquiriesLoading ? (
        <ScrollView style={styles.container} contentContainerStyle={styles.list}>
          <Text style={styles.cardMessage}>Loading inquiries...</Text>
        </ScrollView>
      ) : inquiriesError ? (
        <MessageView
          title="Couldn't load inquiries"
          message={inquiriesError}
          actionLabel="Retry"
          onAction={loadInquiries}
        />
      ) : inquiries.length === 0 ? (
        <MessageView
          title="No inquiries yet"
          message="Inquiries tenants send about your listings will show up here."
        />
      ) : (
        <FlatList
          style={styles.container}
          data={inquiries}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={inquiriesRefreshing} onRefresh={handleInquiriesRefresh} />}
          onEndReached={loadMoreInquiries}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMoreInquiries ? <ActivityIndicator style={styles.footerSpinner} /> : null}
          renderItem={({ item }) => (
            <InquiryRow inquiry={item} onResponded={handleInquiryResponded} styles={styles} />
          )}
        />
      )}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.bg,
    },
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
    tabRow: {
      flexDirection: "row",
      gap: 8,
      padding: 16,
      paddingBottom: 8,
    },
    tab: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    tabActive: {
      backgroundColor: colors.greenDark,
      borderColor: colors.greenDark,
    },
    tabText: {
      fontWeight: "700",
      fontSize: 13,
      color: colors.ink,
    },
    tabTextActive: {
      color: colors.white,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      padding: 14,
      gap: 8,
      marginBottom: 12,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.ink,
      flexShrink: 1,
    },
    cardSubtitle: {
      fontSize: 13,
      color: colors.muted,
    },
    cardSubject: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.greenDark,
    },
    cardMessage: {
      fontSize: 13,
      color: colors.ink,
    },
    badge: {
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.greenDark,
    },
    responseBox: {
      marginTop: 4,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 8,
      padding: 10,
      gap: 2,
    },
    responseLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.muted,
      textTransform: "uppercase",
    },
    responseText: {
      fontSize: 13,
      color: colors.ink,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      backgroundColor: colors.surface,
      color: colors.ink,
    },
    textArea: {
      minHeight: 60,
      textAlignVertical: "top",
    },
    error: {
      color: colors.red,
      fontSize: 13,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 8,
    },
    primaryButton: {
      backgroundColor: colors.greenDark,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
      flex: 1,
    },
    primaryButtonText: {
      color: colors.white,
      fontWeight: "800",
      fontSize: 13,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: colors.surface,
      flex: 1,
    },
    secondaryButtonText: {
      color: colors.ink,
      fontWeight: "700",
      fontSize: 13,
    },
  });
