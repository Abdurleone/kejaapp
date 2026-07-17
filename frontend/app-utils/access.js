export const roles = Object.freeze({
  tenant: "tenant",
  landlord: "landlord",
  agency: "agency",
  mover: "mover",
  admin: "admin",
});

export const roleGroups = Object.freeze({
  tenantOnly: [roles.tenant],
  listingManagers: [roles.landlord, roles.agency],
  propertyOwners: [roles.landlord, roles.agency],
  agencies: [roles.agency],
  movers: [roles.mover],
  admins: [roles.admin],
});

export const hasRole = (role, allowedRoles) => allowedRoles.includes(role);

const roleViewAccess = {
  [roles.tenant]: ["dashboard", "discover", "saved", "movers", "notifications", "feedback", "account"],
  [roles.landlord]: ["dashboard", "owner", "movers", "notifications", "feedback", "account"],
  [roles.agency]: ["dashboard", "owner", "movers", "notifications", "feedback", "account"],
  [roles.mover]: ["dashboard", "movers", "notifications", "feedback", "account"],
  [roles.admin]: ["dashboard", "admin", "notifications", "feedback", "account"],
};

export const canAccessView = (role, view) => {
  if (["privacy", "terms", "dataProtection", "deleteAccount"].includes(view)) {
    return true;
  }

  if (!role) {
    return ["discover", "movers"].includes(view);
  }

  return Boolean(roleViewAccess[role]?.includes(view));
};

export const getDefaultViewForRole = (role) => roleViewAccess[role]?.[0] || "discover";

export const canManageListings = (role) => hasRole(role, roleGroups.listingManagers);

export const canSearchListings = (role) => !role || hasRole(role, roleGroups.tenantOnly);

// Full property details require signing in as anything other than a mover — movers
// work from requests/notifications, not the listings themselves (see roleViewAccess),
// so they're excluded even if they land on a detail page directly. Every other
// signed-in role (tenant/landlord/agency/admin) is let through so a landlord/agency
// who lands on a detail page directly doesn't see a confusing "sign in as a tenant"
// message; only anonymous visitors are gated.
export const canOpenPropertyDetails = (role) => Boolean(role) && !hasRole(role, roleGroups.movers);

export const shouldShowSplash = ({ isSignedIn, path = "/" }) => {
  const normalizedPath = String(path || "/").replace(/\/$/, "") || "/";
  return !isSignedIn && normalizedPath === "/";
};

const viewPaths = {
  dashboard: "/dashboard",
  discover: "/search",
  saved: "/saved",
  owner: "/owner",
  propertyCreate: "/owner/properties/new",
  movers: "/movers",
  admin: "/admin",
  notifications: "/notifications",
  feedback: "/feedback",
  account: "/account",
  privacy: "/privacy",
  terms: "/terms",
  dataProtection: "/data-protection",
  deleteAccount: "/delete-account",
};

const propertyDetailPathPrefix = "/property/";
const propertyEditPathPrefix = "/owner/properties/";
const propertyEditPathSuffix = "/edit";

export const getPropertyDetailPath = (propertyId) => `${propertyDetailPathPrefix}${propertyId}`;

export const getPropertyIdFromPath = (path) => {
  const normalizedPath = String(path || "").replace(/\/$/, "");
  return normalizedPath.startsWith(propertyDetailPathPrefix)
    ? normalizedPath.slice(propertyDetailPathPrefix.length)
    : null;
};

export const getPropertyEditPath = (propertyId) => `${propertyEditPathPrefix}${propertyId}${propertyEditPathSuffix}`;

export const getPropertyEditIdFromPath = (path) => {
  const normalizedPath = String(path || "").replace(/\/$/, "");
  return normalizedPath.startsWith(propertyEditPathPrefix) && normalizedPath.endsWith(propertyEditPathSuffix)
    ? normalizedPath.slice(propertyEditPathPrefix.length, -propertyEditPathSuffix.length)
    : null;
};

export const resolveViewFromPath = (path) => {
  const normalizedPath = path === "/" ? "/" : String(path || "").replace(/\/$/, "");

  if (normalizedPath === "/") {
    return "discover";
  }

  if (normalizedPath.startsWith(propertyEditPathPrefix) && normalizedPath.endsWith(propertyEditPathSuffix)) {
    return "propertyEdit";
  }

  if (normalizedPath.startsWith(propertyDetailPathPrefix)) {
    return "propertyDetail";
  }

  const match = Object.entries(viewPaths).find(([, viewPath]) => viewPath === normalizedPath);
  return match?.[0] || "discover";
};

export const getViewPath = (view) => viewPaths[view] || viewPaths.discover;

export const getPropertyCreatePath = () => viewPaths.propertyCreate;
