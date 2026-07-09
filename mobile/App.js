import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext.js";
import { SettingsProvider } from "./src/context/SettingsContext.js";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext.js";
import RootNavigator from "./src/navigation/RootNavigator.js";

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
      primary: colors.greenDark,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={colorMode === "dark" ? "light" : "dark"} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
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
