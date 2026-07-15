export const statusTone = (status) => {
  if (status === "available" || status === "active" || status === "approved" || status === "responded") {
    return "status-active";
  }

  if (status === "taken" || status === "suspended" || status === "pending") {
    return "status-suspended";
  }

  return "status-banned";
};

export const summarizeProperties = (properties) => {
  const rents = properties
    .map((property) => Number(property.price?.rent || 0))
    .filter((rent) => rent > 0)
    .sort((a, b) => a - b);
  const medianRent = rents.length ? rents[Math.floor((rents.length - 1) / 2)] : 0;
  const openViewings = properties.filter((property) => property.viewingType === "open").length;
  const scheduledViewings = properties.filter((property) => property.viewingType === "scheduled").length;
  const areas = new Set(properties.map((property) => property.location?.area).filter(Boolean));

  return {
    total: properties.length,
    medianRent,
    openViewings,
    scheduledViewings,
    areaCount: areas.size,
  };
};

export const summarizeReview = (review) => {
  const propertyTitle = review.property?.title || "Property";
  const reviewer = review.user?.name || "Tenant";
  const rating = Number(review.rating || 0);

  return `${propertyTitle} - ${rating}/5 by ${reviewer}`;
};

export const sortProperties = (properties, sortMode) => {
  const sorted = [...properties];

  if (sortMode === "rent-asc") {
    return sorted.sort((a, b) => Number(a.price?.rent || 0) - Number(b.price?.rent || 0));
  }

  if (sortMode === "rent-desc") {
    return sorted.sort((a, b) => Number(b.price?.rent || 0) - Number(a.price?.rent || 0));
  }

  return sorted;
};

export const demoAccounts = {
  tenant: "tenant@example.com",
  landlord: "landlord@example.com",
  agency: "agency@example.com",
  mover: "mover1@example.com",
  admin: "admin@example.com",
};

export const getDemoEmailForRole = (role) => demoAccounts[role] || demoAccounts.tenant;

export const findPropertyById = (collections, propertyId) =>
  collections.flat().find((property) => String(property?._id || property?.id) === String(propertyId));
