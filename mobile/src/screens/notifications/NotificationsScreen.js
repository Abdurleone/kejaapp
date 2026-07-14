import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { FeedbackCardSkeletonList } from "../../components/FeedbackCardSkeleton.js";
import MessageView from "../../components/MessageView.js";
import { useTheme } from "../../context/ThemeContext.js";

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { signedIn } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingId, setMarkingId] = useState(null);

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
  // like the *first* time this screen mounted. load() runs first so this
  // visit's list still reflects whatever was actually unread when the tab
  // was opened; marking everything read afterwards (in the background)
  // only affects the *next* visit's badge count, it doesn't retroactively
  // hide "New" pills the user hasn't seen yet this visit.
  useFocusEffect(
    useCallback(() => {
      if (!signedIn) {
        return undefined;
      }

      let active = true;

      // Kicking off a real fetch here, not deriving avoidable state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      load()
        .finally(() => {
          if (active) setLoading(false);
        })
        .then(() => {
          if (!active) return;

          markAllNotificationsAsRead().catch(() => {
            // Non-fatal: the badge will just resync on its next poll instead.
          });
        });

      return () => {
        active = false;
      };
    }, [signedIn, load]),
  );

  const handleMarkRead = async (notificationId) => {
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
  };

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
        renderItem={({ item }) => (
          <NotificationRow
            notification={item}
            marking={markingId === item._id}
            onMarkRead={handleMarkRead}
            styles={styles}
          />
        )}
      />
    </View>
  );
}

function NotificationRow({ notification, marking, onMarkRead, styles }) {
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
        {!notification.isRead ? (
          <Pressable disabled={marking} onPress={() => onMarkRead(notification._id)}>
            <Text style={styles.markReadText}>{marking ? "Marking..." : "Mark as read"}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

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
