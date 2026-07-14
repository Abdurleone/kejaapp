import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";

const { fetchCurrentUser, fetchDashboardSummary, fetchPublicTestimonials } = vi.hoisted(() => ({
  fetchCurrentUser: vi.fn(),
  fetchDashboardSummary: vi.fn(),
  fetchPublicTestimonials: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchCurrentUser, fetchDashboardSummary, fetchPublicTestimonials };
});

// The main nav's ARIA tablist pattern (role=tab, aria-selected, roving
// tabindex, arrow-key navigation) - covers App.jsx directly rather than
// duplicating its tab-bar JSX in an isolated stand-in.
describe("App - main navigation tablist", () => {
  beforeEach(() => {
    localStorage.setItem("keja_token", "fake-token");
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
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("navigates to the Data protection page from the landing page footer", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Data protection" }));

    expect(
      await screen.findByRole("heading", { name: "Data protection" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Kenya Data Protection Act, 2019/).length).toBeGreaterThan(0);
  });
});
