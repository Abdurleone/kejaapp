import { StyleSheet, View } from "react-native";
import Skeleton from "./Skeleton.js";
import { useTheme } from "../context/ThemeContext.js";

function SkeletonTile({ styles, colors }) {
  return (
    <View style={[styles.tile, colors.shadowSm]}>
      <Skeleton style={styles.value} />
      <Skeleton style={styles.label} />
    </View>
  );
}

export default function DashboardSkeleton() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonTile key={index} styles={styles} colors={colors} />
        ))}
      </View>

      <View style={[styles.panel, colors.shadow]}>
        <Skeleton style={styles.title} />
        <View style={styles.row}>
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonTile key={index} styles={styles} colors={colors} />
          ))}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
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
      borderWidth: colors.strokeWidthSm,
      borderColor: colors.stroke,
      borderRadius: colors.radius,
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
      borderWidth: colors.strokeWidth,
      borderColor: colors.stroke,
      borderRadius: colors.radius,
      padding: 14,
      gap: 12,
    },
    title: {
      height: 16,
      width: "45%",
    },
  });
