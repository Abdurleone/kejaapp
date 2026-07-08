const listingTypes = ["apartment", "bedsitter", "maisonette", "house", "studio", "other"];
const propertyStatuses = ["draft", "available", "taken", "archived"];
const viewingTypes = ["scheduled", "open"];
const contactMethods = [
  { value: "inquiry", label: "In-app inquiry" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

export const emptyPropertyForm = {
  title: "",
  description: "",
  type: "apartment",
  status: "available",
  viewingType: "scheduled",
  viewingInstructions: "",
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
  contactAvailableHours: "",
  contactNotes: "",
};

export const propertyToForm = (property) => ({
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

// location.coordinates isn't editable here (no map picker), so on an edit it's
// carried forward from the loaded property to avoid the update wiping out geo
// data that "near me" search relies on. A brand-new listing (no
// originalProperty) simply has no coordinates until one is added later.
export const formToPropertyPayload = (form, originalProperty) => {
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

export const validatePropertyForm = (form) => {
  if (!form.title.trim() || form.title.trim().length < 3) {
    return "Title must be at least 3 characters.";
  }

  if (form.rent === "" || Number(form.rent) < 0) {
    return "Monthly rent is required and must be 0 or more.";
  }

  return "";
};

export default function PropertyForm({
  form,
  onFieldChange,
  onSubmit,
  submitting,
  submitLabel,
  submittingLabel = "Saving...",
  message,
  messageVariant = "error",
  onCancel,
}) {
  const updateField = (field) => (event) => onFieldChange(field, event.target.value);

  return (
    <form className="panel detail-panel auth-panel-form" onSubmit={onSubmit}>
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

      {message && (
        <p className={messageVariant === "success" ? "success-text" : "error-text"}>{message}</p>
      )}

      <div className="form-actions">
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? submittingLabel : submitLabel}
        </button>
        {onCancel && (
          <button className="secondary-button" type="button" onClick={onCancel}>
            Done
          </button>
        )}
      </div>
    </form>
  );
}
