export const formatKes = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatRatingSummary = (ratingAverage, ratingCount) => {
  const count = Number(ratingCount || 0);

  if (!count) {
    return "No ratings";
  }

  return `${Number(ratingAverage || 0).toFixed(1)} rating (${count})`;
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
