import { useEffect, useState } from "react";
import PropertyDetailSkeleton from "../components/PropertyDetailSkeleton.jsx";
import { fetchPropertyById, updateProperty } from "../../app-utils.js";

const listingTypes = ["apartment", "bedsitter", "maisonette", "house", "studio", "other"];
const propertyStatuses = ["draft", "available", "taken", "archived"];
const viewingTypes = ["scheduled", "open"];
const contactMethods = [
  { value: "inquiry", label: "In-app inquiry" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

const propertyToForm = (property) => ({
  title: property.title || "",
  description: property.description || "",
  type: property.type || "apartment",
  status: property.status || "available",
  viewingType: property.viewingType || "scheduled",
  viewingInstructions: property.viewingInstructions || "",
  rent: property.price?.rent ?? "",
  deposit: property.price?.deposit ?? "",
  agencyFee: property.price?.agencyFee ?? "",
  county: property.location?.county || "",
  town: property.location?.town || "",
  area: property.location?.area || "",
  bedrooms: property.bedrooms ?? "",
  bathrooms: property.bathrooms ?? "",
  amenities: (property.amenities || []).join(", "),
  contactPreferredMethod: property.contact?.preferredMethod || "inquiry",
  contactPhone: property.contact?.phone || "",
  contactEmail: property.contact?.email || "",
  contactWhatsapp: property.contact?.whatsapp || "",
  contactAvailableHours: property.contact?.availableHours || "",
  contactNotes: property.contact?.notes || "",
});

// location.coordinates isn't editable here (no map picker), so it's carried
// forward from the loaded property to avoid the update wiping out geo data
// that "near me" search relies on.
const formToPayload = (form, originalProperty) => {
  const location = {
    county: form.county.trim(),
    town: form.town.trim(),
    area: form.area.trim(),
  };

  if (originalProperty?.location?.coordinates?.coordinates?.length === 2) {
    location.coordinates = originalProperty.location.coordinates;
  }

  const contact = {
    preferredMethod: form.contactPreferredMethod,
    phone: form.contactPhone.trim(),
    whatsapp: form.contactWhatsapp.trim(),
    availableHours: form.contactAvailableHours.trim(),
    notes: form.contactNotes.trim(),
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
    status: form.status,
    viewingType: form.viewingType,
    viewingInstructions: form.viewingInstructions.trim(),
    price: {
      rent: Number(form.rent) || 0,
      deposit: Number(form.deposit) || 0,
      agencyFee: Number(form.agencyFee) || 0,
    },
    location,
    bedrooms: Number(form.bedrooms) || 0,
    bathrooms: Number(form.bathrooms) || 0,
    amenities: form.amenities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    contact,
  };
};

export default function PropertyEditPage({ propertyId, onBack, onSaved }) {
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

  const updateField = (field) => (event) => {
    setSaved(false);
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaveError("");

    if (!form.title.trim() || form.title.trim().length < 3) {
      setSaveError("Title must be at least 3 characters.");
      return;
    }

    if (form.rent === "" || Number(form.rent) < 0) {
      setSaveError("Monthly rent is required and must be 0 or more.");
      return;
    }

    setSaving(true);

    try {
      const updated = await updateProperty(propertyId, formToPayload(form, property));
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
          <p className="muted-copy">{loadError || "Property not found."}</p>
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

      <form className="panel detail-panel auth-panel-form" onSubmit={handleSubmit}>
        <h3>Basics</h3>
        <label>
          Title
          <input type="text" value={form.title} onChange={updateField("title")} maxLength={140} required />
        </label>
        <label>
          Description
          <textarea value={form.description} onChange={updateField("description")} rows={4} maxLength={2000} />
        </label>
        <div className="detail-grid">
          <label>
            Type
            <select value={form.type} onChange={updateField("type")}>
              {listingTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={form.status} onChange={updateField("status")}>
              {propertyStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bedrooms
            <input type="number" min="0" value={form.bedrooms} onChange={updateField("bedrooms")} />
          </label>
          <label>
            Bathrooms
            <input type="number" min="0" value={form.bathrooms} onChange={updateField("bathrooms")} />
          </label>
        </div>
        <label>
          Amenities (comma separated)
          <input type="text" value={form.amenities} onChange={updateField("amenities")} placeholder="Parking, Wifi, Borehole" />
        </label>

        <h3>Cost</h3>
        <div className="detail-grid">
          <label>
            Monthly rent (KES)
            <input type="number" min="0" value={form.rent} onChange={updateField("rent")} required />
          </label>
          <label>
            Deposit (KES)
            <input type="number" min="0" value={form.deposit} onChange={updateField("deposit")} />
          </label>
          <label>
            Agency fee (KES)
            <input type="number" min="0" value={form.agencyFee} onChange={updateField("agencyFee")} />
          </label>
        </div>

        <h3>Location</h3>
        <div className="detail-grid">
          <label>
            Area
            <input type="text" value={form.area} onChange={updateField("area")} />
          </label>
          <label>
            Town
            <input type="text" value={form.town} onChange={updateField("town")} />
          </label>
          <label>
            County
            <input type="text" value={form.county} onChange={updateField("county")} />
          </label>
        </div>

        <h3>Viewing</h3>
        <label>
          Viewing type
          <select value={form.viewingType} onChange={updateField("viewingType")}>
            {viewingTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Viewing instructions
          <textarea value={form.viewingInstructions} onChange={updateField("viewingInstructions")} rows={3} maxLength={1000} />
        </label>

        <h3>Contact</h3>
        <div className="detail-grid">
          <label>
            Preferred method
            <select value={form.contactPreferredMethod} onChange={updateField("contactPreferredMethod")}>
              {contactMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Phone
            <input type="text" value={form.contactPhone} onChange={updateField("contactPhone")} />
          </label>
          <label>
            Email
            <input type="email" value={form.contactEmail} onChange={updateField("contactEmail")} />
          </label>
          <label>
            WhatsApp
            <input type="text" value={form.contactWhatsapp} onChange={updateField("contactWhatsapp")} />
          </label>
          <label>
            Available hours
            <input type="text" value={form.contactAvailableHours} onChange={updateField("contactAvailableHours")} />
          </label>
        </div>
        <label>
          Contact notes
          <textarea value={form.contactNotes} onChange={updateField("contactNotes")} rows={2} maxLength={500} />
        </label>

        {saveError && <p className="muted-copy">{saveError}</p>}
        {saved && !saveError && <p className="muted-copy">Listing updated.</p>}

        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button className="secondary-button" type="button" onClick={onBack}>
            Done
          </button>
        </div>
      </form>
    </div>
  );
}
