import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext.js";
import colors from "../../theme/colors.js";

export default function AccountScreen() {
  const navigation = useNavigation();
  const { user, signedIn, logout } = useAuth();

  const confirmSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logout },
    ]);
  };

  if (!signedIn) {
    return (
      <View style={styles.signedOutContainer}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Sign in to manage your profile and view your activity.</Text>
        <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.primaryButtonText}>Sign in</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("Register")}>
          <Text style={styles.secondaryButtonText}>Create account</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <DetailRow label="Name" value={user?.name || "Not set"} />
        <DetailRow label="Username" value={user?.username || "Not set"} />
        <DetailRow label="Email" value={user?.email || "Not set"} />
        <DetailRow label="Role" value={user?.role || "Not set"} />
        <DetailRow label="Phone" value={user?.phone || "Not set"} />
      </View>

      <Pressable style={styles.dangerButton} onPress={confirmSignOut}>
        <Text style={styles.dangerButtonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
    gap: 16,
  },
  signedOutContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  detailRow: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 15,
    color: colors.ink,
  },
  primaryButton: {
    backgroundColor: colors.greenDark,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: "700",
  },
  dangerButton: {
    backgroundColor: colors.red,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
});
