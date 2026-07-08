import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchInquiries, fetchViewingRequests } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { RequestCardSkeletonList } from "../../components/RequestCardSkeleton.js";
import MessageView from "../../components/MessageView.js";
import { formatStatusLabel } from "../../utils/format.js";
import colors from "../../theme/colors.js";

const tabs = [
  { key: "inquiries", label: "Inquiries" },
  { key: "viewings", label: "Viewings" },
];

export default function RequestsScreen() {
  const navigation = useNavigation();
  const { signedIn } = useAuth();
  const [tab, setTab] = useState("inquiries");
  const [inquiries, setInquiries] = useState([]);
  const [viewings, setViewings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");

    try {
      const [inquiryData, viewingData] = await Promise.all([fetchInquiries(), fetchViewingRequests()]);
      setInquiries(inquiryData);
      setViewings(viewingData);
    } catch (err) {
      setError(err.message || "Failed to load your requests.");
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
          renderItem={({ item }) =>
            tab === "inquiries" ? <InquiryRow inquiry={item} /> : <ViewingRow viewing={item} />
          }
        />
      )}
    </View>
  );
}

function InquiryRow({ inquiry }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>{inquiry.property?.title || "Property"}</Text>
        <StatusBadge status={inquiry.status} />
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
}

function ViewingRow({ viewing }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>{viewing.property?.title || "Property"}</Text>
        <StatusBadge status={viewing.status} />
      </View>
      <Text style={styles.cardMessage}>
        {viewing.requestedDate
          ? `Requested for ${new Date(viewing.requestedDate).toLocaleString()}`
          : "Open viewing"}
      </Text>
      {viewing.message ? <Text style={styles.cardMessage}>{viewing.message}</Text> : null}
    </View>
  );
}

function StatusBadge({ status }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{formatStatusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  list: {
    padding: 16,
    paddingTop: 4,
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
});
