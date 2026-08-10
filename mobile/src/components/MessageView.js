import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext.js";
import { bodyText, boldText } from "../theme/typography.js";

// Shared empty-state / error-state / sign-in-required panel.
export default function MessageView({ title, message, actionLabel, onAction }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable style={styles.button} onPress={onAction}>
          <Text style={styles.buttonLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: 32,
    },
    title: {
      ...boldText,
      fontSize: 18,
      color: colors.ink,
      textAlign: "center",
    },
    message: {
      ...bodyText,
      fontSize: 14,
      color: colors.muted,
      textAlign: "center",
    },
    button: {
      marginTop: 12,
      backgroundColor: colors.green,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 999,
    },
    buttonLabel: {
      ...boldText,
      color: colors.onAccent,
    },
  });
