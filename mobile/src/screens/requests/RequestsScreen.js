import { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { fetchInquiries, fetchViewingRequests } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { RequestCardSkeletonList } from "../../components/RequestCardSkeleton.js";
import MessageView from "../../components/MessageView.js";
import { formatStatusLabel } from "../../utils/format.js";
import { useTheme } from "../../context/ThemeContext.js";
import { bodyText, boldText } from "../../theme/typography.js";

const tabs = [
  { key: "inquiries", label: "Inquiries" },
  { key: "viewings", label: "Viewings" },
];

export default function RequestsScreen() {
  const navigation = useNavigation();
  const { signedIn } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState("inquiries");
  const [inquiries, setInquiries] = useState([]);
  const [inquiriesPagination, setInquiriesPagination] = useState(null);
  const [loadingMoreInquiries, setLoadingMoreInquiries] = useState(false);
  const [viewings, setViewings] = useState([]);
  const [viewingsPagination, setViewingsPagination] = useState(null);
  const [loadingMoreViewings, setLoadingMoreViewings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Resets both tabs to page 1 and replaces their lists - used for the
  // initial load and pull-to-refresh. Loading additional pages per tab is
  // handled separately below, so switching tabs never re-fetches page 1.
  const load = useCallback(async () => {
    setError("");

    try {
      const [inquiryData, viewingData] = await Promise.all([
        fetchInquiries({ page: 1 }),
        fetchViewingRequests({ page: 1 }),
      ]);
      setInquiries(inquiryData.inquiries);
      setInquiriesPagination(inquiryData.pagination);
      setViewings(viewingData.viewingRequests);
      setViewingsPagination(viewingData.pagination);
    } catch (err) {
      setError(err.message || "Failed to load your requests.");
    }
  }, []);

  const loadMoreInquiries = useCallback(async () => {
    if (loadingMoreInquiries || !inquiriesPagination || inquiriesPagination.page >= inquiriesPagination.pages) {
      return;
    }

    setLoadingMoreInquiries(true);

    try {
      const nextPage = inquiriesPagination.page + 1;
      const { inquiries: data, pagination } = await fetchInquiries({ page: nextPage });
      setInquiries((current) => [...current, ...data]);
      setInquiriesPagination(pagination);
    } catch {
      // Best-effort - scrolling again re-triggers onEndReached.
    } finally {
      setLoadingMoreInquiries(false);
    }
  }, [loadingMoreInquiries, inquiriesPagination]);

  const loadMoreViewings = useCallback(async () => {
    if (loadingMoreViewings || !viewingsPagination || viewingsPagination.page >= viewingsPagination.pages) {
      return;
    }

    setLoadingMoreViewings(true);

    try {
      const nextPage = viewingsPagination.page + 1;
      const { viewingRequests: data, pagination } = await fetchViewingRequests({ page: nextPage });
      setViewings((current) => [...current, ...data]);
      setViewingsPagination(pagination);
    } catch {
      // Best-effort - scrolling again re-triggers onEndReached.
    } finally {
      setLoadingMoreViewings(false);
    }
  }, [loadingMoreViewings, viewingsPagination]);

  // Runs on every focus, not just the first mount - so a newly-sent inquiry
  // or viewing request (sent from PropertyDetailScreen, which navigates back
  // here rather than remounting this tab) shows up without a manual
  // pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      if (!signedIn) {
        return undefined;
      }

      let active = true;

      // Kicking off a real fetch here, not deriving avoidable state.
      setLoading(true);
      load().finally(() => {
        if (active) setLoading(false);
      });

      return () => {
        active = false;
      };
    }, [signedIn, load])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderRequestItem = useCallback(
    ({ item }) =>
      tab === "inquiries" ? <InquiryRow inquiry={item} styles={styles} /> : <ViewingRow viewing={item} styles={styles} />,
    [tab, styles]
  );

  if (!signedIn) {
    return (
      <MessageView
        title="Sign in required"
        message="Sign in to see your inquiries and viewing requests."
        actionLabel="Sign in"
        onAction={() => navigation.navigate("Login")}
      />
    );
  }

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.list}>
        <RequestCardSkeletonList />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <MessageView title="Couldn't load requests" message={error} actionLabel="Retry" onAction={load} />
    );
  }

  const data = tab === "inquiries" ? inquiries : viewings;
  const loadingMore = tab === "inquiries" ? loadingMoreInquiries : loadingMoreViewings;
  const loadMore = tab === "inquiries" ? loadMoreInquiries : loadMoreViewings;

  return (
    <View style={styles.container}>
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

      {data.length === 0 ? (
        <MessageView
          title={tab === "inquiries" ? "No inquiries yet" : "No viewing requests yet"}
          message="Requests you send from a property page will show up here."
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerSpinner} /> : null}
          renderItem={renderRequestItem}
        />
      )}
    </View>
  );
}

