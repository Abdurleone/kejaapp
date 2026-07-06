import { StyleSheet, View } from "react-native";
import Skeleton from "./Skeleton.js";
import colors from "../theme/colors.js";

function SkeletonTile() {
  return (
    <View style={styles.tile}>
      <Skeleton style={styles.value} />
      <Skeleton style={styles.label} />
    </View>
  );
}

export default function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonTile key={index} />
        ))}
      </View>

      <View style={styles.panel}>
        <Skeleton style={styles.title} />
        <View style={styles.row}>
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonTile key={index} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    flexGrow: 1,
    minWidth: 130,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  value: {
    height: 20,
    width: "50%",
  },
  label: {
    height: 13,
    width: "80%",
  },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  title: {
    height: 16,
    width: "45%",
  },
});
