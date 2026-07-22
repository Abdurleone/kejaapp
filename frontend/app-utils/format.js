import { defaultApiBaseUrl } from "./client.js";

const fallbackImage =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=70";

export const formatKes = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const resolveAssetUrl = (url, baseUrl) => {
  if (!url) {
    return fallbackImage;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${baseUrl.replace(/\/$/, "")}${url}`;
};

export const getPropertyImage = (property, baseUrl = defaultApiBaseUrl) =>
  resolveAssetUrl(property.images?.[0]?.url, baseUrl);

// Builds native intent URLs for reaching a property's owner directly,
// bypassing the in-app inquiry flow when they've shared other contact info.
export const buildPhoneUrl = (phone) => (phone ? `tel:${phone.replace(/[^+\d]/g, "")}` : null);

export const buildEmailUrl = (email) => (email ? `mailto:${email}` : null);

export const buildWhatsAppUrl = (phone) => (phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : null);

export const getPreferredContactUrl = (contact) => {
  if (!contact) return null;

  switch (contact.preferredMethod) {
    case "phone":
      return buildPhoneUrl(contact.phone);
    case "email":
      return buildEmailUrl(contact.email);
    case "whatsapp":
      return buildWhatsAppUrl(contact.whatsapp || contact.phone);
    default:
      return null;
  }
};

export const formatStatusLabel = (value) =>
  String(value || "")
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

// Mirrors backend/utils/moverPricing.js's homeSizes enum - kept in sync
// manually since the two apps don't share a module.
export const homeSizeOptions = [
  { value: "studio", label: "Studio" },
  { value: "1br", label: "1 Bedroom" },
  { value: "2br", label: "2 Bedroom" },
  { value: "3br", label: "3 Bedroom" },
  { value: "4br_plus", label: "4+ Bedroom" },
];

export const formatRatingSummary = (ratingAverage, ratingCount) => {
  const count = Number(ratingCount || 0);

  if (!count) {
    return "No ratings";
  }

  return `${Number(ratingAverage || 0).toFixed(1)} rating (${count})`;
};
