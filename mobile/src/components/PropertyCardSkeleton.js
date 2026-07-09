import { StyleSheet, View } from "react-native";
import Skeleton from "./Skeleton.js";
import { useTheme } from "../context/ThemeContext.js";

export default function PropertyCardSkeleton() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <Skeleton style={styles.image} />
      <View style={styles.body}>
        <Skeleton style={styles.title} />
        <Skeleton style={styles.subtitle} />
        <Skeleton style={styles.price} />
        <View style={styles.metaRow}>
          <Skeleton style={styles.metaChip} />
          <Skeleton style={styles.metaChip} />
          <Skeleton style={styles.metaChip} />
        </View>
      </View>
    </View>
  );
}

export function PropertyCardSkeletonList({ count = 4 }) {
  return (
    <View>
      {Array.from({ length: count }, (_, index) => (
        <PropertyCardSkeleton key={index} />
      ))}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: "hidden",
      marginBottom: 16,
    },
    image: {
      width: "100%",
      aspectRatio: 16 / 10,
      borderRadius: 0,
    },
    body: {
      padding: 14,
      gap: 10,
    },
    title: {
      height: 16,
      width: "70%",
    },
    subtitle: {
      height: 13,
      width: "45%",
    },
    price: {
      height: 17,
      width: "35%",
    },
    metaRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 2,
    },
    metaChip: {
      height: 22,
      width: 64,
      borderRadius: 6,
    },
  });
