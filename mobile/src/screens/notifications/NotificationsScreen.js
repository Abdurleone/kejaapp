import { memo, useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { FeedbackCardSkeletonList } from "../../components/FeedbackCardSkeleton.js";
import MessageView from "../../components/MessageView.js";
import { useTheme } from "../../context/ThemeContext.js";

// Only wired up for the actionable recipient of a request - the mover
// opening a mover_request notification, or the property owner opening a
// viewing/inquiry notification. The other side (e.g. a tenant being told
// their viewing was approved) has no "my sent requests" tracking screen to
// land on yet, so those notifications stay read-only for now. Mirrors the
// web equivalent in frontend/src/pages/NotificationsPage.jsx.
export const resolveNotificationTarget = (notification, role) => {
  if (notification.type === "mover_request" && role === "mover") {
    return { tab: "Movers", screen: "MoversList", params: { highlightId: notification.data?.moverRequest } };
  }

  if (notification.type === "viewing" && (role === "landlord" || role === "agency")) {
    return {
      tab: "Workspace",
      screen: "WorkspaceList",
      params: { highlightId: notification.data?.viewingRequest, initialTab: "viewingRequests" },
    };
  }

  if (notification.type === "inquiry" && (role === "landlord" || role === "agency")) {
    return {
      tab: "Workspace",
      screen: "WorkspaceList",
      params: { highlightId: notification.data?.inquiry, initialTab: "inquiries" },
    };
  }

  return null;
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { signedIn, user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setError("");

    try {
      const data = await fetchNotifications(unreadOnly ? { unread: "true" } : {});
      setNotifications(data);
    } catch (err) {
      setError(err.message || "Failed to load notifications.");
    }
  }, [unreadOnly]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Runs on every time this tab becomes focused - not just the first mount
  // - so a notification that arrived while the user was elsewhere actually
  // shows up here instead of the list staying stuck on whatever it looked
  // like the *first* time this screen mounted. Read state is never changed
  // here - only via explicit user action (per-item or "Mark all as read")
  // - otherwise a notification seen-but-not-clicked on one visit would
  // silently show as already read the next time this effect re-runs.
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
    }, [signedIn, load]),
  );

  const handleMarkAllRead = async () => {
    setMarkingAll(true);

    try {
      await markAllNotificationsAsRead();
      setNotifications((current) => (unreadOnly ? [] : current.map((item) => ({ ...item, isRead: true }))));
    } catch (err) {
      setError(err.message || "Could not mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = useCallback(
    async (notificationId) => {
      setMarkingId(notificationId);

      try {
        const updated = await markNotificationAsRead(notificationId);
        setNotifications((current) =>
          unreadOnly
            ? current.filter((item) => item._id !== notificationId)
            : current.map((item) => (item._id === notificationId ? updated : item)),
        );
      } catch (err) {
        setError(err.message || "Could not mark this notification as read.");
      } finally {
        setMarkingId(null);
      }
    },
    [unreadOnly]
  );

  const handleOpenNotification = useCallback(
    (notification, target) => {
      if (!notification.isRead) {
        handleMarkRead(notification._id);
      }
      navigation.navigate(target.tab, { screen: target.screen, params: target.params });
    },
    [handleMarkRead, navigation]
  );

  const renderNotificationItem = useCallback(
    ({ item }) => {
      const target = resolveNotificationTarget(item, user?.role);
      return (
        <NotificationRow
          notification={item}
          marking={markingId === item._id}
          onMarkRead={handleMarkRead}
          onOpen={target ? () => handleOpenNotification(item, target) : undefined}
          styles={styles}
        />
      );
    },
    [markingId, handleMarkRead, handleOpenNotification, user, styles]
  );

  if (!signedIn) {
    return (
      <MessageView
        title="Sign in required"
        message="Sign in to see your notifications."
        actionLabel="Sign in"
        onAction={() => navigation.navigate("Login")}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <FeedbackCardSkeletonList />
      </View>
    );
  }

  if (error) {
    return <MessageView title="Couldn't load notifications" message={error} actionLabel="Retry" onAction={load} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterButton, !unreadOnly && styles.filterButtonActive]}
          onPress={() => setUnreadOnly(false)}
        >
          <Text style={[styles.filterButtonText, !unreadOnly && styles.filterButtonTextActive]}>All</Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, unreadOnly && styles.filterButtonActive]}
          onPress={() => setUnreadOnly(true)}
        >
          <Text style={[styles.filterButtonText, unreadOnly && styles.filterButtonTextActive]}>Unread</Text>
        </Pressable>
        {notifications.some((item) => !item.isRead) ? (
          <Pressable style={styles.filterButton} disabled={markingAll} onPress={handleMarkAllRead}>
            <Text style={styles.filterButtonText}>{markingAll ? "Marking..." : "Mark all as read"}</Text>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {unreadOnly ? "No unread notifications." : "You don't have any notifications yet."}
          </Text>
        }
        renderItem={renderNotificationItem}
      />
    </View>
  );
}

const NotificationRow = memo(function NotificationRow({ notification, marking, onMarkRead, onOpen, styles }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {notification.title}
        </Text>
        {!notification.isRead ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>New</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.cardMessage}>{notification.message}</Text>
      <View style={styles.cardFooterRow}>
        <Text style={styles.timestamp}>{new Date(notification.createdAt).toLocaleString()}</Text>
        <View style={styles.cardFooterActions}>
          {onOpen ? (
            <Pressable onPress={onOpen} hitSlop={8}>
              <Text style={styles.markReadText}>View request</Text>
            </Pressable>
          ) : null}
          {!notification.isRead ? (
            <Pressable disabled={marking} onPress={() => onMarkRead(notification._id)} hitSlop={8}>
              <Text style={styles.markReadText}>{marking ? "Marking..." : "Mark as read"}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
});

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    filterRow: {
      flexDirection: "row",
      gap: 8,
      padding: 16,
      paddingBottom: 0,
    },
    filterButton: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
    },
    filterButtonActive: {
      backgroundColor: colors.greenDark,
      borderColor: colors.greenDark,
    },
    filterButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.ink,
    },
    filterButtonTextActive: {
      color: colors.white,
    },
    list: {
      padding: 16,
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: "center",
      marginTop: 24,
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
    cardMessage: {
      fontSize: 13,
      color: colors.ink,
    },
    cardFooterRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    cardFooterActions: {
      flexDirection: "row",
      gap: 16,
    },
    timestamp: {
      fontSize: 12,
      color: colors.muted,
    },
    markReadText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.greenDark,
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
  });
