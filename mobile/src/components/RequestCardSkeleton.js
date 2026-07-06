import { StyleSheet, View } from "react-native";
import Skeleton from "./Skeleton.js";
import colors from "../theme/colors.js";

export default function RequestCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Skeleton style={styles.title} />
        <Skeleton style={styles.badge} />
      </View>
      <Skeleton style={styles.line} />
      <Skeleton style={styles.lineShort} />
    </View>
  );
}

export function RequestCardSkeletonList({ count = 4 }) {
  return (
    <View>
      {Array.from({ length: count }, (_, index) => (
        <RequestCardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    height: 15,
    width: "55%",
  },
  badge: {
    height: 20,
    width: 70,
    borderRadius: 999,
  },
  line: {
    height: 13,
    width: "90%",
  },
  lineShort: {
    height: 13,
    width: "60%",
  },
});
