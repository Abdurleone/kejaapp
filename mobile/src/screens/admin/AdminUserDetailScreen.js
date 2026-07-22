import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { fetchAdminUserStatusHistory, fetchAdminUserSummary, updateAdminUserStatus } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { formatStatusLabel } from "../../utils/format.js";
import MessageView from "../../components/MessageView.js";

const statusOptions = ["active", "suspended", "banned"];

function ChipRow({ options, value, onChange, styles }) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => (
        <Pressable
          key={option}
          style={[styles.chip, value === option && styles.chipActive]}
          onPress={() => onChange(option)}
        >
          <Text style={[styles.chipText, value === option && styles.chipTextActive]}>
            {formatStatusLabel(option)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function AdminUserDetailScreen({ route }) {
  const { userId } = route.params;
  const { user: currentUser } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("active");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoadError("");

    try {
      const [summaryData, historyData] = await Promise.all([
        fetchAdminUserSummary(userId),
        fetchAdminUserStatusHistory(userId),
      ]);
      setSummary(summaryData);
      setHistory(historyData);
      setStatus(summaryData.user.accountStatus || "active");
    } catch (err) {
      setLoadError(err.message || "Could not load this user.");
    }
  }, [userId]);

  useEffect(() => {
    // Kicking off a real fetch here, not deriving avoidable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleSubmit = async () => {
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      const updated = await updateAdminUserStatus(userId, { status, reason: reason.trim() || undefined });
      setSummary((current) => (current ? { ...current, user: updated } : current));
      const historyData = await fetchAdminUserStatusHistory(userId);
      setHistory(historyData);
      setReason("");
      setMessage("Account status updated.");
    } catch (err) {
      setError(err.message || "Could not update account status.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.greenDark} />
      </View>
    );
  }

  if (loadError) {
    return <MessageView title="Couldn't load this user" message={loadError} actionLabel="Retry" onAction={load} />;
  }

  const { user, summary: counts } = summary;
  const isSelf = currentUser?._id === user._id;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{user.name || "Unnamed user"}</Text>

      <View style={styles.statGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Email</Text>
          <Text style={styles.statValue}>{user.email}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Phone</Text>
          <Text style={styles.statValue}>{user.phone || "Not set"}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Role</Text>
          <Text style={styles.statValue}>{formatStatusLabel(user.role)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Status</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{formatStatusLabel(user.accountStatus || "active")}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValueLarge}>{counts.violations.open}</Text>
          <Text style={styles.statLabel}>Open violations</Text>
        </View>
        {counts.owner ? (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statValueLarge}>{counts.owner.properties.available}</Text>
              <Text style={styles.statLabel}>Available listings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValueLarge}>{counts.owner.incomingInquiries.open}</Text>
              <Text style={styles.statLabel}>Open inquiries</Text>
            </View>
          </>
        ) : null}
        {counts.tenant ? (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statValueLarge}>{counts.tenant.savedProperties}</Text>
              <Text style={styles.statLabel}>Saved properties</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValueLarge}>{counts.tenant.inquiries.open}</Text>
              <Text style={styles.statLabel}>Open inquiries</Text>
            </View>
          </>
        ) : null}
        {counts.agency ? (
          <View style={styles.statItem}>
            <Text style={styles.statValueLarge}>{formatStatusLabel(counts.agency.verificationStatus)}</Text>
            <Text style={styles.statLabel}>Agency verification</Text>
          </View>
        ) : null}
      </View>

      {isSelf ? (
        <Text style={styles.label}>You cannot change your own account status.</Text>
      ) : (
        <View style={styles.field}>
          <Text style={styles.sectionTitle}>Account status</Text>
          <ChipRow options={statusOptions} value={status} onChange={setStatus} styles={styles} />
          <Text style={styles.label}>Reason (required for suspend or ban)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={reason}
            onChangeText={setReason}
            placeholder="Why is this account's status changing?"
            multiline
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.notice}>{message}</Text> : null}
          <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.primaryButtonText}>{submitting ? "Saving..." : "Update status"}</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionTitle}>Status history</Text>
      {history.length === 0 ? (
        <Text style={styles.label}>No status changes recorded yet.</Text>
      ) : (
        history.map((entry) => (
          <View key={entry._id} style={styles.historyRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{formatStatusLabel(entry.newStatus)}</Text>
            </View>
            <Text style={styles.cardMessage}>
              by {entry.changedBy?.name || "Unknown"}
              {entry.reason ? ` — ${entry.reason}` : ""}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
    },
    container: {
      padding: 16,
      gap: 14,
    },
    title: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.ink,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.ink,
      marginTop: 6,
    },
    statGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    statItem: {
      minWidth: "45%",
      gap: 4,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.muted,
      textTransform: "uppercase",
    },
    statValue: {
      fontSize: 14,
      color: colors.ink,
    },
    statValueLarge: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.greenDark,
    },
    badge: {
      alignSelf: "flex-start",
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
    field: {
      gap: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.muted,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 999,
      paddingHorizontal: 14,
      minHeight: 44,
      justifyContent: "center",
    },
    chipActive: {
      backgroundColor: colors.greenDark,
      borderColor: colors.greenDark,
    },
    chipText: {
      color: colors.ink,
      fontWeight: "700",
      fontSize: 13,
    },
    chipTextActive: {
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
    },
    textArea: {
      minHeight: 60,
      textAlignVertical: "top",
    },
    error: {
      color: colors.red,
      fontSize: 13,
    },
    notice: {
      color: colors.greenDark,
      fontSize: 13,
    },
    primaryButton: {
      backgroundColor: colors.greenDark,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
    },
    primaryButtonText: {
      color: colors.white,
      fontWeight: "800",
      fontSize: 13,
    },
    historyRow: {
      gap: 4,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    cardMessage: {
      fontSize: 13,
      color: colors.ink,
    },
  });
