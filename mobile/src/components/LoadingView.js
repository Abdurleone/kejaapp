import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import colors from "../theme/colors.js";

export default function LoadingView({ label = "Loading..." }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.greenDark} size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  label: {
    color: colors.muted,
    fontSize: 14,
  },
});
