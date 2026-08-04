import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  changeCurrentUserPassword,
  deleteCurrentAccount,
  deleteSavedSearch,
  fetchSavedSearches,
  updateCurrentUser,
} from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";

const minPasswordLength = 8;
const deleteConfirmationPhrase = "DELETE";

// Matches render.yaml's kejaapp-frontend service name/URL - update this if
// you deploy under a different Render service name or a custom domain.
// Terms/Privacy content lives only on the web app (frontend/src/pages/
// TermsPage.jsx, DataProtectionPage.jsx) - mobile links out rather than
// duplicating that content natively, so it can't drift out of sync.
const webAppBaseUrl = "https://kejaapp-frontend.onrender.com";

const openLegalPage = (path) => {
  Linking.openURL(`${webAppBaseUrl}${path}`).catch(() => {});
};

function describeSavedSearch(savedSearch) {
  const parts = [];

  if (savedSearch.lat != null && savedSearch.lng != null) {
    parts.push(`within ${savedSearch.radiusKm || 5}km of a location`);
  }

  if (savedSearch.county) parts.push(`in ${savedSearch.county}`);
  if (savedSearch.town) parts.push(`near ${savedSearch.town}`);
  if (savedSearch.type) parts.push(savedSearch.type);
  if (savedSearch.bedrooms) parts.push(`${savedSearch.bedrooms}+ bed`);
  if (savedSearch.minRent || savedSearch.maxRent) {
    parts.push(`KES ${savedSearch.minRent || 0}-${savedSearch.maxRent || "any"}`);
  }

  return parts.length > 0 ? parts.join(", ") : "Any listing";
}

