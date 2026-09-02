import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createReview } from "../../api/index.js";
import { useTheme } from "../../context/ThemeContext.js";
import { bodyText, boldText } from "../../theme/typography.js";

const ratingOptions = [5, 4, 3, 2, 1];

export default function ReviewFormScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { propertyId } = route.params;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);

    try {
      await createReview({ property: propertyId, rating, comment: comment.trim() });
      setSent(true);
    } catch (err) {
      // Surfaced verbatim - this is where "you can only review a property
      // after a completed viewing" (the actual eligibility rule) reaches
      // the tenant, not a generic failure message.
      setError(err.message || "Could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.sentContainer}>
        <Text style={styles.sentTitle}>Review submitted</Text>
        <Text style={styles.sentMessage}>Thanks for sharing your experience.</Text>
        <Pressable style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Back to property</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Rating</Text>
          <View style={styles.chipRow}>
            {ratingOptions.map((value) => (
              <Pressable
                key={value}
                style={[styles.chip, rating === value && styles.chipActive]}
                onPress={() => setRating(value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: rating === value }}
                accessibilityLabel={`${value} star${value === 1 ? "" : "s"}`}
              >
                <Text style={[styles.chipText, rating === value && styles.chipTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Comment (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            maxLength={1000}
            accessibilityLabel="Comment"
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Submitting..." : "Submit review"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    container: {
      padding: 16,
      gap: 14,
      backgroundColor: colors.bg,
      flexGrow: 1,
    },
    field: {
      gap: 6,
    },
    label: {
      ...boldText,
      fontSize: 13,
      color: colors.muted,
    },
    input: {
      ...bodyText,
      borderWidth: colors.strokeWidthSm,
      borderColor: colors.stroke,
      borderRadius: colors.radiusSm,
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
    chipRow: {
      flexDirection: "row",
      gap: 8,
    },
    chip: {
      borderWidth: colors.strokeWidthSm,
      borderColor: colors.stroke,
      borderRadius: 999,
      paddingHorizontal: 14,
      minHeight: 44,
      minWidth: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    chipActive: {
      backgroundColor: colors.green,
      borderColor: colors.green,
    },
    chipText: {
      ...boldText,
      color: colors.ink,
      fontSize: 15,
    },
    chipTextActive: {
      color: colors.onAccent,
    },
    error: {
      ...bodyText,
      color: colors.red,
      fontSize: 13,
    },
    primaryButton: {
      backgroundColor: colors.green,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryButtonText: {
      ...boldText,
      color: colors.onAccent,
    },
    sentContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: 32,
      backgroundColor: colors.bg,
    },
    sentTitle: {
      ...boldText,
      fontSize: 20,
      color: colors.ink,
    },
    sentMessage: {
      ...bodyText,
      fontSize: 14,
      color: colors.muted,
      textAlign: "center",
      marginBottom: 12,
    },
  });
