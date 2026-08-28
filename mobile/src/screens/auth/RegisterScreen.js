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
import GoogleSignInButton from "../../components/GoogleSignInButton.js";
import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { bodyText, boldText } from "../../theme/typography.js";
import { openLegalPage } from "../../utils/webLinks.js";

// Mirrors the backend's registerUserSchema (backend/validators/authValidators.js)
// so obviously-invalid input is caught here instead of round-tripping to the
// server first - web's AuthModal relies on the browser's own HTML5
// required/type=email validation for the same purpose.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minPasswordLength = 8;

const roles = [
  { value: "tenant", label: "Tenant" },
  { value: "landlord", label: "Landlord" },
  { value: "agency", label: "Agency" },
  { value: "mover", label: "Mover" },
];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    phone: "",
    role: "tenant",
    termsAccepted: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);

  const setField = (field) => (value) => {
    if (field === "username") {
      setUsernameSuggestions([]);
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const applyUsernameSuggestion = (suggestion) => {
    setForm((prev) => ({ ...prev, username: suggestion }));
    setUsernameSuggestions([]);
  };

  const handleSubmit = async () => {
    setError("");
    setUsernameSuggestions([]);

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!emailPattern.test(form.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    if (!form.username.trim()) {
      setError("Username is required.");
      return;
    }

    if (form.password.length < minPasswordLength) {
      setError(`Password must be at least ${minPasswordLength} characters.`);
      return;
    }

    if (!form.termsAccepted) {
      setError("You must agree to the Terms of Service to create an account.");
      return;
    }

    setLoading(true);

    try {
      await register({ ...form, email: form.email.trim() });
      navigation.goBack();
    } catch (err) {
      setError(err.message || "Registration failed");
      setUsernameSuggestions(err.suggestions || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join KejaApp to save homes and message owners.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={setField("name")}
            accessibilityLabel="Name"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={form.email}
            onChangeText={setField("email")}
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel="Email"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={form.username}
            onChangeText={setField("username")}
            autoCapitalize="none"
            accessibilityLabel="Username"
          />
          {usernameSuggestions.length > 0 ? (
            <View style={styles.roleRow}>
              {usernameSuggestions.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  style={styles.roleChip}
                  onPress={() => applyUsernameSuggestion(suggestion)}
                >
                  <Text style={styles.roleChipText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={form.phone}
            onChangeText={setField("phone")}
            keyboardType="phone-pad"
            accessibilityLabel="Phone"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={form.password}
            onChangeText={setField("password")}
            secureTextEntry
            accessibilityLabel="Password"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>I am a</Text>
          <View style={styles.roleRow}>
            {roles.map((role) => (
              <Pressable
                key={role.value}
                style={[styles.roleChip, form.role === role.value && styles.roleChipActive]}
                onPress={() => setField("role")(role.value)}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    form.role === role.value && styles.roleChipTextActive,
                  ]}
                >
                  {role.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={styles.termsRow}
          onPress={() => setField("termsAccepted")(!form.termsAccepted)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.termsAccepted }}
          accessibilityLabel="I agree to the Terms of Service and Privacy & Data Protection Policy"
        >
          <View style={[styles.checkbox, form.termsAccepted && styles.checkboxChecked]}>
            {form.termsAccepted ? <Text style={styles.checkboxMark}>✓</Text> : null}
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
          <Text style={styles.primaryButtonText}>{loading ? "Creating account..." : "Create account"}</Text>
        </Pressable>

        <GoogleSignInButton
          onAuthenticated={() => navigation.goBack()}
          onError={(message) => setError(message)}
        />

        <Pressable onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    padding: 24,
    gap: 12,
    flexGrow: 1,
    justifyContent: "center",
  },
  title: {
    ...boldText,
    fontSize: 26,
    color: colors.ink,
  },
  subtitle: {
    ...bodyText,
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
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
  roleRow: {
    flexDirection: "row",
    gap: 8,
  },
  roleChip: {
    borderWidth: colors.strokeWidthSm,
    borderColor: colors.stroke,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  roleChipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  roleChipText: {
    ...boldText,
    color: colors.ink,
    fontSize: 13,
  },
  roleChipTextActive: {
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
    marginTop: 4,
  },
  primaryButtonText: {
    ...boldText,
    color: colors.onAccent,
    fontSize: 15,
  },
  link: {
    ...boldText,
    color: colors.green,
    textAlign: "center",
    marginTop: 8,
  },
  });