function SavedSearchesCard({ styles }) {
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setError("");

    try {
      const data = await fetchSavedSearches();
      setSavedSearches(data);
    } catch (err) {
      setError(err.message || "Failed to load your saved searches.");
    }
  }, []);

  useEffect(() => {
    // Kicking off a real fetch here, not deriving avoidable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleDelete = async (savedSearchId) => {
    setDeletingId(savedSearchId);

    try {
      await deleteSavedSearch(savedSearchId);
      setSavedSearches((current) => current.filter((item) => item._id !== savedSearchId));
    } catch (err) {
      setError(err.message || "Could not delete this saved search.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Saved searches</Text>
      {loading ? (
        <Text style={styles.subtitleSmall}>Loading...</Text>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : savedSearches.length === 0 ? (
        <Text style={styles.subtitleSmall}>
          You have no saved searches yet. Save one from the Discover tab&apos;s location filters.
        </Text>
      ) : (
        savedSearches.map((savedSearch) => (
          <View key={savedSearch._id} style={styles.savedSearchRow}>
            <Text style={styles.savedSearchText}>{describeSavedSearch(savedSearch)}</Text>
            <Pressable disabled={deletingId === savedSearch._id} onPress={() => handleDelete(savedSearch._id)}>
              <Text style={styles.removeText}>{deletingId === savedSearch._id ? "Removing..." : "Remove"}</Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

function ProfileCard({ styles, user, updateUser }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const startEditing = () => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
    setError("");
    setSavedMessage("");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updated = await updateCurrentUser({ name: name.trim(), phone: phone.trim() });
      updateUser?.(updated);
      setEditing(false);
      setSavedMessage("Profile updated.");
    } catch (err) {
      setError(err.message || "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>Profile</Text>
        {!editing ? (
          <Pressable onPress={startEditing}>
            <Text style={styles.editLink}>Edit</Text>
          </Pressable>
        ) : null}
      </View>

      {editing ? (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} accessibilityLabel="Name" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              accessibilityLabel="Phone"
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.editActions}>
            <Pressable style={styles.primaryButtonSmall} onPress={handleSave} disabled={saving}>
              <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save"}</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButtonSmall}
              onPress={() => setEditing(false)}
              disabled={saving}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <DetailRow label="Name" value={user?.name || "Not set"} styles={styles} />
          <DetailRow label="Username" value={user?.username || "Not set"} styles={styles} />
          <DetailRow label="Email" value={user?.email || "Not set"} styles={styles} />
          <DetailRow label="Role" value={user?.role || "Not set"} styles={styles} />
          <DetailRow label="Phone" value={user?.phone || "Not set"} styles={styles} />
          {savedMessage ? <Text style={styles.success}>{savedMessage}</Text> : null}
        </>
      )}
    </View>
  );
}

function ChangePasswordCard({ styles }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async () => {
    setError("");
    setSuccessMessage("");

    if (newPassword.length < minPasswordLength) {
      setError(`New password must be at least ${minPasswordLength} characters.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setSaving(true);

    try {
      await changeCurrentUserPassword({ currentPassword, newPassword });
      setSuccessMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Could not change your password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Change password</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Current password</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          accessibilityLabel="Current password"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>New password</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          accessibilityLabel="New password"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Confirm new password</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          accessibilityLabel="Confirm new password"
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
      <Pressable style={styles.primaryButtonSmall} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.primaryButtonText}>{saving ? "Updating..." : "Change password"}</Text>
      </Pressable>
    </View>
  );
}

function DangerZoneCard({ styles, logout }) {
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const canDelete = confirmation.trim() === deleteConfirmationPhrase;

  const handleDelete = async () => {
    setDeleting(true);
    setError("");

    try {
      await deleteCurrentAccount();
      await logout();
    } catch (err) {
      setError(err.message || "Could not delete your account.");
      setDeleting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete account",
      "This permanently deletes your profile, sessions, saved homes, notifications, inquiries, viewing requests, reviews, agency verification records, and any listings you own. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete my account", style: "destructive", onPress: handleDelete },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Delete account</Text>
      <Text style={styles.subtitleSmall}>
        Delete your profile, sessions, saved homes, notifications, inquiries, viewing requests, reviews,
        agency verification records, and any listings you own.
      </Text>
      <View style={styles.field}>
        <Text style={styles.label}>Type {deleteConfirmationPhrase} to confirm</Text>
        <TextInput
          style={styles.input}
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          accessibilityLabel={`Type ${deleteConfirmationPhrase} to confirm`}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.dangerButton, !canDelete && styles.dangerButtonDisabled]}
        onPress={confirmDelete}
        disabled={!canDelete || deleting}
      >
        <Text style={styles.dangerButtonText}>{deleting ? "Deleting..." : "Delete my account"}</Text>
      </Pressable>
    </View>
  );
}

export default function AccountScreen() {
  const navigation = useNavigation();
  const { user, signedIn, logout, updateUser } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const confirmSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logout },
    ]);
  };

  if (!signedIn) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.signedOutContainer}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Sign in to explore more options.</Text>
        <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.primaryButtonText}>Sign in</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("Register")}>
          <Text style={styles.secondaryButtonText}>Create account</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProfileCard styles={styles} user={user} updateUser={updateUser} />

      <ChangePasswordCard styles={styles} />

      {user?.role === "tenant" ? <SavedSearchesCard styles={styles} /> : null}

      <Pressable style={styles.dangerButton} onPress={confirmSignOut}>
        <Text style={styles.dangerButtonText}>Sign out</Text>
      </Pressable>

      <View style={styles.legalLinks}>
        <Pressable onPress={() => openLegalPage("/terms")}>
          <Text style={styles.legalLink}>Terms of Service</Text>
        </Pressable>
        <Pressable onPress={() => openLegalPage("/privacy")}>
          <Text style={styles.legalLink}>Privacy & Data Protection</Text>
        </Pressable>
      </View>

      <DangerZoneCard styles={styles} logout={logout} />
    </ScrollView>
  );
}

function DetailRow({ label, value, styles }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
      gap: 16,
    },
    signedOutContainer: {
      flexGrow: 1,
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
    cardTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.ink,
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    editLink: {
      color: colors.accentText,
      fontWeight: "700",
      fontSize: 13,
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.muted,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      backgroundColor: colors.bg,
      color: colors.ink,
    },
    editActions: {
      flexDirection: "row",
      gap: 12,
    },
    primaryButtonSmall: {
      backgroundColor: colors.greenDark,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
      alignItems: "center",
    },
    secondaryButtonSmall: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
      alignItems: "center",
    },
    subtitleSmall: {
      fontSize: 13,
      color: colors.muted,
    },
    error: {
      fontSize: 13,
      color: colors.red,
    },
    success: {
      fontSize: 13,
      color: colors.accentText,
      fontWeight: "700",
    },
    savedSearchRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      paddingVertical: 6,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    savedSearchText: {
      fontSize: 13,
      color: colors.ink,
      flexShrink: 1,
    },
    removeText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.red,
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
    dangerButtonDisabled: {
      opacity: 0.5,
    },
    dangerButtonText: {
      color: colors.white,
      fontWeight: "800",
    },
    legalLinks: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 20,
    },
    legalLink: {
      color: colors.muted,
      fontSize: 13,
      textDecorationLine: "underline",
    },
  });
