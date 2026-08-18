import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors } from "../theme/colors.js";

const COLOR_MODE_KEY = "jakez_color_mode";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [colorMode, setColorModeState] = useState("system");
  const [systemColorScheme, setSystemColorScheme] = useState(() => Appearance.getColorScheme() || "light");

  useEffect(() => {
    AsyncStorage.getItem(COLOR_MODE_KEY).then((stored) => {
      if (stored === "dark" || stored === "light" || stored === "system") {
        setColorModeState(stored);
      }
    });
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme || "light");
    });
    return () => subscription.remove();
  }, []);

  const setColorMode = useCallback(async (mode) => {
    setColorModeState(mode);
    await AsyncStorage.setItem(COLOR_MODE_KEY, mode);
  }, []);

  // Header space is too tight for a 3-way segmented control (see web's
  // radiogroup instead), so the single icon button cycles through all
  // three states: system -> light -> dark -> system.
  const toggleColorMode = useCallback(
    () => setColorMode(colorMode === "system" ? "light" : colorMode === "light" ? "dark" : "system"),
    [colorMode, setColorMode]
  );

  const resolvedColorMode = colorMode === "system" ? systemColorScheme : colorMode;

  const value = useMemo(
    () => ({
      colorMode,
      resolvedColorMode,
      colors: resolvedColorMode === "dark" ? darkColors : lightColors,
      setColorMode,
      toggleColorMode,
    }),
    [colorMode, resolvedColorMode, setColorMode, toggleColorMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
