import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext.js";

const iconByMode = {
  system: "contrast-outline",
  light: "sunny",
  dark: "moon",
};

const labelByMode = {
  system: "Color mode: matching system. Double tap to switch to light mode.",
  light: "Color mode: light. Double tap to switch to dark mode.",
  dark: "Color mode: dark. Double tap to switch to matching system.",
};

// Icon-only color-mode control, mirroring the web app's System/Light/Dark
// choice but as a single tap target (mobile header space is tighter than a
// segmented control) that cycles system -> light -> dark -> system.
export default function ColorModeToggle({ color }) {
  const { colorMode, toggleColorMode, colors } = useTheme();

  return (
    <Pressable
      onPress={toggleColorMode}
      style={styles.button}
      hitSlop={10}
      accessibilityLabel={labelByMode[colorMode]}
      accessibilityRole="button"
    >
      <Ionicons name={iconByMode[colorMode]} size={20} color={color || colors.accentText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
});
