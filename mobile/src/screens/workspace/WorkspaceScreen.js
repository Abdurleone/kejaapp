import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  fetchMyProperties,
  fetchReceivedInquiries,
  fetchReceivedViewingRequests,
  respondToInquiry,
  updateViewingRequestStatus,
} from "../../api/index.js";
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
  { key: "viewingRequests", label: "Viewing requests" },
];

const InquiryRow = memo(function InquiryRow({ inquiry, onResponded, styles, isHighlighted }) {
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
    <View style={[styles.card, isHighlighted && styles.cardHighlighted]}>
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
});

const ViewingRequestRow = memo(function ViewingRequestRow({ viewingRequest, onResponded, styles, isHighlighted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleAction = async (status) => {
    setError("");
    setBusy(true);

    try {
      const updated = await updateViewingRequestStatus(viewingRequest._id, { status });
      onResponded(updated);
    } catch (err) {
      setError(err.message || "Could not update this viewing request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, isHighlighted && styles.cardHighlighted]}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>{viewingRequest.property?.title || "Property"}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{formatStatusLabel(viewingRequest.status)}</Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>From {viewingRequest.requester?.name || "Tenant"}</Text>
      {viewingRequest.requestedDate ? (
        <Text style={styles.cardMessage}>
          Requested date: {new Date(viewingRequest.requestedDate).toLocaleDateString()}
        </Text>
      ) : null}
      {viewingRequest.message ? <Text style={styles.cardMessage}>{viewingRequest.message}</Text> : null}

      {viewingRequest.status === "pending" ? (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actionsRow}>
            <Pressable style={styles.primaryButton} disabled={busy} onPress={() => handleAction("approved")}>
              <Text style={styles.primaryButtonText}>Approve</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} disabled={busy} onPress={() => handleAction("rejected")}>
              <Text style={styles.secondaryButtonText}>Reject</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
});

export default function WorkspaceScreen({ route }) {
  const navigation = useNavigation();
  const { user, signedIn } = useAuth();
  const { apiBaseUrl } = useSettings();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const highlightId = route?.params?.highlightId;
  const initialTab = route?.params?.initialTab;
  const [manualTab, setManualTab] = useState("listings");
  const [dismissedHighlightId, setDismissedHighlightId] = useState(null);
  const activeHighlightId = highlightId && highlightId !== dismissedHighlightId ? highlightId : null;
  // A fresh, unconsumed nav-triggered highlight overrides whichever tab the
  // user was last sitting on - manually switching tabs (below) or the 5s
  // auto-clear (further below) both hand control back to manualTab.
  const tab = activeHighlightId && initialTab ? initialTab : manualTab;

  useEffect(() => {
    if (!highlightId) return undefined;

    const timer = setTimeout(() => setDismissedHighlightId(highlightId), 5000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const handleTabPress = (key) => {
    setManualTab(key);
    if (highlightId) setDismissedHighlightId(highlightId);
  };

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

  const [viewingRequests, setViewingRequests] = useState([]);
  const [viewingRequestsPagination, setViewingRequestsPagination] = useState(null);
  const [viewingRequestsLoading, setViewingRequestsLoading] = useState(true);
  const [viewingRequestsRefreshing, setViewingRequestsRefreshing] = useState(false);
  const [loadingMoreViewingRequests, setLoadingMoreViewingRequests] = useState(false);
  const [viewingRequestsError, setViewingRequestsError] = useState("");

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

  const loadViewingRequests = useCallback(async () => {
    setViewingRequestsError("");

    try {
      const { viewingRequests: data, pagination: paginationData } = await fetchReceivedViewingRequests({
        page: 1,
      });
      setViewingRequests(data);
      setViewingRequestsPagination(paginationData);
    } catch (err) {
      setViewingRequestsError(err.message || "Failed to load viewing requests.");
    }
  }, []);

  const loadMoreViewingRequests = useCallback(async () => {
    if (
      loadingMoreViewingRequests ||
      !viewingRequestsPagination ||
      viewingRequestsPagination.page >= viewingRequestsPagination.pages
    ) {
      return;
    }

    setLoadingMoreViewingRequests(true);

    try {
      const nextPage = viewingRequestsPagination.page + 1;
      const { viewingRequests: data, pagination } = await fetchReceivedViewingRequests({ page: nextPage });
      setViewingRequests((current) => [...current, ...data]);
      setViewingRequestsPagination(pagination);
    } catch {
      // Best-effort - scrolling again re-triggers onEndReached.
    } finally {
      setLoadingMoreViewingRequests(false);
    }
  }, [loadingMoreViewingRequests, viewingRequestsPagination]);

  // Runs on every focus - not just the first mount - so returning from the
  // create/edit-listing screens refreshes without a manual pull-to-refresh.
  // React Navigation fires "focus" for the initial mount too, so this single
  // effect covers both; a separate mount-only effect alongside this one used
  // to double-fetch every time the screen first mounted (4 concurrent
  // requests instead of 2).
  useFocusEffect(
    useCallback(() => {
      if (!signedIn || !canManageListings) {
        return undefined;
      }

      let active = true;

      // Kicking off real fetches here, not deriving avoidable state.
      setLoading(true);
      load().finally(() => {
        if (active) setLoading(false);
      });
      setInquiriesLoading(true);
      loadInquiries().finally(() => {
        if (active) setInquiriesLoading(false);
      });
      setViewingRequestsLoading(true);
      loadViewingRequests().finally(() => {
        if (active) setViewingRequestsLoading(false);
      });

      return () => {
        active = false;
      };
    }, [signedIn, canManageListings, load, loadInquiries, loadViewingRequests]),
  );

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

  const handleInquiryResponded = useCallback((updated) => {
    setInquiries((current) => current.map((item) => (item._id === updated._id ? updated : item)));
  }, []);

  const handleViewingRequestsRefresh = async () => {
    setViewingRequestsRefreshing(true);
    await loadViewingRequests();
    setViewingRequestsRefreshing(false);
  };

  const handleViewingRequestResponded = useCallback((updated) => {
    setViewingRequests((current) => current.map((item) => (item._id === updated._id ? updated : item)));
  }, []);

  const renderPropertyItem = useCallback(
    ({ item }) => (
      <PropertyCard
        property={item}
        apiBaseUrl={apiBaseUrl}
        onPress={() => navigation.navigate("PropertyEdit", { propertyId: item._id })}
      />
    ),
    [apiBaseUrl, navigation]
  );

  const renderInquiryItem = useCallback(
    ({ item }) => (
      <InquiryRow
        inquiry={item}
        onResponded={handleInquiryResponded}
        styles={styles}
        isHighlighted={item._id === activeHighlightId}
      />
    ),
    [handleInquiryResponded, styles, activeHighlightId]
  );

  const renderViewingRequestItem = useCallback(
    ({ item }) => (
      <ViewingRequestRow
        viewingRequest={item}
        onResponded={handleViewingRequestResponded}
        styles={styles}
        isHighlighted={item._id === activeHighlightId}
      />
    ),
    [handleViewingRequestResponded, styles, activeHighlightId]
  );

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
            onPress={() => handleTabPress(option.key)}
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
            renderItem={renderPropertyItem}
          />
        )
      ) : tab === "inquiries" ? (
        inquiriesLoading ? (
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
            renderItem={renderInquiryItem}
          />
        )
      ) : viewingRequestsLoading ? (
        <ScrollView style={styles.container} contentContainerStyle={styles.list}>
          <Text style={styles.cardMessage}>Loading viewing requests...</Text>
        </ScrollView>
      ) : viewingRequestsError ? (
        <MessageView
          title="Couldn't load viewing requests"
          message={viewingRequestsError}
          actionLabel="Retry"
          onAction={loadViewingRequests}
        />
      ) : viewingRequests.length === 0 ? (
        <MessageView
          title="No viewing requests yet"
          message="Viewing requests tenants send about your listings will show up here."
        />
      ) : (
        <FlatList
          style={styles.container}
          data={viewingRequests}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={viewingRequestsRefreshing} onRefresh={handleViewingRequestsRefresh} />
          }
          onEndReached={loadMoreViewingRequests}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMoreViewingRequests ? <ActivityIndicator style={styles.footerSpinner} /> : null}
          renderItem={renderViewingRequestItem}
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
    cardHighlighted: {
      borderColor: colors.greenDark,
      borderWidth: 2,
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
