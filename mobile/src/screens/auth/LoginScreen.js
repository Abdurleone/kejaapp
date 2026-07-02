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
import { useAuth } from "../../context/AuthContext.js";
import { useSettings } from "../../context/SettingsContext.js";
import colors from "../../theme/colors.js";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { apiBaseUrl, setApiBaseUrl } = useSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [serverInput, setServerInput] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      await login({ email: email.trim(), password });
      navigation.goBack();
    } catch (err) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>KejaApp</Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Find and manage your rentals in Kenya.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? "Signing in..." : "Sign in"}</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("Register")}>
          <Text style={styles.link}>Need an account? Register</Text>
        </Pressable>

        <Pressable onPress={() => setShowSettings((value) => !value)} style={styles.settingsToggle}>
          <Text style={styles.settingsToggleText}>
            {showSettings ? "Hide" : "Show"} API server settings
          </Text>
        </Pressable>

        {showSettings ? (
          <View style={styles.field}>
            <Text style={styles.label}>API server (e.g. http://192.168.1.20:5000)</Text>
            <TextInput
              style={styles.input}
              value={serverInput || apiBaseUrl || ""}
              onChangeText={setServerInput}
              autoCapitalize="none"
              placeholder={apiBaseUrl || ""}
            />
            <Pressable
              style={styles.secondaryButton}
              onPress={() => setApiBaseUrl(serverInput)}
            >
              <Text style={styles.secondaryButtonText}>Save server address</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    padding: 24,
    gap: 12,
    flexGrow: 1,
    justifyContent: "center",
  },
  brand: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.green,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
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
  error: {
    color: colors.red,
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
  },
  link: {
    color: colors.greenDark,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
  settingsToggle: {
    marginTop: 24,
  },
  settingsToggleText: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: "700",
  },
});
