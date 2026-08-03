import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { createFeedback, fetchAdminFeedback, fetchMyFeedback, respondToFeedback } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { FeedbackCardSkeletonList } from "../../components/FeedbackCardSkeleton.js";
import MessageView from "../../components/MessageView.js";
import { formatStatusLabel } from "../../utils/format.js";
import { useTheme } from "../../context/ThemeContext.js";

export default function FeedbackScreen() {
  const navigation = useNavigation();
  const { user, signedIn } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isAdmin = signedIn && user?.role === "admin";

  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");

    try {
      const data = isAdmin ? await fetchAdminFeedback() : await fetchMyFeedback();
      setFeedback(data);
    } catch (err) {
      setError(err.message || "Failed to load feedback.");
    }
  }, [isAdmin]);

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

  const handleSubmitted = (created) => {
    setFeedback((current) => [created, ...current]);
  };

  const handleResponded = useCallback((updated) => {
    setFeedback((current) => current.map((item) => (item._id === updated._id ? updated : item)));
  }, []);

  const renderFeedbackItem = useCallback(
    ({ item }) =>
      isAdmin ? (
        <AdminFeedbackRow feedback={item} onResponded={handleResponded} styles={styles} />
      ) : (
        <FeedbackRow feedback={item} styles={styles} />
      ),
    [isAdmin, handleResponded, styles]
  );

  if (!signedIn) {
    return (
      <MessageView
        title="Sign in required"
        message="Sign in to view or submit feedback."
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
    return <MessageView title="Couldn't load feedback" message={error} actionLabel="Retry" onAction={load} />;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FlatList
        data={feedback}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={isAdmin ? null : <SubmitFeedbackForm onSubmitted={handleSubmitted} styles={styles} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isAdmin ? "No feedback submitted yet." : "You have not submitted any feedback yet."}
          </Text>
        }
        renderItem={renderFeedbackItem}
      />
    </KeyboardAvoidingView>
  );
}

function StatusBadge({ status, styles }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{formatStatusLabel(status)}</Text>
    </View>
  );
}

function SubmitFeedbackForm({ onSubmitted, styles }) {
  const [message, setMessage] = useState("");
  const [allowPublicSharing, setAllowPublicSharing] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!message.trim()) {
      setError("Message is required.");
      return;
    }

    setSubmitting(true);

    try {
      const created = await createFeedback({ message: message.trim(), allowPublicSharing });
      onSubmitted(created);
      setMessage("");
      setAllowPublicSharing(false);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Could not submit your feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.label}>Share your experience</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={message}
        onChangeText={(value) => {
          setMessage(value);
          setSubmitted(false);
        }}
        multiline
        numberOfLines={4}
        maxLength={1000}
        placeholder="Tell us how KejaApp helped you find your next home..."
      />
      <Pressable
        style={styles.switchRow}
        onPress={() => setAllowPublicSharing((current) => !current)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: allowPublicSharing }}
      >
        <View style={[styles.checkbox, allowPublicSharing && styles.checkboxChecked]}>
          {allowPublicSharing ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <Text style={styles.switchLabel}>
          Allow this to be shown as a testimonial on our landing page if an admin responds
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {submitted ? <Text style={styles.success}>Thanks for sharing! We will be in touch.</Text> : null}
      <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.primaryButtonText}>{submitting ? "Submitting..." : "Submit feedback"}</Text>
      </Pressable>
    </View>
  );
}

const FeedbackRow = memo(function FeedbackRow({ feedback, styles }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <StatusBadge status={feedback.status} styles={styles} />
      </View>
      <Text style={styles.cardMessage}>{feedback.message}</Text>
      {feedback.response?.message ? (
        <View style={styles.responseBox}>
          <Text style={styles.responseLabel}>Admin response</Text>
          <Text style={styles.responseText}>{feedback.response.message}</Text>
        </View>
      ) : null}
    </View>
  );
});

const AdminFeedbackRow = memo(function AdminFeedbackRow({ feedback, onResponded, styles }) {
  const [responding, setResponding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRespond = async () => {
    setError("");

    if (!message.trim()) {
      setError("Response is required.");
      return;
    }

    setSubmitting(true);

    try {
      const updated = await respondToFeedback(feedback._id, { message: message.trim() });
      onResponded(updated);
      setResponding(false);
      setMessage("");
    } catch (err) {
      setError(err.message || "Could not send your response.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {feedback.submitter?.name || "User"} ({formatStatusLabel(feedback.submitter?.role || "")})
        </Text>
        <StatusBadge status={feedback.status} styles={styles} />
      </View>
      <Text style={styles.cardMessage}>{feedback.message}</Text>
      {feedback.response?.message ? (
        <View style={styles.responseBox}>
          <Text style={styles.responseLabel}>Your response</Text>
          <Text style={styles.responseText}>{feedback.response.message}</Text>
        </View>
      ) : responding ? (
        <View style={styles.respondForm}>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
            maxLength={1000}
            placeholder="Write a response..."
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.respondActions}>
            <Pressable style={styles.primaryButton} onPress={handleRespond} disabled={submitting}>
              <Text style={styles.primaryButtonText}>{submitting ? "Sending..." : "Send response"}</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                setResponding(false);
                setMessage("");
                setError("");
              }}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.secondaryButton} onPress={() => setResponding(true)}>
          <Text style={styles.secondaryButtonText}>Respond</Text>
        </Pressable>
      )}
    </View>
  );
});

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    list: {
      padding: 16,
      paddingTop: 4,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      padding: 14,
      gap: 10,
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.muted,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    switchLabel: {
      flex: 1,
      fontSize: 13,
      color: colors.ink,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    checkboxChecked: {
      backgroundColor: colors.greenDark,
      borderColor: colors.greenDark,
    },
    checkboxMark: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "700",
    },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      backgroundColor: colors.surface,
      color: colors.ink,
    },
    textArea: {
      minHeight: 90,
      textAlignVertical: "top",
    },
    error: {
      color: colors.red,
      fontSize: 13,
    },
    success: {
      color: colors.accentText,
      fontSize: 13,
      fontWeight: "700",
    },
    primaryButton: {
      backgroundColor: colors.greenDark,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryButtonText: {
      color: colors.white,
      fontWeight: "800",
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    secondaryButtonText: {
      color: colors.ink,
      fontWeight: "700",
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
    badge: {
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.accentText,
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
    respondForm: {
      marginTop: 4,
      gap: 8,
    },
    respondActions: {
      flexDirection: "row",
      gap: 8,
    },
  });
