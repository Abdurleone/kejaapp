import {
  anonymousPrimaryTabs,
  anonymousTabs,
  getHiddenTabs,
  getPrimaryTabs,
  getVisibleTabs,
  primaryTabs,
  roleTabs,
} from "./roleTabs.js";

describe("getVisibleTabs", () => {
  it("returns the anonymous tab list when signed out, regardless of role", () => {
    expect(getVisibleTabs(false, undefined)).toBe(anonymousTabs);
    expect(getVisibleTabs(false, "admin")).toBe(anonymousTabs);
  });

  it("returns the matching role's tab list when signed in", () => {
    expect(getVisibleTabs(true, "tenant")).toBe(roleTabs.tenant);
    expect(getVisibleTabs(true, "landlord")).toBe(roleTabs.landlord);
    expect(getVisibleTabs(true, "agency")).toBe(roleTabs.agency);
    expect(getVisibleTabs(true, "mover")).toBe(roleTabs.mover);
    expect(getVisibleTabs(true, "admin")).toBe(roleTabs.admin);
  });

  it("falls back to the anonymous tab list for an unrecognized role", () => {
    expect(getVisibleTabs(true, "unknown")).toBe(anonymousTabs);
    expect(getVisibleTabs(true, undefined)).toBe(anonymousTabs);
  });

  it("only exposes Workspace to landlord/agency, and Admin only to admin", () => {
    expect(roleTabs.tenant).not.toContain("Workspace");
    expect(roleTabs.landlord).toContain("Workspace");
    expect(roleTabs.agency).toContain("Workspace");

    expect(roleTabs.admin).toContain("Admin");
    expect(roleTabs.tenant).not.toContain("Admin");
    expect(roleTabs.landlord).not.toContain("Admin");
  });
});

describe("getPrimaryTabs", () => {
  it("returns the anonymous primary pair when signed out, regardless of role", () => {
    expect(getPrimaryTabs(false, undefined)).toBe(anonymousPrimaryTabs);
    expect(getPrimaryTabs(false, "admin")).toBe(anonymousPrimaryTabs);
  });

  it("pins Dashboard plus each role's one signature feature", () => {
    expect(getPrimaryTabs(true, "tenant")).toEqual(["Dashboard", "Discover"]);
    expect(getPrimaryTabs(true, "landlord")).toEqual(["Dashboard", "Workspace"]);
    expect(getPrimaryTabs(true, "agency")).toEqual(["Dashboard", "Workspace"]);
    expect(getPrimaryTabs(true, "mover")).toEqual(["Dashboard", "Movers"]);
    expect(getPrimaryTabs(true, "admin")).toEqual(["Dashboard", "Admin"]);
  });

  it("falls back to the anonymous primary pair for an unrecognized role", () => {
    expect(getPrimaryTabs(true, "unknown")).toBe(anonymousPrimaryTabs);
  });

  it("only ever pins two tabs, for every role", () => {
    Object.keys(primaryTabs).forEach((role) => {
      expect(primaryTabs[role]).toHaveLength(2);
    });
    expect(anonymousPrimaryTabs).toHaveLength(2);
  });
});

describe("getHiddenTabs", () => {
  it("is every visible tab minus the two pinned ones, order preserved", () => {
    expect(getHiddenTabs(true, "tenant")).toEqual([
      "Saved",
      "Movers",
      "Requests",
      "Notifications",
      "Feedback",
      "Account",
    ]);
    expect(getHiddenTabs(true, "landlord")).toEqual(["Movers", "Notifications", "Feedback", "Account"]);
    expect(getHiddenTabs(true, "mover")).toEqual(["Notifications", "Feedback", "Account"]);
    expect(getHiddenTabs(true, "admin")).toEqual(["Notifications", "Feedback", "Account"]);
    expect(getHiddenTabs(false, undefined)).toEqual(["Movers", "Account"]);
  });

  it("never hides either of the two pinned tabs", () => {
    ["tenant", "landlord", "agency", "mover", "admin"].forEach((role) => {
      const hidden = getHiddenTabs(true, role);
      getPrimaryTabs(true, role).forEach((name) => expect(hidden).not.toContain(name));
    });
  });
});