const InquiryRow = memo(function InquiryRow({ inquiry, styles }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>{inquiry.property?.title || "Property"}</Text>
        <StatusBadge status={inquiry.status} styles={styles} />
      </View>
      {inquiry.subject ? <Text style={styles.cardSubject}>{inquiry.subject}</Text> : null}
      <Text style={styles.cardMessage} numberOfLines={3}>{inquiry.message}</Text>
      {inquiry.response ? (
        <View style={styles.responseBox}>
          <Text style={styles.responseLabel}>Owner response</Text>
          <Text style={styles.responseText}>{inquiry.response}</Text>
        </View>
      ) : null}
    </View>
  );
});

const ViewingRow = memo(function ViewingRow({ viewing, styles }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>{viewing.property?.title || "Property"}</Text>
        <StatusBadge status={viewing.status} styles={styles} />
      </View>
      <Text style={styles.cardMessage}>
        {viewing.requestedDate
          ? `Requested for ${new Date(viewing.requestedDate).toLocaleString()}`
          : "Open viewing"}
      </Text>
      {viewing.message ? <Text style={styles.cardMessage}>{viewing.message}</Text> : null}
    </View>
  );
});

function StatusBadge({ status, styles }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{formatStatusLabel(status)}</Text>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    tabRow: {
      flexDirection: "row",
      gap: 8,
      padding: 16,
      paddingBottom: 8,
    },
    tab: {
      borderWidth: colors.strokeWidthSm,
      borderColor: colors.stroke,
      borderRadius: 999,
      paddingHorizontal: 16,
      minHeight: 44,
      justifyContent: "center",
    },
    tabActive: {
      backgroundColor: colors.green,
      borderColor: colors.green,
    },
    tabText: {
      ...boldText,
      fontSize: 13,
      color: colors.ink,
    },
    tabTextActive: {
      color: colors.onAccent,
    },
    list: {
      padding: 16,
      paddingTop: 4,
    },
    footerSpinner: {
      marginVertical: 16,
    },
    card: {
      ...colors.shadowSm,
      backgroundColor: colors.surface,
      borderWidth: colors.strokeWidthSm,
      borderColor: colors.stroke,
      borderRadius: colors.radius,
      padding: 14,
      gap: 6,
      marginBottom: 12,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    cardTitle: {
      ...boldText,
      fontSize: 15,
      color: colors.ink,
      flexShrink: 1,
    },
    cardSubject: {
      ...boldText,
      fontSize: 13,
      color: colors.green,
    },
    cardMessage: {
      ...bodyText,
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
      ...boldText,
      fontSize: 11,
      color: colors.green,
    },
    responseBox: {
      marginTop: 4,
      backgroundColor: colors.surfaceSoft,
      borderRadius: colors.radiusSm,
      padding: 10,
      gap: 2,
    },
    responseLabel: {
      ...boldText,
      fontSize: 11,
      color: colors.muted,
      textTransform: "uppercase",
    },
    responseText: {
      ...bodyText,
      fontSize: 13,
      color: colors.ink,
    },
  });
