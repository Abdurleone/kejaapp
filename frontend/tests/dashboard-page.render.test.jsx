import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "../src/pages/DashboardPage.jsx";
import { renderWithAuth } from "./helpers/renderWithAuth.jsx";

const { fetchDashboardSummary } = vi.hoisted(() => ({
  fetchDashboardSummary: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchDashboardSummary };
});

// Replaces page-components.test.js's regex-source-matching assertions for
// DashboardPage with real render tests covering each role-specific section.
describe("DashboardPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the tenant activity section with real summary data", async () => {
    fetchDashboardSummary.mockResolvedValue({
      notifications: { unread: 3 },
      tenant: {
        savedProperties: 5,
        inquiries: { open: 2, responded: 1 },
        viewings: { pending: 1 },
      },
    });

    renderWithAuth(<DashboardPage />, { currentUser: { name: "Jane Tenant", role: "tenant" } });

    expect(await screen.findByText("Your activity")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Unread notifications")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Saved properties")).toBeInTheDocument();
  });

  it("renders the owner listings section for a landlord", async () => {
    fetchDashboardSummary.mockResolvedValue({
      notifications: { unread: 0 },
      owner: {
        properties: { available: 4 },
        incomingInquiries: { open: 2 },
        incomingViewings: { pending: 1 },
      },
    });

    renderWithAuth(<DashboardPage />, { currentUser: { name: "Jane Landlord", role: "landlord" } });

    expect(await screen.findByText("Your listings")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders agency verification status", async () => {
    fetchDashboardSummary.mockResolvedValue({
      notifications: { unread: 0 },
      agency: { verificationStatus: "rejected", rejectionReason: "Missing business permit" },
    });

    renderWithAuth(<DashboardPage />, { currentUser: { name: "Acme Agency", role: "agency" } });

    expect(await screen.findByText("Agency verification")).toBeInTheDocument();
    expect(screen.getByText("Missing business permit")).toBeInTheDocument();
  });

  it("renders mover verification status and received requests", async () => {
    fetchDashboardSummary.mockResolvedValue({
      notifications: { unread: 0 },
      mover: { verificationStatus: "approved", receivedRequests: { pending: 2 } },
    });

    renderWithAuth(<DashboardPage />, { currentUser: { name: "Speedy Movers", role: "mover" } });

    expect(await screen.findByText("Mover verification")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders admin platform-moderation stats including feedback", async () => {
    fetchDashboardSummary.mockResolvedValue({
      notifications: { unread: 0 },
      admin: {
        agencyVerifications: { pending: 1 },
        moverVerifications: { pending: 0 },
        violations: { open: 0 },
        feedback: { pending: 4 },
      },
    });

    renderWithAuth(<DashboardPage />, { currentUser: { name: "Admin User", role: "admin" } });

    expect(await screen.findByText("Platform moderation")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows an error state with a retry action when the fetch fails, then recovers", async () => {
    fetchDashboardSummary.mockRejectedValueOnce(new Error("Network down"));
    fetchDashboardSummary.mockResolvedValueOnce({ notifications: { unread: 1 } });
    const user = userEvent.setup();

    renderWithAuth(<DashboardPage />, { currentUser: { name: "Jane Tenant", role: "tenant" } });

    expect(await screen.findByText("Network down")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Unread notifications")).toBeInTheDocument();
  });
});
