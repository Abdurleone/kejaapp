import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { confirmRole } from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { bodyText, boldText, displayText } from "../../theme/typography.js";
import { openLegalPage } from "../../utils/webLinks.js";

const roles = [
  { value: "tenant", label: "Tenant - I'm looking for a place to rent" },
  { value: "landlord", label: "Landlord - I own properties to rent out" },
  { value: "agency", label: "Agency - I manage properties for owners" },
  { value: "mover", label: "Mover - I offer moving services" },
];

// Shown in place of the main tab navigator (see RootNavigator.js) whenever a
// signed-in user's role isn't confirmed yet - a fresh Google Sign-In account
// has no role at all until this screen is completed once.
export default function SelectRoleScreen() {
  const { updateUser } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [role, setRole] = useState("tenant");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!termsAccepted) {
      setError("You must agree to the Terms of Service to continue.");
      return;
    }

    setLoading(true);

    try {
      const user = await confirmRole(role, termsAccepted);
      updateUser(user);
    } catch (err) {
      setError(err.message || "Could not save your role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>One more thing</Text>
      <Text style={styles.subtitle}>
        Tell us how you&apos;ll be using KejaApp. This can&apos;t be changed yourself afterward.
      </Text>

      <View style={styles.roleList}>
        {roles.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.roleOption, role === option.value && styles.roleOptionActive]}
            onPress={() => setRole(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: role === option.value }}
          >
            <Text style={[styles.roleOptionText, role === option.value && styles.roleOptionTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.termsRow}
        onPress={() => setTermsAccepted((current) => !current)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: termsAccepted }}
        accessibilityLabel="I agree to the Terms of Service and Privacy & Data Protection Policy"
      >
        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
          {termsAccepted ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <Text style={styles.termsText}>
          I agree to the{" "}
          <Text style={styles.termsLink} onPress={() => openLegalPage("/terms")}>
            Terms of Service
          </Text>{" "}
          and{" "}
          <Text style={styles.termsLink} onPress={() => openLegalPage("/privacy")}>
            Privacy &amp; Data Protection Policy
          </Text>
          .
        </Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.primaryButtonText}>{loading ? "Saving..." : "Continue"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: colors.bg,
      padding: 24,
      gap: 16,
      justifyContent: "center",
    },
    title: {
      ...displayText,
      fontSize: 24,
      color: colors.ink,
    },
    subtitle: {
      ...bodyText,
      fontSize: 14,
      color: colors.muted,
    },
    roleList: {
      gap: 10,
    },
    roleOption: {
      borderWidth: colors.strokeWidthSm,
      borderColor: colors.stroke,
      borderRadius: colors.radiusSm,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.surface,
    },
    roleOptionActive: {
      backgroundColor: colors.green,
      borderColor: colors.green,
    },
    roleOptionText: {
      ...boldText,
      color: colors.ink,
      fontSize: 14,
    },
    roleOptionTextActive: {
      color: colors.onAccent,
    },
    error: {
      ...bodyText,
      color: colors.red,
      fontSize: 13,
    },
    termsRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: colors.strokeWidthSm,
      borderColor: colors.stroke,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: colors.green,
      borderColor: colors.green,
    },
    checkboxMark: {
      ...boldText,
      color: colors.onAccent,
      fontSize: 13,
      lineHeight: 14,
    },
    termsText: {
      ...bodyText,
      flex: 1,
      fontSize: 13,
      color: colors.muted,
    },
    termsLink: {
      ...boldText,
      color: colors.green,
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
      fontSize: 15,
    },
  });
