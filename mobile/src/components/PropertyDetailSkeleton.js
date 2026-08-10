import { ScrollView, StyleSheet, View } from "react-native";
import Skeleton from "./Skeleton.js";
import { useTheme } from "../context/ThemeContext.js";

export default function PropertyDetailSkeleton() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Skeleton style={styles.image} />
      <Skeleton style={styles.title} />
      <Skeleton style={styles.location} />

      <View style={styles.metaRow}>
        <Skeleton style={styles.metaItem} />
        <Skeleton style={styles.metaItem} />
        <Skeleton style={styles.metaItem} />
      </View>

      <Skeleton style={styles.line} />
      <Skeleton style={styles.lineShort} />

      <View style={[styles.section, colors.shadow]}>
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} style={styles.sectionRow} />
        ))}
      </View>

      <View style={styles.actions}>
        <Skeleton style={styles.actionButton} />
        <Skeleton style={styles.actionButton} />
        <Skeleton style={styles.actionButton} />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: 16,
      gap: 12,
      paddingBottom: 32,
    },
    image: {
      width: "100%",
      aspectRatio: 16 / 10,
      borderRadius: colors.radius,
    },
    title: {
      height: 20,
      width: "65%",
    },
    location: {
      height: 14,
      width: "40%",
    },
    metaRow: {
      flexDirection: "row",
      gap: 8,
    },
    metaItem: {
      height: 26,
      width: 72,
      borderRadius: colors.radiusSm,
    },
    line: {
      height: 14,
      width: "95%",
    },
    lineShort: {
      height: 14,
      width: "60%",
    },
    section: {
      borderWidth: colors.strokeWidth,
      borderColor: colors.stroke,
      borderRadius: colors.radius,
      padding: 14,
      gap: 10,
      backgroundColor: colors.surface,
    },
    sectionRow: {
      height: 14,
      width: "100%",
    },
    actions: {
      gap: 8,
      marginTop: 8,
    },
    actionButton: {
      height: 46,
      width: "100%",
      borderRadius: 999,
    },
  });
