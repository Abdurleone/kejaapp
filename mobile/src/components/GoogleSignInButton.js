import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../context/AuthContext.js";
import { useTheme } from "../context/ThemeContext.js";

WebBrowser.maybeCompleteAuthSession();

// expo-auth-session's Google provider requires a client ID for whichever
// platform it's actually running on (iOS/Android/web) - there's no single
// ID that works everywhere, so all three are configured in Google Cloud
// Console (see docs/Authentication.md). Renders nothing until the one
// relevant to the current platform is set, same "empty = disabled"
// convention the backend/web already follow.
const placeholderClientId = "not-configured";

export default function GoogleSignInButton({ onAuthenticated, onError }) {
  const { loginWithGoogle } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const clientIdForPlatform = Platform.select({
    ios: iosClientId,
    android: androidClientId,
    default: webClientId,
  });

  // Rules of Hooks means this must always be called, even before any client
  // ID exists - a placeholder for whichever field is missing keeps the
  // hook's own invariant from throwing; nothing renders/prompts against it
  // (see the `!clientIdForPlatform` check below) until it's real.
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: iosClientId || placeholderClientId,
    androidClientId: androidClientId || placeholderClientId,
    webClientId: webClientId || placeholderClientId,
    responseType: "id_token",
  });

  useEffect(() => {
    if (response?.type !== "success") {
      return;
    }

    const idToken = response.params?.id_token;

    if (!idToken) {
      onError?.("Google sign-in did not return a credential");
      return;
    }

    loginWithGoogle(idToken)
      .then((user) => onAuthenticated?.(user))
      .catch((err) => {
        onError?.(err.message || "Google sign-in failed");
      });
  }, [response, loginWithGoogle, onAuthenticated, onError]);

  if (!clientIdForPlatform) {
    return null;
  }

  return (
    <Pressable
      style={styles.button}
      disabled={!request}
      onPress={() => promptAsync()}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google"
    >
      <Text style={styles.text}>Sign in with Google</Text>
    </Pressable>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    button: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: colors.surface,
      marginTop: 4,
    },
    text: {
      color: colors.ink,
      fontWeight: "700",
    },
  });
