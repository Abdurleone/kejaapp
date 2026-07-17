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
  const midIndex = Math.floor(rents.length / 2);
  const medianRent = !rents.length
    ? 0
    : rents.length % 2 === 0
      ? (rents[midIndex - 1] + rents[midIndex]) / 2
      : rents[midIndex];
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
