import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createInquiry } from "../../api/index.js";
import { useTheme } from "../../context/ThemeContext.js";
import { bodyText, boldText } from "../../theme/typography.js";

const contactPreferences = [
  { value: "in_app", label: "In-app" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
];

export default function InquiryFormScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { propertyId } = route.params;
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contactPreference, setContactPreference] = useState("in_app");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!message.trim()) {
      setError("Message is required.");
      return;
    }

    setSubmitting(true);

    try {
      await createInquiry({ property: propertyId, subject: subject.trim(), message: message.trim(), contactPreference });
      setSent(true);
    } catch (err) {
      setError(err.message || "Could not send your inquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.sentContainer}>
        <Text style={styles.sentTitle}>Inquiry sent</Text>
        <Text style={styles.sentMessage}>The owner will respond in-app or via your preferred contact method.</Text>
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
        <Text style={styles.label}>Subject (optional)</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          maxLength={140}
          accessibilityLabel="Subject"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          maxLength={1000}
          accessibilityLabel="Message"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Preferred contact</Text>
        <View style={styles.chipRow}>
          {contactPreferences.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.chip, contactPreference === option.value && styles.chipActive]}
              onPress={() => setContactPreference(option.value)}
            >
              <Text style={[styles.chipText, contactPreference === option.value && styles.chipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.primaryButtonText}>{submitting ? "Sending..." : "Send inquiry"}</Text>
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
    minHeight: 110,
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
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  chipText: {
    ...boldText,
    color: colors.ink,
    fontSize: 13,
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
