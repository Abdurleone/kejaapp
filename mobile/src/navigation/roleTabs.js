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

// Even after the role filtering above, the bar itself stayed cramped (4-8
// buttons). Rather than showing every visible tab as its own bottom-bar
// button, only "Dashboard" + the role's one signature feature are pinned;
// everything else (Notifications, Feedback, Account, and role-specific
// extras like Saved/Requests/Movers) is reachable through a single "More"
// tab instead. See MoreStack.js for where the hidden ones actually live.
export const primaryTabs = {
  tenant: ["Dashboard", "Discover"],
  landlord: ["Dashboard", "Workspace"],
  agency: ["Dashboard", "Workspace"],
  mover: ["Dashboard", "Movers"],
  admin: ["Dashboard", "Admin"],
};

export const anonymousPrimaryTabs = ["Dashboard", "Discover"];

export const getPrimaryTabs = (signedIn, role) =>
  signedIn ? primaryTabs[role] || anonymousPrimaryTabs : anonymousPrimaryTabs;

// Order preserved from the full per-role list, just minus whichever two
// names getPrimaryTabs already pinned to the bar.
export const getHiddenTabs = (signedIn, role) => {
  const visible = getVisibleTabs(signedIn, role);
  const primary = getPrimaryTabs(signedIn, role);
  return visible.filter((name) => !primary.includes(name));
};
