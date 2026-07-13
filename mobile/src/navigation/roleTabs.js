// Mirrors the per-role nav filtering frontend/app-utils.js does for the web
// app (roleViewAccess/canAccessView) - anonymous visitors and each signed-in
// role only see the tabs relevant to them, instead of every tab regardless
// of whether it applies (which is what made the bar feel cramped with 8
// tabs for everyone, tenant and landlord alike).
export const roleTabs = {
  tenant: ["Dashboard", "Discover", "Saved", "Movers", "Requests", "Notifications", "Feedback", "Account"],
  landlord: ["Dashboard", "Workspace", "Movers", "Notifications", "Feedback", "Account"],
  agency: ["Dashboard", "Workspace", "Movers", "Notifications", "Feedback", "Account"],
  mover: ["Dashboard", "Movers", "Notifications", "Feedback", "Account"],
  admin: ["Dashboard", "Admin", "Notifications", "Feedback", "Account"],
};

export const anonymousTabs = ["Dashboard", "Discover", "Movers", "Account"];

export const getVisibleTabs = (signedIn, role) => (signedIn ? roleTabs[role] || anonymousTabs : anonymousTabs);
