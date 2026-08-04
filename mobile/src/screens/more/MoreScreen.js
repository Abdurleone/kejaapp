import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext.js";
import { icons } from "../../navigation/tabScreens.js";

const labels = {
  Saved: "Saved",
  Workspace: "Workspace",
  Movers: "Movers",
  Requests: "Mover requests",
  Notifications: "Notifications",
  Feedback: "Feedback",
  Account: "Account",
  Admin: "Admin",
};

export default function MoreScreen({ navigation, hiddenTabs, unreadCount, onOpenNotifications }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handlePress = (name) => {
    if (name === "Notifications") {
      onOpenNotifications?.();
    }
    navigation.navigate(name);
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={hiddenTabs}
      keyExtractor={(name) => name}
      renderItem={({ item: name }) => (
        <Pressable style={styles.row} onPress={() => handlePress(name)}>
          <View style={styles.rowLeft}>
            <Ionicons name={icons[name]} size={22} color={colors.accentText} />
            <Text style={styles.rowLabel}>{labels[name] || name}</Text>
          </View>
          <View style={styles.rowRight}>
            {name === "Notifications" && unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
        </Pressable>
      )}
    />
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    list: {
      padding: 16,
      gap: 12,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    rowLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.ink,
    },
    rowRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    badge: {
      backgroundColor: colors.greenDark,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      minWidth: 22,
      alignItems: "center",
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.white,
    },
  });
