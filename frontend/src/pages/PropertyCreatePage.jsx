import { useState } from "react";
import PropertyForm, { emptyPropertyForm, formToPropertyPayload, validatePropertyForm } from "../components/PropertyForm.jsx";
import { createProperty } from "../../app-utils.js";

export default function PropertyCreatePage({ onBack, onCreated }) {
  const [form, setForm] = useState(emptyPropertyForm);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleFieldChange = (field, value) => {
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
      const created = await createProperty(formToPropertyPayload(form));
      onCreated?.(created);
    } catch (err) {
      setSaveError(err.message || "Could not create this listing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="view active-view">
      <div className="view-header">
        <div>
          <button className="text-button" type="button" onClick={onBack}>
            ← Back to workspace
          </button>
          <h2>New listing</h2>
          <p>Add the details tenants will see once this listing is available.</p>
        </div>
      </div>

      <PropertyForm
        form={form}
        onFieldChange={handleFieldChange}
        onSubmit={handleSubmit}
        submitting={saving}
        submitLabel="Create listing"
        submittingLabel="Creating..."
        message={saveError}
        onCancel={onBack}
      />
    </div>
  );
}
