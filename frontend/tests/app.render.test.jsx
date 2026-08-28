import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";

const { confirmRole, fetchCurrentUser, fetchDashboardSummary, fetchPublicTestimonials } = vi.hoisted(() => ({
  confirmRole: vi.fn(),
  fetchCurrentUser: vi.fn(),
  fetchDashboardSummary: vi.fn(),
  fetchPublicTestimonials: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, confirmRole, fetchCurrentUser, fetchDashboardSummary, fetchPublicTestimonials };
});

// The main nav's ARIA tablist pattern (role=tab, aria-selected, roving
// tabindex, arrow-key navigation) - covers App.jsx directly rather than
// duplicating its tab-bar JSX in an isolated stand-in.
describe("App - main navigation tablist", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/dashboard");
    fetchCurrentUser.mockResolvedValue({ _id: "t1", name: "Jane Tenant", role: "tenant" });
    fetchDashboardSummary.mockResolvedValue({ notifications: { unread: 0 } });
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("marks only the current view's tab as selected, with a roving tabindex", async () => {
    render(<App />);

    const discoverTab = await screen.findByRole("tab", { name: "Discover" });
    const dashboardTab = screen.getByRole("tab", { name: "Dashboard" });

    expect(dashboardTab).toHaveAttribute("aria-selected", "true");
    expect(dashboardTab).toHaveAttribute("tabindex", "0");
    expect(discoverTab).toHaveAttribute("aria-selected", "false");
    expect(discoverTab).toHaveAttribute("tabindex", "-1");
  });

  it("links the tabpanel to the active tab", async () => {
    render(<App />);

    const dashboardTab = await screen.findByRole("tab", { name: "Dashboard" });
    const panel = screen.getByRole("tabpanel");

    expect(panel).toHaveAttribute("aria-labelledby", dashboardTab.id);
  });

  it("moves focus and navigates on ArrowRight, updating aria-selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    const dashboardTab = await screen.findByRole("tab", { name: "Dashboard" });
    dashboardTab.focus();

    await user.keyboard("{ArrowRight}");

    const discoverTab = screen.getByRole("tab", { name: "Discover" });
    await waitFor(() => expect(discoverTab).toHaveFocus());
    expect(discoverTab).toHaveAttribute("aria-selected", "true");
    expect(dashboardTab).toHaveAttribute("aria-selected", "false");
  });

  it("wraps from the first tab to the last on ArrowLeft", async () => {
    const user = userEvent.setup();
    render(<App />);

    const dashboardTab = await screen.findByRole("tab", { name: "Dashboard" });
    dashboardTab.focus();

    await user.keyboard("{ArrowLeft}");

    const tabs = screen.getAllByRole("tab");
    const lastTab = tabs[tabs.length - 1];
    await waitFor(() => expect(lastTab).toHaveFocus());
    expect(lastTab).toHaveAttribute("aria-selected", "true");
  });
});

describe("App - signed-out landing page legal links", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
    fetchPublicTestimonials.mockResolvedValue([]);
    // Explicit, rather than relying on fetchCurrentUser being left
    // unconfigured - vi.clearAllMocks() (used across this file's describe
    // blocks) clears call history but NOT a previously-set
    // mockResolvedValue, so without this, a signed-in mock configured by an
    // earlier describe block in this file would otherwise leak in here.
    fetchCurrentUser.mockRejectedValue(new Error("Not authorized"));
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("navigates to the privacy & data protection page from the landing page footer", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Privacy" }));

    expect(
      await screen.findByRole("heading", { name: "Privacy & data protection" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Kenya Data Protection Act, 2019/).length).toBeGreaterThan(0);
  });

  it("offers a print-to-PDF download on the privacy & terms pages", async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Privacy" }));
    await user.click(await screen.findByRole("button", { name: "Download PDF" }));

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});

describe("App - color mode", () => {
  let changeListeners;
  let matchesDark;

  beforeEach(() => {
    window.history.pushState({}, "", "/");
    fetchPublicTestimonials.mockResolvedValue([]);
    // Explicit, rather than relying on fetchCurrentUser being left
    // unconfigured - see the identical comment in the "signed-out landing
    // page" describe block above.
    fetchCurrentUser.mockRejectedValue(new Error("Not authorized"));
    changeListeners = [];
    matchesDark = false;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      get matches() {
        return matchesDark;
      },
      media: query,
      addEventListener: (event, handler) => {
        if (event === "change") changeListeners.push(handler);
      },
      removeEventListener: (event, handler) => {
        changeListeners = changeListeners.filter((listener) => listener !== handler);
      },
    }));
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    delete document.documentElement.dataset.colorMode;
  });

  it("defaults to system mode, resolved to light when the OS prefers light", async () => {
    render(<App />);

    const systemOption = await screen.findByRole("radio", { name: "Match system" });
    expect(systemOption).toBeChecked();
    expect(document.documentElement.dataset.colorMode).toBe("light");
  });

  it("resolves system mode to dark when the OS prefers dark", async () => {
    matchesDark = true;

    render(<App />);

    await screen.findByRole("radio", { name: "Match system" });
    expect(document.documentElement.dataset.colorMode).toBe("dark");
  });

  it("lets a manual choice override the system preference and persists it", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("radio", { name: "Dark mode" }));

    expect(document.documentElement.dataset.colorMode).toBe("dark");
    expect(localStorage.getItem("keja_color_mode")).toBe("dark");
  });

  it("updates live when the OS preference changes while still in system mode", async () => {
    render(<App />);

    await screen.findByRole("radio", { name: "Match system" });
    expect(document.documentElement.dataset.colorMode).toBe("light");

    await act(async () => {
      matchesDark = true;
      changeListeners.forEach((handler) => handler({ matches: true }));
    });

    await waitFor(() => expect(document.documentElement.dataset.colorMode).toBe("dark"));
  });

  it("does not react to OS changes once a manual mode has been chosen", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("radio", { name: "Light mode" }));
    expect(document.documentElement.dataset.colorMode).toBe("light");

    await act(async () => {
      matchesDark = true;
      changeListeners.forEach((handler) => handler({ matches: true }));
    });

    expect(document.documentElement.dataset.colorMode).toBe("light");
  });
});

