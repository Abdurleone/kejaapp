import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchAdminReviews, fetchAdminUsers } from "../../api/index.js";
import { useTheme } from "../../context/ThemeContext.js";
import { formatStatusLabel } from "../../utils/format.js";
import MessageView from "../../components/MessageView.js";

const roleFilters = [
  { value: "", label: "All roles" },
  { value: "tenant", label: "Tenant" },
  { value: "landlord", label: "Landlord" },
  { value: "agency", label: "Agency" },
  { value: "admin", label: "Admin" },
];

const tabs = [
  { key: "users", label: "Users" },
  { key: "reviews", label: "Reviews" },
];

function UserRow({ user, onPress, styles }) {
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
}

// Read-only by design - review moderation isn't offered anywhere in this
// app (see docs/terms-of-service.md), so there are no action affordances
// here, matching the web admin console's reviews segment.
function ReviewRow({ review, styles }) {
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
    </View>
  );
}

function UsersSegment({ styles }) {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  const load = useCallback(async () => {
    setError("");

    try {
      const { users: data, pagination: paginationData } = await fetchAdminUsers({
        page: 1,
        search: search || undefined,
        role: role || undefined,
      });
      setUsers(data);
      setPagination(paginationData);
    } catch (err) {
      setError(err.message || "Failed to load users.");
    }
  }, [search, role]);

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

  return (
    <View style={styles.flex}>
      <TextInput
        style={styles.input}
        value={search}
        onChangeText={setSearch}
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
        <MessageView title="Couldn't load users" message={error} actionLabel="Retry" onAction={load} />
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
          renderItem={({ item }) => (
            <UserRow
              user={item}
              styles={styles}
              onPress={() => navigation.navigate("AdminUserDetail", { userId: item._id })}
            />
          )}
        />
      )}
    </View>
  );
}

function ReviewsSegment({ styles }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");

    try {
      const data = await fetchAdminReviews();
      setReviews(data);
    } catch (err) {
      setError(err.message || "Failed to load reviews.");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.cardMessage}>Loading reviews...</Text>
      </ScrollView>
    );
  }

  if (error) {
    return <MessageView title="Couldn't load reviews" message={error} actionLabel="Retry" onAction={load} />;
  }

  if (reviews.length === 0) {
    return <MessageView title="No reviews yet" message="Reviews tenants leave on listings will show up here." />;
  }

  return (
    <FlatList
      data={reviews}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      renderItem={({ item }) => <ReviewRow review={item} styles={styles} />}
    />
  );
}

export default function AdminScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
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
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
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
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    filterChipActive: {
      backgroundColor: colors.greenDark,
      borderColor: colors.greenDark,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.ink,
    },
    filterChipTextActive: {
      color: colors.white,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
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
      fontSize: 15,
      fontWeight: "700",
      color: colors.ink,
      flexShrink: 1,
    },
    cardSubtitle: {
      fontSize: 13,
      color: colors.muted,
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
  });
