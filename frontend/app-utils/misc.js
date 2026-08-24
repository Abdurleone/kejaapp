// Shared across every domain with a "status" field - user accounts, property
// listings, inquiries, viewing requests, mover requests, feedback, and
// agency/mover verification - so this has to cover every enum value from
// all of them, not just the user-account vocabulary (active/suspended/
// banned) it was originally written for.
const activeStatuses = new Set([
  "active", // user
  "available", // property
  "approved", // viewing request, agency/mover verification
  "responded", // inquiry, feedback
  "accepted", // mover request
  "completed", // mover request, viewing request
]);

const suspendedStatuses = new Set([
  "suspended", // user
  "pending", // viewing request, mover request, feedback, agency/mover verification
  "taken", // property - not negative, just not currently available
  "open", // inquiry - awaiting a response
  "draft", // property - not yet published, not a negative state
  "closed", // inquiry - resolved/done, not a rejection
  "archived", // property - retired, not a rejection
]);

export const statusTone = (status) => {
  if (activeStatuses.has(status)) {
    return "status-active";
  }

  if (suspendedStatuses.has(status)) {
    return "status-suspended";
  }

  // Genuinely negative/terminal outcomes: banned (user), rejected (viewing
  // request, agency/mover verification), declined/cancelled (mover request,
  // viewing request).
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
