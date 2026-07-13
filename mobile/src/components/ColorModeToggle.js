import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext.js";

// Icon-only color-mode switch, mirroring the web app's sun/moon toggle but
// as a single tap target (mobile header space is tighter than a segmented
// control) rather than wording like "Dark mode".
export default function ColorModeToggle({ color }) {
  const { colorMode, toggleColorMode, colors } = useTheme();

  return (
    <Pressable
      onPress={toggleColorMode}
      style={styles.button}
      hitSlop={10}
      accessibilityLabel={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      accessibilityRole="button"
    >
      <Ionicons
        name={colorMode === "dark" ? "moon" : "sunny"}
        size={20}
        color={color || colors.greenDark}
      />
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
