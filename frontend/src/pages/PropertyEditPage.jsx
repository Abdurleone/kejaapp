import { useEffect, useState } from "react";
import PropertyDetailSkeleton from "../components/PropertyDetailSkeleton.jsx";
import PropertyForm, {
  formToPropertyPayload,
  propertyToForm,
  validatePropertyForm,
} from "../components/PropertyForm.jsx";
import PropertyImageManager from "../components/PropertyImageManager.jsx";
import { fetchPropertyById, updateProperty } from "../../app-utils.js";

export default function PropertyEditPage({ propertyId, apiBaseUrl, onBack, onSaved }) {
  const [property, setProperty] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const data = await fetchPropertyById(propertyId);
        if (active) {
          setProperty(data);
          setForm(propertyToForm(data));
        }
      } catch (err) {
        if (active) setLoadError(err.message || "Failed to load this property.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [propertyId]);

  const handleFieldChange = (field, value) => {
    setSaved(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaveError("");

    const validationError = validatePropertyForm(form);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setSaving(true);

    try {
      const updated = await updateProperty(propertyId, formToPropertyPayload(form, property));
      setProperty(updated);
      setForm(propertyToForm(updated));
      setSaved(true);
      onSaved?.(updated);
    } catch (err) {
      setSaveError(err.message || "Could not save your changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="view active-view">
        <PropertyDetailSkeleton />
      </div>
    );
  }

  if (loadError || !property || !form) {
    return (
      <div className="view active-view">
        <div className="panel">
          <p className="error-text">{loadError || "Property not found."}</p>
          <button className="secondary-button" type="button" onClick={onBack}>
            Back to workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <button className="text-button" type="button" onClick={onBack}>
            ← Back to workspace
          </button>
          <h2>Edit listing</h2>
          <p>Update the details tenants see for {property.title || "this property"}.</p>
        </div>
      </div>

      <PropertyForm
        form={form}
        onFieldChange={handleFieldChange}
        onSubmit={handleSubmit}
        submitting={saving}
        submitLabel="Save changes"
        message={saveError || (saved ? "Listing updated." : "")}
        messageVariant={saveError ? "error" : "success"}
        onCancel={onBack}
      />

      <PropertyImageManager
        property={property}
        apiBaseUrl={apiBaseUrl}
        onPropertyUpdated={(updated) => {
          // `updated` is the server's response to an image-only mutation
          // (add/remove photo). It reflects every field as last saved, so
          // rebuilding the whole form from it (propertyToForm(updated))
          // would silently discard any other in-progress edit the landlord
          // hasn't saved yet. `property` itself is fine to replace wholesale
          // since PropertyImageManager (and the gallery it renders) reads
          // images straight off `property`, not off `form` - `form` has no
          // images field at all, so there's nothing image-related in it to
          // refresh.
          setProperty(updated);
        }}
      />
    </div>
  );
}
