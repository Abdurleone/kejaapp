import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchDashboardSummary } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import DashboardSkeleton from "../../components/DashboardSkeleton.js";
import MessageView from "../../components/MessageView.js";
import { formatStatusLabel } from "../../utils/format.js";
import { useTheme } from "../../context/ThemeContext.js";
import LandingView from "./LandingView.js";

const roleLabels = {
  tenant: "Tenant",
  landlord: "Landlord",
  agency: "Agency",
  mover: "Mover",
  admin: "Admin",
};

const StatTile = memo(function StatTile({ value, label, styles }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
});

const StatusStatTiles = memo(function StatusStatTiles({ counts, suffix, styles }) {
  return Object.entries(counts).map(([status, count]) => (
    <StatTile
      key={`${suffix}-${status}`}
      value={count}
      label={`${formatStatusLabel(status)} ${suffix}`}
      styles={styles}
    />
  ));
});

export default function DashboardScreen() {
  const { user, signedIn } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");

    try {
      const data = await fetchDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(err.message || "Failed to load your dashboard.");
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
    return <LandingView />;
  }

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <DashboardSkeleton />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <MessageView title="Couldn't load dashboard" message={error} actionLabel="Retry" onAction={load} />
    );
  }

  const roleLabel = roleLabels[user?.role] || "Account";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.subtitle}>
        {roleLabel} overview for {user?.name || user?.email || "your account"}.
      </Text>

      <View style={styles.row}>
        <StatTile value={summary.notifications.unread} label="Unread notifications" styles={styles} />
      </View>

      {summary.tenant ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Your activity</Text>
          <View style={styles.row}>
            <StatTile value={summary.tenant.savedProperties} label="Saved properties" styles={styles} />
            <StatusStatTiles counts={summary.tenant.inquiries} suffix="inquiries" styles={styles} />
            <StatusStatTiles counts={summary.tenant.viewings} suffix="viewings" styles={styles} />
          </View>
        </View>
      ) : null}

      {summary.owner ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Your listings</Text>
          <View style={styles.row}>
            <StatusStatTiles counts={summary.owner.properties} suffix="properties" styles={styles} />
            <StatusStatTiles counts={summary.owner.incomingInquiries} suffix="incoming inquiries" styles={styles} />
            <StatusStatTiles counts={summary.owner.incomingViewings} suffix="incoming viewings" styles={styles} />
          </View>
        </View>
      ) : null}

      {summary.agency ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Agency verification</Text>
          <Text style={styles.muted}>
            Status: <Text style={styles.strong}>{formatStatusLabel(summary.agency.verificationStatus)}</Text>
          </Text>
          {summary.agency.rejectionReason ? (
            <Text style={styles.muted}>{summary.agency.rejectionReason}</Text>
          ) : null}
        </View>
      ) : null}

      {summary.mover ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Mover verification</Text>
          <Text style={styles.muted}>
            Status: <Text style={styles.strong}>{formatStatusLabel(summary.mover.verificationStatus)}</Text>
          </Text>
          {summary.mover.rejectionReason ? (
            <Text style={styles.muted}>{summary.mover.rejectionReason}</Text>
          ) : null}
          <View style={styles.row}>
            <StatusStatTiles counts={summary.mover.receivedRequests} suffix="requests" styles={styles} />
          </View>
        </View>
      ) : null}

      {summary.admin ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Platform moderation</Text>
          <View style={styles.row}>
            <StatusStatTiles counts={summary.admin.agencyVerifications} suffix="agency verifications" styles={styles} />
            <StatusStatTiles counts={summary.admin.moverVerifications} suffix="mover verifications" styles={styles} />
            <StatusStatTiles counts={summary.admin.violations} suffix="violations" styles={styles} />
            <StatusStatTiles counts={summary.admin.feedback} suffix="feedback" styles={styles} />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    flexGrow: 1,
    minWidth: 130,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  tileValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.accentText,
  },
  tileLabel: {
    fontSize: 12,
    color: colors.muted,
    textTransform: "capitalize",
  },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
  },
  muted: {
    fontSize: 13,
    color: colors.muted,
  },
  strong: {
    fontWeight: "800",
    color: colors.ink,
  },
  });
