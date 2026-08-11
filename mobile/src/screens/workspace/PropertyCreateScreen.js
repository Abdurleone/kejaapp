import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createProperty, uploadPropertyImage } from "../../api/index.js";
import { useTheme } from "../../context/ThemeContext.js";
import { pickImagesOrEmpty } from "../../utils/imagePicker.js";
import { bodyText, boldText } from "../../theme/typography.js";
import {
  contactMethods,
  emptyPropertyForm,
  formToPropertyPayload,
  listingTypes,
  propertyStatuses,
  validatePropertyForm,
  viewingTypes,
} from "./propertyForm.js";

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
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [form, setForm] = useState(emptyPropertyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Photos are picked here but can't actually be uploaded until the property
  // exists server-side, so they're staged locally (previewed from their
  // on-device uri) and uploaded right after createProperty succeeds - the
  // form still reads as one page/one submit to the user.
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [pickingPhotos, setPickingPhotos] = useState(false);

  const updateField = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  const handleAddPhotos = async () => {
    setPickingPhotos(true);

    try {
      const picked = await pickImagesOrEmpty();
      if (picked.length) {
        setPendingPhotos((current) => [...current, ...picked]);
      }
    } finally {
      setPickingPhotos(false);
    }
  };

  const handleRemovePendingPhoto = (uri) => {
    setPendingPhotos((current) => current.filter((photo) => photo.uri !== uri));
  };

  const handleSubmit = async () => {
    setError("");

    const validationError = validatePropertyForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const created = await createProperty(formToPropertyPayload(form));

      // Best-effort: the listing itself is already created at this point, so
      // a photo failing to upload shouldn't block navigating away - it can
      // still be added later from the workspace.
      for (const photo of pendingPhotos) {
        try {
          await uploadPropertyImage(created._id, {
            fileName: photo.fileName,
            mimeType: photo.mimeType,
            data: photo.base64,
          });
        } catch {
          // Ignored - see comment above.
        }
      }

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
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={updateField("title")}
          maxLength={140}
          accessibilityLabel="Title"
        />
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

      <View style={styles.field}>
        <Text style={styles.label}>Status</Text>
        <ChipRow options={propertyStatuses} value={form.status} onChange={updateField("status")} styles={styles} />
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

      <Text style={styles.sectionTitle}>Photos</Text>
      {pendingPhotos.length > 0 ? (
        <View style={styles.photoGrid}>
          {pendingPhotos.map((photo) => (
            <View style={styles.photoThumb} key={photo.uri}>
              <Image source={{ uri: photo.uri }} style={styles.photoImage} />
              <Pressable style={styles.photoRemoveButton} onPress={() => handleRemovePendingPhoto(photo.uri)}>
                <Text style={styles.photoRemoveButtonText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.label}>No photos selected yet.</Text>
      )}
      <Pressable style={styles.secondaryButton} onPress={handleAddPhotos} disabled={pickingPhotos}>
        {pickingPhotos ? (
          <ActivityIndicator color={colors.green} />
        ) : (
          <Text style={styles.secondaryButtonText}>Select photos</Text>
        )}
      </Pressable>

      <Text style={styles.sectionTitle}>Cost</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Monthly rent (KES)</Text>
        <TextInput
          style={styles.input}
          value={form.rent}
          onChangeText={updateField("rent")}
          keyboardType="number-pad"
          accessibilityLabel="Monthly rent (KES)"
        />
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
      <View style={styles.field}>
        <Text style={styles.label}>Viewing instructions</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.viewingInstructions}
          onChangeText={updateField("viewingInstructions")}
          multiline
          numberOfLines={3}
          maxLength={1000}
        />
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
      <View style={styles.field}>
        <Text style={styles.label}>Available hours</Text>
        <TextInput
          style={styles.input}
          value={form.contactAvailableHours}
          onChangeText={updateField("contactAvailableHours")}
          placeholder="e.g. 8am - 6pm daily"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Contact notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.contactNotes}
          onChangeText={updateField("contactNotes")}
          multiline
          numberOfLines={2}
          maxLength={500}
        />
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
    ...boldText,
    fontSize: 13,
    color: colors.muted,
  },
  sectionTitle: {
    ...boldText,
    fontSize: 15,
    color: colors.ink,
    marginTop: 6,
  },
  input: {
    ...bodyText,
    borderWidth: colors.strokeWidthSm,
    borderColor: colors.stroke,
    borderRadius: colors.radiusSm,
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
    borderWidth: colors.strokeWidthSm,
    borderColor: colors.stroke,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  chipText: {
    ...boldText,
    color: colors.ink,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.onAccent,
  },
  error: {
    ...bodyText,
    color: colors.red,
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    ...boldText,
    color: colors.onAccent,
  },
  secondaryButton: {
    borderWidth: colors.strokeWidthSm,
    borderColor: colors.green,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    ...boldText,
    color: colors.green,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoThumb: {
    width: "47%",
    borderWidth: colors.strokeWidthSm,
    borderColor: colors.stroke,
    borderRadius: colors.radiusSm,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  photoImage: {
    width: "100%",
    aspectRatio: 4 / 3,
  },
  photoRemoveButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  photoRemoveButtonText: {
    ...boldText,
    color: colors.red,
    fontSize: 13,
  },
  });
