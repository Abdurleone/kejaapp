import { useEffect, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Bungee_400Regular } from "@expo-google-fonts/bungee";
import { WorkSans_400Regular, WorkSans_800ExtraBold } from "@expo-google-fonts/work-sans";
import { AuthProvider } from "./src/context/AuthContext.js";
import { SettingsProvider } from "./src/context/SettingsContext.js";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext.js";
import RootNavigator from "./src/navigation/RootNavigator.js";

// Held visible until the matatu-poster fonts resolve (see src/theme/
// typography.js for the registered names used in fontFamily styles) - keeps
// a cold start from flashing the OS system font before swapping to Bungee/
// Work Sans a moment later.
SplashScreen.preventAutoHideAsync();

// @sentry/react-native's NativeRNSentry.js calls
// TurboModuleRegistry.getEnforcing('RNSentry') as an *import-time* side
// effect, which throws (crashing the whole app natively, before any JS
// error boundary can catch it) inside Expo Go - it doesn't ship that native
// module. So, same as pushNotifications.js's expo-notifications guard, the
// package must only ever be required lazily, from inside this check -
// never imported at the top of this file.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const Sentry = isExpoGo ? null : require("@sentry/react-native");

// Optional, same "empty = disabled" pattern as GoogleSignInButton.js's client
// IDs: unset means crashes/errors are only visible locally, not reported to
// Sentry. See mobile/.env.example.
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (Sentry && sentryDsn) {
  Sentry.init({ dsn: sentryDsn });
}

function ThemedApp() {
  const { colorMode, colors } = useTheme();
  const navigationTheme = {
    ...(colorMode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorMode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.bg,
      card: colors.surface,
      text: colors.ink,
      border: colors.line,
      primary: colors.green,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={colorMode === "dark" ? "light" : "dark"} />
      <RootNavigator />
    </NavigationContainer>
  );
}

function App() {
  const [fontsLoaded, fontError] = useFonts({
    Bungee_400Regular,
    WorkSans_400Regular,
    WorkSans_800ExtraBold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <AuthProvider>
            <ThemedApp />
          </AuthProvider>
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

export default Sentry ? Sentry.wrap(App) : App;
