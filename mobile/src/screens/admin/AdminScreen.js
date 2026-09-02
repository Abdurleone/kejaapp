import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  dismissReviewReport,
  fetchAdminReviews,
  fetchAdminUsers,
  fetchReportedReviews,
  hideReview,
} from "../../api/index.js";
import { useTheme } from "../../context/ThemeContext.js";
import { bodyText, boldText } from "../../theme/typography.js";
import { formatStatusLabel } from "../../utils/format.js";
import MessageView from "../../components/MessageView.js";

const roleFilters = [
  { value: "", label: "All roles" },
  { value: "tenant", label: "Tenant" },
  { value: "landlord", label: "Landlord" },
  { value: "agency", label: "Agency" },
  { value: "mover", label: "Mover" },
  { value: "admin", label: "Admin" },
];

const tabs = [
  { key: "users", label: "Users" },
  { key: "reviews", label: "Reviews" },
];

const UserRow = memo(function UserRow({ user, onPress, styles }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>{user.name || "Unnamed"}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{formatStatusLabel(user.accountStatus || "active")}</Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>{user.email}</Text>
      <Text style={styles.cardMessage}>{formatStatusLabel(user.role)}</Text>
    </Pressable>
  );
});

// Mostly read-only by design - review moderation isn't offered for the
// general case (see docs/compliance/code-of-ethics.md). The one narrow
// exception is the Reported sub-tab below: an admin can hide (never delete)
// a review only after a report against it was actually upheld, matching the
// web admin console's reviews segment.
const ReviewRow = memo(function ReviewRow({ review, reported, onHide, onDismiss, actioning, styles }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>{review.property?.title || "Property"}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{review.rating} / 5</Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>By {review.user?.name || "Tenant"}</Text>
      {review.comment ? <Text style={styles.cardMessage}>{review.comment}</Text> : null}
      {review.ownerResponse?.message ? (
        <View style={styles.responseBox}>
          <Text style={styles.responseLabel}>Owner response</Text>
          <Text style={styles.responseText}>{review.ownerResponse.message}</Text>
        </View>
      ) : null}
      {reported ? (
        <>
          <View style={styles.responseBox}>
            <Text style={styles.responseLabel}>Report reason</Text>
            <Text style={styles.responseText}>{review.report?.reason || "-"}</Text>
            <Text style={styles.cardSubtitle}>Reported by {review.report?.reportedBy?.name || "someone"}</Text>
          </View>
          <View style={styles.filterRow}>
            <Pressable style={styles.secondaryButton} onPress={() => onHide(review._id)} disabled={actioning}>
              <Text style={styles.secondaryButtonText}>Hide</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => onDismiss(review._id)} disabled={actioning}>
              <Text style={styles.secondaryButtonText}>Dismiss</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
});

function UsersSegment({ styles }) {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  // Debounce the raw text input into `search` so typing doesn't fire a
  // request per keystroke - mirrors the debounce mobile's MoversScreen
  // county filter already uses.
  useEffect(() => {
    let active = true;

    const timeoutId = setTimeout(() => {
      if (!active) return;
      setSearch((current) => (current === searchInput ? current : searchInput));
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [searchInput]);

  // Deriving the fetch from search/role/retryKey (rather than a shared
  // `load` callback fired ad hoc from an effect, refresh, and retry) is what
  // makes the active-flag guard work: React runs this effect's cleanup
  // before the next one fires whenever search/role/retryKey changes, so a
  // still-in-flight, now-stale request - e.g. an out-of-order response to an
  // earlier keystroke - can never overwrite a newer one.
  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const { users: data, pagination: paginationData } = await fetchAdminUsers({
          page: 1,
          search: search || undefined,
          role: role || undefined,
        });
        if (active) {
          setUsers(data);
          setPagination(paginationData);
        }
      } catch (err) {
        if (active) setError(err.message || "Failed to load users.");
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [search, role, retryKey]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !pagination || pagination.page >= pagination.pages) {
      return;
    }

    setLoadingMore(true);

    try {
      const nextPage = pagination.page + 1;
      const { users: data, pagination: paginationData } = await fetchAdminUsers({
        page: nextPage,
        search: search || undefined,
        role: role || undefined,
      });
      setUsers((current) => [...current, ...data]);
      setPagination(paginationData);
    } catch {
      // Best-effort - scrolling again re-triggers onEndReached.
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, pagination, search, role]);

  const handleRefresh = () => {
    setRefreshing(true);
    setRetryKey((key) => key + 1);
  };

  const handleRetry = () => {
    setRetryKey((key) => key + 1);
  };

  const renderUserItem = useCallback(
    ({ item }) => (
      <UserRow user={item} styles={styles} onPress={() => navigation.navigate("AdminUserDetail", { userId: item._id })} />
    ),
    [styles, navigation]
  );

  return (
    <View style={styles.flex}>
      <TextInput
        style={styles.input}
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder="Search by name, email, or phone"
      />
      <View style={styles.filterRow}>
        {roleFilters.map((option) => (
          <Pressable
            key={option.value || "all"}
            style={[styles.filterChip, role === option.value && styles.filterChipActive]}
            onPress={() => setRole(option.value)}
          >
            <Text style={[styles.filterChipText, role === option.value && styles.filterChipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.cardMessage}>Loading users...</Text>
        </ScrollView>
      ) : error ? (
        <MessageView title="Couldn't load users" message={error} actionLabel="Retry" onAction={handleRetry} />
      ) : users.length === 0 ? (
        <MessageView title="No users match this search" message="Try a different search or role filter." />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          renderItem={renderUserItem}
        />
      )}
    </View>
  );
}

function ReviewsSegment({ styles }) {
  const [reviewFilter, setReviewFilter] = useState("all");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setError("");

    try {
      const data = reviewFilter === "reported" ? await fetchReportedReviews() : await fetchAdminReviews();
      setReviews(data);
    } catch (err) {
      setError(err.message || "Failed to load reviews.");
    }
  }, [reviewFilter]);

  useEffect(() => {
    // Kicking off a real fetch here, not deriving avoidable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleHide = useCallback(async (reviewId) => {
    setActionError("");
    setActioningId(reviewId);

    try {
      await hideReview(reviewId);
      setReviews((current) => current.filter((review) => review._id !== reviewId));
    } catch (err) {
      setActionError(err.message || "Could not hide this review.");
    } finally {
      setActioningId(null);
    }
  }, []);

  const handleDismiss = useCallback(async (reviewId) => {
    setActionError("");
    setActioningId(reviewId);

    try {
      await dismissReviewReport(reviewId);
      setReviews((current) => current.filter((review) => review._id !== reviewId));
    } catch (err) {
      setActionError(err.message || "Could not dismiss this report.");
    } finally {
      setActioningId(null);
    }
  }, []);

  const renderReviewItem = useCallback(
    ({ item }) => (
      <ReviewRow
        review={item}
        reported={reviewFilter === "reported"}
        onHide={handleHide}
        onDismiss={handleDismiss}
        actioning={actioningId === item._id}
        styles={styles}
      />
    ),
    [styles, reviewFilter, handleHide, handleDismiss, actioningId]
  );

  return (
    <View style={styles.flex}>
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterChip, reviewFilter === "all" && styles.filterChipActive]}
          onPress={() => setReviewFilter("all")}
        >
          <Text style={[styles.filterChipText, reviewFilter === "all" && styles.filterChipTextActive]}>
            All reviews
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, reviewFilter === "reported" && styles.filterChipActive]}
          onPress={() => setReviewFilter("reported")}
        >
          <Text style={[styles.filterChipText, reviewFilter === "reported" && styles.filterChipTextActive]}>
            Reported
          </Text>
        </Pressable>
      </View>

      {actionError ? <Text style={styles.cardMessage}>{actionError}</Text> : null}

      {loading ? (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.cardMessage}>Loading reviews...</Text>
        </ScrollView>
      ) : error ? (
        <MessageView title="Couldn't load reviews" message={error} actionLabel="Retry" onAction={load} />
      ) : reviews.length === 0 ? (
        <MessageView
          title={reviewFilter === "reported" ? "No reported reviews" : "No reviews yet"}
          message={
            reviewFilter === "reported"
              ? "Reviews tenants report will show up here."
              : "Reviews tenants leave on listings will show up here."
          }
        />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={renderReviewItem}
        />
      )}
    </View>
  );
}

export default function AdminScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState("users");

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

      {tab === "users" ? <UsersSegment styles={styles} /> : <ReviewsSegment styles={styles} />}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    list: {
      padding: 16,
      paddingTop: 8,
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
      paddingVertical: 8,
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
    input: {
      ...bodyText,
      borderWidth: colors.strokeWidthSm,
      borderColor: colors.stroke,
      borderRadius: colors.radiusSm,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      backgroundColor: colors.surface,
      color: colors.ink,
      marginHorizontal: 16,
    },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    filterChip: {
      borderWidth: colors.strokeWidthSm,
      borderColor: colors.stroke,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    filterChipActive: {
      backgroundColor: colors.green,
      borderColor: colors.green,
    },
    filterChipText: {
      ...boldText,
      fontSize: 12,
      color: colors.ink,
    },
    filterChipTextActive: {
      color: colors.onAccent,
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
    cardSubtitle: {
      ...bodyText,
      fontSize: 13,
      color: colors.muted,
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
    secondaryButton: {
      borderWidth: colors.strokeWidthSm,
      borderColor: colors.green,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    secondaryButtonText: {
      ...boldText,
      color: colors.green,
      fontSize: 13,
    },
  });
