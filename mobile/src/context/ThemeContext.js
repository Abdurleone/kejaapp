import { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors } from "../theme/colors.js";

const COLOR_MODE_KEY = "keja_color_mode";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [colorMode, setColorModeState] = useState("light");

  useEffect(() => {
    AsyncStorage.getItem(COLOR_MODE_KEY).then((stored) => {
      if (stored === "dark" || stored === "light") {
        setColorModeState(stored);
      }
    });
  }, []);

  const setColorMode = async (mode) => {
    setColorModeState(mode);
    await AsyncStorage.setItem(COLOR_MODE_KEY, mode);
  };

  const toggleColorMode = () => setColorMode(colorMode === "dark" ? "light" : "dark");

  const value = useMemo(
    () => ({
      colorMode,
      colors: colorMode === "dark" ? darkColors : lightColors,
      setColorMode,
      toggleColorMode,
    }),
    [colorMode, toggleColorMode]
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
