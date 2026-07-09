import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createProperty } from "../../api/index.js";
import { useTheme } from "../../context/ThemeContext.js";

const listingTypes = ["apartment", "bedsitter", "maisonette", "house", "studio", "other"];
const viewingTypes = ["scheduled", "open"];
const contactMethods = [
  { value: "inquiry", label: "In-app inquiry" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

const emptyForm = {
  title: "",
  description: "",
  type: "apartment",
  viewingType: "scheduled",
  rent: "",
  deposit: "",
  agencyFee: "",
  county: "",
  town: "",
  area: "",
  bedrooms: "",
  bathrooms: "",
  amenities: "",
  contactPreferredMethod: "inquiry",
  contactPhone: "",
  contactEmail: "",
  contactWhatsapp: "",
};

const formToPayload = (form) => {
  const contact = {
    preferredMethod: form.contactPreferredMethod,
    phone: form.contactPhone.trim(),
    whatsapp: form.contactWhatsapp.trim(),
  };

  // The backend rejects an empty-string contact.email (fails its format
  // check), so only include it when the landlord actually entered one.
  if (form.contactEmail.trim()) {
    contact.email = form.contactEmail.trim();
  }

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type,
    viewingType: form.viewingType,
    price: {
      rent: Number(form.rent) || 0,
      deposit: Number(form.deposit) || 0,
      agencyFee: Number(form.agencyFee) || 0,
    },
    location: {
      county: form.county.trim(),
      town: form.town.trim(),
      area: form.area.trim(),
    },
    bedrooms: Number(form.bedrooms) || 0,
    bathrooms: Number(form.bathrooms) || 0,
    amenities: form.amenities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    contact,
  };
};

function ChipRow({ options, value, onChange, styles }) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const optionValue = option.value ?? option;
        const optionLabel = option.label ?? option;

        return (
          <Pressable
            key={optionValue}
            style={[styles.chip, value === optionValue && styles.chipActive]}
            onPress={() => onChange(optionValue)}
          >
            <Text style={[styles.chipText, value === optionValue && styles.chipTextActive]}>{optionLabel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function PropertyCreateScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async () => {
    setError("");

    if (!form.title.trim() || form.title.trim().length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }

    if (form.rent === "" || Number(form.rent) < 0) {
      setError("Monthly rent is required and must be 0 or more.");
      return;
    }

    setSubmitting(true);

    try {
      await createProperty(formToPayload(form));
      navigation.goBack();
    } catch (err) {
      setError(err.message || "Could not create this listing.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.field}>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={form.title} onChangeText={updateField("title")} maxLength={140} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.description}
          onChangeText={updateField("description")}
          multiline
          numberOfLines={4}
          maxLength={2000}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Type</Text>
        <ChipRow options={listingTypes} value={form.type} onChange={updateField("type")} styles={styles} />
      </View>

      <View style={styles.row}>
        <View style={[styles.field, styles.half]}>
          <Text style={styles.label}>Bedrooms</Text>
          <TextInput
            style={styles.input}
            value={form.bedrooms}
            onChangeText={updateField("bedrooms")}
            keyboardType="number-pad"
          />
        </View>
        <View style={[styles.field, styles.half]}>
          <Text style={styles.label}>Bathrooms</Text>
          <TextInput
            style={styles.input}
            value={form.bathrooms}
            onChangeText={updateField("bathrooms")}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Amenities (comma separated)</Text>
        <TextInput
          style={styles.input}
          value={form.amenities}
          onChangeText={updateField("amenities")}
          placeholder="Parking, Wifi, Borehole"
        />
      </View>

      <Text style={styles.sectionTitle}>Cost</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Monthly rent (KES)</Text>
        <TextInput style={styles.input} value={form.rent} onChangeText={updateField("rent")} keyboardType="number-pad" />
      </View>
      <View style={styles.row}>
        <View style={[styles.field, styles.half]}>
          <Text style={styles.label}>Deposit (KES)</Text>
          <TextInput
            style={styles.input}
            value={form.deposit}
            onChangeText={updateField("deposit")}
            keyboardType="number-pad"
          />
        </View>
        <View style={[styles.field, styles.half]}>
          <Text style={styles.label}>Agency fee (KES)</Text>
          <TextInput
            style={styles.input}
            value={form.agencyFee}
            onChangeText={updateField("agencyFee")}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Location</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Area</Text>
        <TextInput style={styles.input} value={form.area} onChangeText={updateField("area")} />
      </View>
      <View style={styles.row}>
        <View style={[styles.field, styles.half]}>
          <Text style={styles.label}>Town</Text>
          <TextInput style={styles.input} value={form.town} onChangeText={updateField("town")} />
        </View>
        <View style={[styles.field, styles.half]}>
          <Text style={styles.label}>County</Text>
          <TextInput style={styles.input} value={form.county} onChangeText={updateField("county")} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Viewing</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Viewing type</Text>
        <ChipRow options={viewingTypes} value={form.viewingType} onChange={updateField("viewingType")} styles={styles} />
      </View>

      <Text style={styles.sectionTitle}>Contact</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Preferred method</Text>
        <ChipRow options={contactMethods} value={form.contactPreferredMethod} onChange={updateField("contactPreferredMethod")} styles={styles} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={form.contactPhone} onChangeText={updateField("contactPhone")} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={form.contactEmail} onChangeText={updateField("contactEmail")} keyboardType="email-address" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>WhatsApp</Text>
        <TextInput style={styles.input} value={form.contactWhatsapp} onChangeText={updateField("contactWhatsapp")} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.primaryButtonText}>{submitting ? "Creating..." : "Create listing"}</Text>
      </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    padding: 16,
    gap: 14,
    backgroundColor: colors.bg,
    flexGrow: 1,
  },
  field: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  half: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
  },
  chipText: {
    color: colors.ink,
    fontWeight: "700",
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.white,
  },
  error: {
    color: colors.red,
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: colors.greenDark,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
  });
