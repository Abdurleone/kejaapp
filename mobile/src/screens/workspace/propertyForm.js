// Shared by PropertyCreateScreen and PropertyEditScreen so both stay on one
// source of truth for the property form's shape/validation, mirroring
// frontend/src/components/PropertyForm.jsx's exported helpers (but not its
// component - mobile has no shared input-widget component to reuse).

export const listingTypes = ["apartment", "bedsitter", "maisonette", "house", "studio", "other"];
export const propertyStatuses = ["draft", "available", "taken", "archived"];
export const viewingTypes = ["scheduled", "open"];
export const contactMethods = [
  { value: "inquiry", label: "In-app inquiry" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];
export const accessibilityFeatureOptions = [
  { value: "wheelchairRamp", label: "Wheelchair ramp" },
  { value: "wideDoorways", label: "Wide doorways/entrances" },
  { value: "elevatorAccess", label: "Elevator/lift access" },
  { value: "groundFloorUnit", label: "Ground-floor unit" },
  { value: "accessibleBathroom", label: "Accessible/roll-in bathroom" },
  { value: "accessibleParking", label: "Accessible parking" },
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
  accessibilityFeatures: [],
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
  accessibilityFeatures: property.accessibilityFeatures || [],
  contactPreferredMethod: property.contact?.preferredMethod || "inquiry",
  contactPhone: property.contact?.phone || "",
  contactEmail: property.contact?.email || "",
  contactWhatsapp: property.contact?.whatsapp || "",
  contactAvailableHours: property.contact?.availableHours || "",
  contactNotes: property.contact?.notes || "",
});

// location.coordinates isn't editable here (no map picker), so on an edit
// it's carried forward from the loaded property to avoid the update wiping
// out geo data that "near me" search relies on. A brand-new listing (no
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
    accessibilityFeatures: form.accessibilityFeatures,
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
