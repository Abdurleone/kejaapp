import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createViewingRequest } from "../../api/index.js";
import colors from "../../theme/colors.js";

// DateTimePicker has no web implementation; fall back to a plain text input
// there (used for Expo web verification) while using the native picker on
// iOS/Android.
let DateTimePicker = null;
if (Platform.OS !== "web") {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
}

const minScheduledDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
};

export default function ViewingRequestFormScreen({ route, navigation }) {
  const { propertyId, viewingType } = route.params;
  const isScheduled = viewingType === "scheduled";
  const [requestedDate, setRequestedDate] = useState(minScheduledDate());
  const [webDateInput, setWebDateInput] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError("");

    let requestedDateIso;

    if (isScheduled) {
      const date = Platform.OS === "web" ? new Date(webDateInput) : requestedDate;

      if (!date || Number.isNaN(date.getTime())) {
        setError("Choose a valid future date.");
        return;
      }

      requestedDateIso = date.toISOString();
    }

    setSubmitting(true);

    try {
      await createViewingRequest({
        property: propertyId,
        requestedDate: requestedDateIso,
        message: message.trim(),
      });
      setSent(true);
    } catch (err) {
      setError(err.message || "Could not send your viewing request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.sentContainer}>
        <Text style={styles.sentTitle}>Viewing requested</Text>
        <Text style={styles.sentMessage}>
          {isScheduled
            ? "The owner will confirm your requested time."
            : "This is an open viewing, so your request is approved automatically."}
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Back to property</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {isScheduled ? (
        <View style={styles.field}>
          <Text style={styles.label}>Requested date</Text>
          {Platform.OS === "web" ? (
            <TextInput
              style={styles.input}
              value={webDateInput}
              onChangeText={setWebDateInput}
              placeholder="YYYY-MM-DDTHH:mm"
            />
          ) : (
            <>
              <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
                <Text style={styles.dateText}>{requestedDate.toLocaleString()}</Text>
              </Pressable>
              {showPicker ? (
                <DateTimePicker
                  value={requestedDate}
                  mode="datetime"
                  minimumDate={minScheduledDate()}
                  onChange={(event, selectedDate) => {
                    setShowPicker(Platform.OS === "ios");
                    if (selectedDate) setRequestedDate(selectedDate);
                  }}
                />
              ) : null}
            </>
          )}
        </View>
      ) : (
        <Text style={styles.openNotice}>
          This property has open viewing — no need to pick a time. Your request is approved automatically.
        </Text>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Message (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          maxLength={1000}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.primaryButtonText}>{submitting ? "Sending..." : "Request viewing"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  openNotice: {
    fontSize: 13,
    color: colors.muted,
    backgroundColor: colors.surfaceSoft,
    padding: 12,
    borderRadius: 8,
  },
  error: {
    color: colors.red,
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: colors.green,
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
