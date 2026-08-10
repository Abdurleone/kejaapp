import { useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import GoogleSignInButton from "../../components/GoogleSignInButton.js";
import { useAuth } from "../../context/AuthContext.js";
import { useSettings } from "../../context/SettingsContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { bodyText, boldText, displayText } from "../../theme/typography.js";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { apiBaseUrl, setApiBaseUrl } = useSettings();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [serverInput, setServerInput] = useState("");

  useEffect(() => {
    // Syncing serverInput from apiBaseUrl once it loads asynchronously from
    // storage - serverInput then stays independently editable afterward, so
    // this can't be computed at render time from apiBaseUrl directly.
    if (apiBaseUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerInput(apiBaseUrl);
    }
  }, [apiBaseUrl]);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      await login({ identifier: identifier.trim(), password });
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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={[colors.green, "#0d2318", "#060b08"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Image
            source={require("../../../assets/keja-logo.png")}
            style={styles.watermark}
            resizeMode="contain"
          />
          <Text style={styles.brand}>KejaApp</Text>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroSubtitle}>Find and manage your rentals in Kenya.</Text>
        </LinearGradient>

        <View style={styles.container}>
          <View style={styles.field}>
            <Text style={styles.label}>Email or username</Text>
            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoComplete="username"
              accessibilityLabel="Email or username"
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
              accessibilityLabel="Password"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? "Signing in..." : "Sign in"}</Text>
          </Pressable>

          <GoogleSignInButton
            onAuthenticated={() => navigation.goBack()}
            onError={(message) => setError(message)}
          />

          <Pressable onPress={() => navigation.navigate("Register")}>
            <Text style={styles.link}>Need an account? Register</Text>
          </Pressable>

          {__DEV__ ? (
            <>
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
                    value={serverInput}
                    onChangeText={setServerInput}
                    autoCapitalize="none"
                    placeholder="http://192.168.1.20:5000"
                  />
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => setApiBaseUrl(serverInput.trim())}
                  >
                    <Text style={styles.secondaryButtonText}>Save server address</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    scrollContent: {
      flexGrow: 1,
    },
    hero: {
      position: "relative",
      overflow: "hidden",
      paddingHorizontal: 24,
      paddingVertical: 36,
      gap: 6,
    },
    watermark: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.14,
    },
    brand: {
      ...displayText,
      fontSize: 13,
      color: "rgba(255, 255, 255, 0.8)",
      letterSpacing: 1,
    },
    heroTitle: {
      ...displayText,
      fontSize: 28,
      color: colors.onAccent,
    },
    heroSubtitle: {
      ...bodyText,
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.86)",
    },
    container: {
      padding: 24,
      gap: 12,
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
    settingsToggle: {
      marginTop: 24,
    },
    settingsToggleText: {
      ...bodyText,
      color: colors.muted,
      fontSize: 12,
      textAlign: "center",
    },
    secondaryButton: {
      borderWidth: colors.strokeWidthSm,
      borderColor: colors.stroke,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: "center",
    },
    secondaryButtonText: {
      ...boldText,
      color: colors.ink,
    },
  });