describe("App - Google Sign-In role gating", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/dashboard");
    fetchDashboardSummary.mockResolvedValue({ notifications: { unread: 0 } });
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("forces the role-picker for a signed-in user whose role isn't confirmed yet, regardless of the requested path", async () => {
    fetchCurrentUser.mockResolvedValue({
      _id: "g1",
      name: "New Googler",
      role: "tenant",
      roleConfirmed: false,
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "One more thing" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Dashboard", selected: true })).not.toBeInTheDocument();
  });

  it("renders the requested view normally once the role is already confirmed", async () => {
    fetchCurrentUser.mockResolvedValue({
      _id: "g2",
      name: "Existing User",
      role: "tenant",
      roleConfirmed: true,
    });

    render(<App />);

    const dashboardTab = await screen.findByRole("tab", { name: "Dashboard" });
    expect(dashboardTab).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("heading", { name: "One more thing" })).not.toBeInTheDocument();
  });

  it("lets the user pick a role, after which the requested view renders normally", async () => {
    const user = userEvent.setup();
    fetchCurrentUser.mockResolvedValue({
      _id: "g3",
      name: "New Googler",
      role: "tenant",
      roleConfirmed: false,
    });
    confirmRole.mockResolvedValue({ id: "g3", name: "New Googler", role: "landlord", roleConfirmed: true });

    render(<App />);

    await screen.findByRole("heading", { name: "One more thing" });
    await user.selectOptions(screen.getByLabelText("I am a"), "landlord");
    await user.click(screen.getByRole("checkbox", { name: /agree to the terms of service/i }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const dashboardTab = await screen.findByRole("tab", { name: "Dashboard" });
    await waitFor(() => expect(dashboardTab).toHaveAttribute("aria-selected", "true"));
    expect(screen.queryByRole("heading", { name: "One more thing" })).not.toBeInTheDocument();
  });
});

// Covers App.jsx's per-route document.title/description/canonical effect -
// jsdom's default document has none of index.html's <meta>/<link> tags, so
// the description/canonical case injects stand-ins for them first,
// mirroring what the real static index.html provides.
describe("App - per-route document metadata", () => {
  beforeEach(() => {
    fetchPublicTestimonials.mockResolvedValue([]);
    fetchCurrentUser.mockRejectedValue(new Error("Not authorized"));
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("sets a distinct tab title per public route", async () => {
    window.history.pushState({}, "", "/movers");
    render(<App />);

    await waitFor(() => expect(document.title).toBe("Movers | KejaApp"));
  });

  it("sets a distinct title on an authenticated route too, not just public ones", async () => {
    window.history.pushState({}, "", "/account");
    render(<App />);

    await waitFor(() => expect(document.title).toBe("Account | KejaApp"));
  });

  it("updates the meta description and canonical link on navigation", async () => {
    const description = document.createElement("meta");
    description.setAttribute("name", "description");
    document.head.appendChild(description);
    const canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);

    window.history.pushState({}, "", "/terms");
    render(<App />);

    await waitFor(() => expect(document.title).toBe("Terms of Service | KejaApp"));
    expect(description.getAttribute("content")).toBe("The terms governing use of KejaApp.");
    expect(canonical.getAttribute("href")).toBe("https://kejaapp-backend-7iu3.onrender.com/terms");

    document.head.removeChild(description);
    document.head.removeChild(canonical);
  });
});

describe("App - unmatched routes and footer", () => {
  beforeEach(() => {
    fetchPublicTestimonials.mockResolvedValue([]);
    fetchCurrentUser.mockRejectedValue(new Error("Not authorized"));
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows a real not-found page instead of silently falling back to Discover", async () => {
    window.history.pushState({}, "", "/this-path-does-not-exist");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("Page Not Found | KejaApp"));
    expect(screen.queryByRole("heading", { name: "Discover rentals" })).not.toBeInTheDocument();
  });

  it("returns to Discover from the not-found page", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/this-path-does-not-exist");
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Go to Discover" }));

    await waitFor(() => expect(window.location.pathname).toBe("/search"));
  });

  it("shows a current-year copyright line in the footer on both the landing and workspace shells", async () => {
    window.history.pushState({}, "", "/");
    const { unmount } = render(<App />);

    expect(await screen.findByText(`© ${new Date().getFullYear()} KejaApp`)).toBeInTheDocument();
    unmount();

    fetchCurrentUser.mockResolvedValue({ _id: "t1", name: "Jane Tenant", role: "tenant" });
    window.history.pushState({}, "", "/dashboard");
    render(<App />);

    expect(await screen.findByText(`© ${new Date().getFullYear()} KejaApp`)).toBeInTheDocument();
  });
});
