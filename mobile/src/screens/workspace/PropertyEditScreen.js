import { useCallback, useEffect, useMemo, useState } from "react";
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
import { fetchProperty, removePropertyImage, updateProperty, uploadPropertyImage } from "../../api/index.js";
import { resolveAssetUrl, useSettings } from "../../context/SettingsContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { pickImagesOrEmpty } from "../../utils/imagePicker.js";
import MessageView from "../../components/MessageView.js";
import {
  contactMethods,
  formToPropertyPayload,
  listingTypes,
  propertyStatuses,
  propertyToForm,
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

export default function PropertyEditScreen({ route, navigation }) {
  const { propertyId } = route.params;
  const { colors } = useTheme();
  const { apiBaseUrl } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [property, setProperty] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingImageId, setRemovingImageId] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [photoNotice, setPhotoNotice] = useState("");

  const load = useCallback(async () => {
    setLoadError("");

    try {
      const data = await fetchProperty(propertyId);
      setProperty(data);
      setForm(propertyToForm(data));
    } catch (err) {
      setLoadError(err.message || "Could not load this listing.");
    }
  }, [propertyId]);

  useEffect(() => {
    // Kicking off a real fetch here, not deriving avoidable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const updateField = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async () => {
    setError("");

    const validationError = validatePropertyForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      await updateProperty(propertyId, formToPropertyPayload(form, property));
      navigation.goBack();
    } catch (err) {
      setError(err.message || "Could not update this listing.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPhoto = async () => {
    setPhotoError("");
    setPhotoNotice("");

    const picked = await pickImagesOrEmpty();
    if (!picked.length) {
      return;
    }

    setUploadingPhoto(true);

    try {
      // Unlike create (which stages a batch and uploads after submit), the
      // property already exists here, so each pick uploads immediately -
      // one at a time keeps the busy/error state unambiguous per tap.
      const photo = picked[0];
      const result = await uploadPropertyImage(propertyId, {
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        data: photo.base64,
      });
      setProperty(result.data);
      setPhotoNotice(
        result.imageReview?.status && result.imageReview.status !== "clear"
          ? "Photo added, but it was flagged as a possible duplicate for admin review."
          : "Photo added."
      );
    } catch (err) {
      setPhotoError(err.message || "Could not upload this photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async (imageId) => {
    setPhotoError("");
    setPhotoNotice("");
    setRemovingImageId(imageId);

    try {
      const updated = await removePropertyImage(propertyId, imageId);
      setProperty(updated);
    } catch (err) {
      setPhotoError(err.message || "Could not remove this photo.");
    } finally {
      setRemovingImageId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.greenDark} />
      </View>
    );
  }

  if (loadError) {
    return (
      <MessageView title="Couldn't load this listing" message={loadError} actionLabel="Retry" onAction={load} />
    );
  }

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
        {property.images?.length > 0 ? (
          <View style={styles.photoGrid}>
            {property.images.map((image) => (
              <View style={styles.photoThumb} key={image._id}>
                <Image source={{ uri: resolveAssetUrl(image.url, apiBaseUrl) }} style={styles.photoImage} />
                <Pressable
                  style={styles.photoRemoveButton}
                  onPress={() => handleRemovePhoto(image._id)}
                  disabled={removingImageId === image._id}
                >
                  <Text style={styles.photoRemoveButtonText}>
                    {removingImageId === image._id ? "Removing..." : "Remove"}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.label}>No photos yet.</Text>
        )}
        {photoError ? <Text style={styles.error}>{photoError}</Text> : null}
        {!photoError && photoNotice ? <Text style={styles.notice}>{photoNotice}</Text> : null}
        <Pressable style={styles.secondaryButton} onPress={handleAddPhoto} disabled={uploadingPhoto}>
          {uploadingPhoto ? (
            <ActivityIndicator color={colors.greenDark} />
          ) : (
            <Text style={styles.secondaryButtonText}>Add photo</Text>
          )}
        </Pressable>

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
          <ChipRow
            options={contactMethods}
            value={form.contactPreferredMethod}
            onChange={updateField("contactPreferredMethod")}
            styles={styles}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={form.contactPhone} onChangeText={updateField("contactPhone")} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={form.contactEmail}
            onChangeText={updateField("contactEmail")}
            keyboardType="email-address"
          />
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
          <Text style={styles.primaryButtonText}>{submitting ? "Saving..." : "Save changes"}</Text>
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
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
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
    notice: {
      color: colors.greenDark,
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
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.greenDark,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
    },
    secondaryButtonText: {
      color: colors.greenDark,
      fontWeight: "800",
    },
    photoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    photoThumb: {
      width: "47%",
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 10,
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
      color: colors.red,
      fontWeight: "700",
      fontSize: 13,
    },
  });
