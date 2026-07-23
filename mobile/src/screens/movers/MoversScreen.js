import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  affiliateMover,
  fetchMoverProfileStatus,
  fetchMovers,
  fetchReceivedMoverRequests,
  submitMoverProfile,
  unaffiliateMover,
  updateMoverRequestStatus,
} from "../../api/index.js";
import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { formatKes, formatStatusLabel, homeSizeOptions } from "../../utils/format.js";
import MessageView from "../../components/MessageView.js";

const listingManagerRoles = ["landlord", "agency"];

const serviceTypeOptions = [
  { value: "", label: "Any service" },
  { value: "local", label: "Local move" },
  { value: "long_distance", label: "Long distance" },
  { value: "packing", label: "Packing" },
  { value: "storage", label: "Storage" },
  { value: "office", label: "Office move" },
  { value: "furniture", label: "Furniture" },
];

const MoverCard = memo(function MoverCard({ mover, user, navigation, onAffiliateChange, styles }) {
  const [affiliateBusy, setAffiliateBusy] = useState(false);
  const [affiliateError, setAffiliateError] = useState("");
  const isAffiliated = (mover.affiliatedOwners || []).some((ownerId) => String(ownerId) === String(user?._id));

  const handleToggleAffiliate = async () => {
    setAffiliateError("");
    setAffiliateBusy(true);

    try {
      const updated = isAffiliated ? await unaffiliateMover(mover._id) : await affiliateMover(mover._id);
      onAffiliateChange(updated);
    } catch (err) {
      setAffiliateError(err.message || "Could not update affiliation.");
    } finally {
      setAffiliateBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>{mover.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{mover.verified ? "Verified" : "Unverified"}</Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>
        {mover.location?.town || "Kenya"}, {mover.location?.county || ""}
      </Text>
      <Text style={styles.cardMessage}>
        {(mover.serviceTypes || []).map((type) => formatStatusLabel(type)).join(", ") || "General moving"}
      </Text>
      <View style={styles.costRow}>
        <Text style={styles.costValue}>{formatKes(mover.basePrice)}</Text>
        <Text style={styles.costLabel}>base price</Text>
      </View>
      {mover.ratingCount > 0 ? (
        <Text style={styles.cardMessage}>
          {Number(mover.ratingAverage || 0).toFixed(1)} rating ({mover.ratingCount})
        </Text>
      ) : null}

      {listingManagerRoles.includes(user?.role) ? (
        <>
          {affiliateError ? <Text style={styles.error}>{affiliateError}</Text> : null}
          <Pressable style={styles.secondaryButton} onPress={handleToggleAffiliate} disabled={affiliateBusy}>
            <Text style={styles.secondaryButtonText}>
              {affiliateBusy ? "Updating..." : isAffiliated ? "Remove affiliate" : "Add as affiliate"}
            </Text>
          </Pressable>
        </>
      ) : null}

      {user?.role === "tenant" ? (
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate("MoverRequestForm", { moverId: mover._id, moverName: mover.name })}
        >
          <Text style={styles.primaryButtonText}>Request service</Text>
        </Pressable>
      ) : null}

      {!user ? (
        <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.primaryButtonText}>Sign in to request service</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

function MoverDirectory({ styles }) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [movers, setMovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ serviceType: "", county: "" });
  const [countyInput, setCountyInput] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  // Debounce the county text input into `filters.county` so typing doesn't
  // fire a request per keystroke - the active-flag guard below already
  // makes any given request race-safe, but there's no reason to fire ten
  // requests for one typed word.
  useEffect(() => {
    let active = true;

    const timeoutId = setTimeout(() => {
      if (!active) return;

      // Bail out (return the same reference) when the value hasn't actually
      // changed, e.g. on mount - otherwise this would fire a phantom
      // no-op refetch 300ms after every mount, since a new object
      // reference alone is enough to trigger the fetch effect below.
      setFilters((current) => (current.county === countyInput ? current : { ...current, county: countyInput }));
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [countyInput]);

  // Deriving the fetch from filters/retryKey (rather than exposing a shared
  // load callback that the effect, Retry action, and pull-to-refresh all
  // called independently) is what makes the active-flag guard actually
  // work: React runs this effect's cleanup before the next one fires
  // whenever filters/retryKey changes, so a still-in-flight, now-stale
  // request can never overwrite a newer one.
  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchMovers(filters);
        if (active) setMovers(data);
      } catch (err) {
        if (active) setError(err.message || "Failed to load movers.");
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [filters, retryKey]);

  const handleRefresh = () => {
    setRefreshing(true);
    setRetryKey((key) => key + 1);
  };

  const handleAffiliateChange = useCallback((updatedMover) => {
    setMovers((current) => current.map((mover) => (mover._id === updatedMover._id ? updatedMover : mover)));
  }, []);

  const renderMoverItem = useCallback(
    ({ item }) => (
      <MoverCard mover={item} user={user} navigation={navigation} onAffiliateChange={handleAffiliateChange} styles={styles} />
    ),
    [user, navigation, handleAffiliateChange, styles]
  );

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.list}>
        <Text style={styles.cardMessage}>Loading movers...</Text>
      </ScrollView>
    );
  }

  if (error) {
    return (
      <MessageView
        title="Couldn't load movers"
        message={error}
        actionLabel="Retry"
        onAction={() => setRetryKey((key) => key + 1)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {serviceTypeOptions.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.filterChip, filters.serviceType === option.value && styles.filterChipActive]}
            onPress={() => setFilters((current) => ({ ...current, serviceType: option.value }))}
          >
            <Text
              style={[styles.filterChipText, filters.serviceType === option.value && styles.filterChipTextActive]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.input}
        value={countyInput}
        onChangeText={setCountyInput}
        placeholder="Filter by county (e.g. Nairobi)"
      />

      {movers.length === 0 ? (
        <MessageView title="No movers found" message="Try widening your filters." />
      ) : (
        <FlatList
          data={movers}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={renderMoverItem}
        />
      )}
    </View>
  );
}

const emptyProfileForm = {
  name: "",
  phone: "",
  email: "",
  serviceTypes: [],
  county: "",
  town: "",
  areasServed: "",
  basePrice: "",
};

function MoverProfilePanel({ profile, onSaved, styles }) {
  const [editing, setEditing] = useState(profile.status === "not_submitted");
  const [form, setForm] = useState(() =>
    profile.status === "not_submitted"
      ? emptyProfileForm
      : {
          name: profile.name || "",
          phone: profile.phone || "",
          email: profile.email || "",
          serviceTypes: profile.serviceTypes || [],
          county: profile.location?.county || "",
          town: profile.location?.town || "",
          areasServed: (profile.location?.areasServed || []).join(", "),
          basePrice: profile.basePrice ? String(profile.basePrice) : "",
        }
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleServiceType = (value) => {
    setForm((current) => ({
      ...current,
      serviceTypes: current.serviceTypes.includes(value)
        ? current.serviceTypes.filter((type) => type !== value)
        : [...current.serviceTypes, value],
    }));
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);

    try {
      const updated = await submitMoverProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        serviceTypes: form.serviceTypes,
        basePrice: form.basePrice ? Number(form.basePrice) : undefined,
        location: {
          county: form.county.trim(),
          town: form.town.trim(),
          areasServed: form.areasServed
            .split(",")
            .map((area) => area.trim())
            .filter(Boolean),
        },
      });
      onSaved(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message || "Could not save your mover profile.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!editing) {
    return (
      <View style={styles.panel}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.panelTitle}>{profile.name}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{profile.verified ? "Verified" : "Not yet verified"}</Text>
          </View>
        </View>
        <Text style={styles.cardMessage}>
          {(profile.serviceTypes || []).map((type) => formatStatusLabel(type)).join(", ") || "No services set"}
        </Text>
        <Text style={styles.cardSubtitle}>
          {profile.location?.town || "-"}, {profile.location?.county || "-"}
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => setEditing(true)}>
          <Text style={styles.secondaryButtonText}>Edit profile</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Your mover profile</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Business name</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm((c) => ({ ...c, name: v }))} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={form.phone}
          onChangeText={(v) => setForm((c) => ({ ...c, phone: v }))}
          keyboardType="phone-pad"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={form.email}
          onChangeText={(v) => setForm((c) => ({ ...c, email: v }))}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Services offered</Text>
        <View style={styles.filterRow}>
          {serviceTypeOptions
            .filter((option) => option.value)
            .map((option) => (
              <Pressable
                key={option.value}
                style={[styles.filterChip, form.serviceTypes.includes(option.value) && styles.filterChipActive]}
                onPress={() => toggleServiceType(option.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    form.serviceTypes.includes(option.value) && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>County</Text>
        <TextInput style={styles.input} value={form.county} onChangeText={(v) => setForm((c) => ({ ...c, county: v }))} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Town</Text>
        <TextInput style={styles.input} value={form.town} onChangeText={(v) => setForm((c) => ({ ...c, town: v }))} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Areas served (comma separated)</Text>
        <TextInput
          style={styles.input}
          value={form.areasServed}
          onChangeText={(v) => setForm((c) => ({ ...c, areasServed: v }))}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Base price (KES)</Text>
        <TextInput
          style={styles.input}
          value={form.basePrice}
          onChangeText={(v) => setForm((c) => ({ ...c, basePrice: v }))}
          keyboardType="numeric"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.primaryButtonText}>{submitting ? "Saving..." : "Save profile"}</Text>
      </Pressable>
      {profile.status !== "not_submitted" ? (
        <Pressable style={styles.secondaryButton} onPress={() => setEditing(false)}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const MoverRequestRow = memo(function MoverRequestRow({ request, onStatusChange, styles, isHighlighted }) {
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleAction = async (status) => {
    setError("");
    setBusy(true);

    try {
      const updated = await updateMoverRequestStatus(request._id, { status, response: response.trim() });
      onStatusChange(updated);
    } catch (err) {
      setError(err.message || "Could not update this request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, isHighlighted && styles.cardHighlighted]}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>{request.tenant?.name || "Tenant"}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{formatStatusLabel(request.status)}</Text>
        </View>
      </View>
      {request.property?.title ? <Text style={styles.cardSubtitle}>Re: {request.property.title}</Text> : null}
      {request.homeSize ? (
        <Text style={styles.cardSubtitle}>
          Home size: {homeSizeOptions.find((option) => option.value === request.homeSize)?.label || request.homeSize}
        </Text>
      ) : null}
      {request.distanceKm !== undefined ? (
        <Text style={styles.cardSubtitle}>Pickup to drop-off: ~{request.distanceKm} km</Text>
      ) : null}
      {request.priceEstimate !== undefined ? (
        <Text style={styles.cardSubtitle}>Estimated price: {formatKes(request.priceEstimate)}</Text>
      ) : null}
      <Text style={styles.cardMessage}>{request.message}</Text>
      {request.preferredDate ? (
        <Text style={styles.cardSubtitle}>
          Preferred date: {new Date(request.preferredDate).toLocaleDateString()}
        </Text>
      ) : null}
      {request.response ? <Text style={styles.cardMessage}>Your response: {request.response}</Text> : null}

      {request.status === "pending" ? (
        <>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={response}
            onChangeText={setResponse}
            placeholder="Response (optional)"
            multiline
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actionsRow}>
            <Pressable style={styles.primaryButton} disabled={busy} onPress={() => handleAction("accepted")}>
              <Text style={styles.primaryButtonText}>Accept</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} disabled={busy} onPress={() => handleAction("declined")}>
              <Text style={styles.secondaryButtonText}>Decline</Text>
            </Pressable>
          </View>
        </>
      ) : null}
      {request.status === "accepted" ? (
        <Pressable style={styles.secondaryButton} disabled={busy} onPress={() => handleAction("completed")}>
          <Text style={styles.secondaryButtonText}>Mark completed</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

function MoverDashboard({ styles, highlightId }) {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [dismissedHighlightId, setDismissedHighlightId] = useState(null);
  const activeHighlightId = highlightId && highlightId !== dismissedHighlightId ? highlightId : null;

  useEffect(() => {
    if (!highlightId) return undefined;

    const timer = setTimeout(() => setDismissedHighlightId(highlightId), 5000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const load = useCallback(async () => {
    setError("");

    try {
      const profileData = await fetchMoverProfileStatus();
      setProfile(profileData);

      if (profileData.status !== "not_submitted") {
        const requestsData = await fetchReceivedMoverRequests();
        setRequests(requestsData);
      }
    } catch (err) {
      setError(err.message || "Failed to load your mover dashboard.");
    }
  }, []);

  useEffect(() => {
    // Kicking off a real fetch here, not deriving avoidable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleRequestStatusChange = useCallback((updated) => {
    setRequests((current) => current.map((request) => (request._id === updated._id ? updated : request)));
  }, []);

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.list}>
        <Text style={styles.cardMessage}>Loading your mover dashboard...</Text>
      </ScrollView>
    );
  }

  if (error) {
    return <MessageView title="Couldn't load dashboard" message={error} actionLabel="Retry" onAction={load} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <MoverProfilePanel profile={profile} onSaved={setProfile} styles={styles} />

      {profile.status !== "not_submitted" ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Received requests ({requests.length})</Text>
          {requests.length === 0 ? (
            <Text style={styles.cardMessage}>No service requests yet.</Text>
          ) : (
            requests.map((request) => (
              <MoverRequestRow
                key={request._id}
                request={request}
                onStatusChange={handleRequestStatusChange}
                styles={styles}
                isHighlighted={request._id === activeHighlightId}
              />
            ))
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

export default function MoversScreen({ route }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const highlightId = route?.params?.highlightId;

  if (user?.role === "mover") {
    return <MoverDashboard styles={styles} highlightId={highlightId} />;
  }

  return <MoverDirectory styles={styles} />;
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    list: {
      padding: 16,
      paddingTop: 8,
      gap: 12,
    },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    filterChip: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    filterChipActive: {
      backgroundColor: colors.greenDark,
      borderColor: colors.greenDark,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.ink,
    },
    filterChipTextActive: {
      color: colors.white,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      backgroundColor: colors.surface,
      color: colors.ink,
      marginHorizontal: 16,
      marginTop: 12,
    },
    textArea: {
      minHeight: 60,
      textAlignVertical: "top",
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.muted,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      padding: 14,
      gap: 8,
    },
    cardHighlighted: {
      borderColor: colors.greenDark,
      borderWidth: 2,
    },
    panel: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      padding: 14,
      gap: 10,
    },
    panelTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.ink,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.ink,
      flexShrink: 1,
    },
    cardSubtitle: {
      fontSize: 13,
      color: colors.muted,
    },
    cardMessage: {
      fontSize: 13,
      color: colors.ink,
    },
    costRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
    },
    costValue: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.greenDark,
    },
    costLabel: {
      fontSize: 12,
      color: colors.muted,
    },
    badge: {
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.greenDark,
    },
    error: {
      color: colors.red,
      fontSize: 13,
    },
    primaryButton: {
      backgroundColor: colors.greenDark,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
    },
    primaryButtonText: {
      color: colors.white,
      fontWeight: "800",
      fontSize: 13,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    secondaryButtonText: {
      color: colors.ink,
      fontWeight: "700",
      fontSize: 13,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 8,
    },
  });
