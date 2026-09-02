import {
  emptyPropertyForm,
  formToPropertyPayload,
  propertyToForm,
  validatePropertyForm,
} from "./propertyForm.js";

describe("propertyToForm", () => {
  it("maps a full property onto form fields", () => {
    const property = {
      title: "Cozy studio",
      description: "Near town",
      type: "studio",
      status: "taken",
      viewingType: "open",
      viewingInstructions: "Call ahead",
      price: { rent: 15000, deposit: 15000, agencyFee: 5000 },
      location: { county: "Nairobi", town: "Westlands", area: "Chiromo" },
      bedrooms: 1,
      bathrooms: 1,
      amenities: ["Parking", "Wifi"],
      accessibilityFeatures: ["wheelchairRamp"],
      contact: {
        preferredMethod: "phone",
        phone: "0700000000",
        email: "owner@example.com",
        whatsapp: "0700000000",
        availableHours: "8am - 6pm",
        notes: "Ask for John",
      },
    };

    expect(propertyToForm(property)).toEqual({
      title: "Cozy studio",
      description: "Near town",
      type: "studio",
      status: "taken",
      viewingType: "open",
      viewingInstructions: "Call ahead",
      rent: 15000,
      deposit: 15000,
      agencyFee: 5000,
      county: "Nairobi",
      town: "Westlands",
      area: "Chiromo",
      bedrooms: 1,
      bathrooms: 1,
      amenities: "Parking, Wifi",
      accessibilityFeatures: ["wheelchairRamp"],
      contactPreferredMethod: "phone",
      contactPhone: "0700000000",
      contactEmail: "owner@example.com",
      contactWhatsapp: "0700000000",
      contactAvailableHours: "8am - 6pm",
      contactNotes: "Ask for John",
    });
  });

  it("falls back to sensible defaults for a mostly-empty property", () => {
    expect(propertyToForm({})).toEqual(emptyPropertyForm);
  });
});

describe("formToPropertyPayload", () => {
  const baseForm = {
    ...emptyPropertyForm,
    title: "Cozy studio",
    rent: "15000",
    bedrooms: "1",
    bathrooms: "1",
    amenities: "Parking, Wifi, ",
    accessibilityFeatures: ["wheelchairRamp", "groundFloorUnit"],
  };

  it("builds a payload with trimmed/typed fields", () => {
    const payload = formToPropertyPayload(baseForm);

    expect(payload.title).toBe("Cozy studio");
    expect(payload.price).toEqual({ rent: 15000, deposit: 0, agencyFee: 0 });
    expect(payload.bedrooms).toBe(1);
    expect(payload.bathrooms).toBe(1);
    expect(payload.amenities).toEqual(["Parking", "Wifi"]);
    expect(payload.accessibilityFeatures).toEqual(["wheelchairRamp", "groundFloorUnit"]);
    expect(payload.location.coordinates).toBeUndefined();
  });

  it("omits contact.email when the field is blank", () => {
    const payload = formToPropertyPayload(baseForm);
    expect(payload.contact.email).toBeUndefined();
  });

  it("includes contact.email when the field is filled in", () => {
    const payload = formToPropertyPayload({ ...baseForm, contactEmail: " owner@example.com " });
    expect(payload.contact.email).toBe("owner@example.com");
  });

  it("carries forward the original property's coordinates on an edit", () => {
    const originalProperty = {
      location: { coordinates: { type: "Point", coordinates: [36.8, -1.3] } },
    };

    const payload = formToPropertyPayload(baseForm, originalProperty);

    expect(payload.location.coordinates).toEqual({ type: "Point", coordinates: [36.8, -1.3] });
  });

  it("does not invent coordinates when the original property has none", () => {
    const payload = formToPropertyPayload(baseForm, { location: {} });
    expect(payload.location.coordinates).toBeUndefined();
  });
});

describe("validatePropertyForm", () => {
  it("requires a title of at least 3 characters", () => {
    expect(validatePropertyForm({ ...emptyPropertyForm, title: "ab", rent: "1000" })).toMatch(/title/i);
    expect(validatePropertyForm({ ...emptyPropertyForm, title: "", rent: "1000" })).toMatch(/title/i);
  });

  it("requires a non-negative rent", () => {
    expect(validatePropertyForm({ ...emptyPropertyForm, title: "Cozy studio", rent: "" })).toMatch(/rent/i);
    expect(validatePropertyForm({ ...emptyPropertyForm, title: "Cozy studio", rent: "-5" })).toMatch(/rent/i);
  });

  it("passes for a minimally valid form", () => {
    expect(validatePropertyForm({ ...emptyPropertyForm, title: "Cozy studio", rent: "0" })).toBe("");
  });
});
