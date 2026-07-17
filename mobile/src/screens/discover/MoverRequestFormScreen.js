import { useState } from "react";
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
import { createMoverRequest } from "../../api/index.js";
import { useTheme } from "../../context/ThemeContext.js";
import { getCurrentPositionOrNull } from "../../utils/location.js";

// DateTimePicker has no web implementation; fall back to a plain text input
// there (used for Expo web verification) while using the native picker on
// iOS/Android - matching ViewingRequestFormScreen's existing pattern.
let DateTimePicker = null;
if (Platform.OS !== "web") {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
}

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

export default function MoverRequestFormScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { moverId, moverName, propertyId } = route.params;
  const [message, setMessage] = useState("");
  const [preferredDate, setPreferredDate] = useState(null);
  const [webDateInput, setWebDateInput] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!message.trim()) {
      setError("Message is required.");
      return;
    }

    let preferredDateIso;
    const hasDateInput = Platform.OS === "web" ? webDateInput.trim() : preferredDate;

    if (hasDateInput) {
      const date = Platform.OS === "web" ? new Date(webDateInput) : preferredDate;

      if (!date || Number.isNaN(date.getTime()) || date < startOfToday()) {
        setError("Choose a valid date, today or later.");
        return;
      }

      preferredDateIso = date.toISOString();
    }

    setSubmitting(true);

    try {
      const position = await getCurrentPositionOrNull();
      await createMoverRequest({
        mover: moverId,
        property: propertyId,
        message: message.trim(),
        preferredDate: preferredDateIso,
        pickupLat: position?.lat,
        pickupLng: position?.lng,
      });
      setSent(true);
    } catch (err) {
      setError(err.message || "Could not send your request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.sentContainer}>
        <Text style={styles.sentTitle}>Request sent</Text>
        <Text style={styles.sentMessage}>
          {moverName ? `${moverName} will respond soon.` : "The mover will respond soon."}
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {moverName ? <Text style={styles.title}>Request service from {moverName}</Text> : null}

        <View style={styles.field}>
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            maxLength={1000}
            placeholder="Tell them about your move..."
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Preferred date (optional)</Text>
          {Platform.OS === "web" ? (
            <TextInput
              style={styles.input}
              value={webDateInput}
              onChangeText={setWebDateInput}
              placeholder="YYYY-MM-DD"
            />
          ) : (
            <>
              <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
                <Text style={styles.dateText}>
                  {preferredDate ? preferredDate.toLocaleDateString() : "No preference"}
                </Text>
              </Pressable>
              {showPicker ? (
                <DateTimePicker
                  value={preferredDate || startOfToday()}
                  mode="date"
                  minimumDate={startOfToday()}
                  onChange={(event, selectedDate) => {
                    setShowPicker(Platform.OS === "ios");
                    if (selectedDate) setPreferredDate(selectedDate);
                  }}
                />
              ) : null}
            </>
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Sending..." : "Send request"}</Text>
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
    title: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.ink,
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.muted,
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
    dateText: {
      fontSize: 15,
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
    sentContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: 32,
      backgroundColor: colors.bg,
    },
    sentTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.ink,
    },
    sentMessage: {
      fontSize: 14,
      color: colors.muted,
      textAlign: "center",
      marginBottom: 12,
    },
  });
