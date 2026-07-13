import { anonymousTabs, getVisibleTabs, roleTabs } from "./roleTabs.js";

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
