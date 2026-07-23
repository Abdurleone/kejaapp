import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import MoversPage from "../src/pages/MoversPage.jsx";
import { renderWithAuth } from "./helpers/renderWithAuth.jsx";

const {
  fetchMovers,
  affiliateMover,
  unaffiliateMover,
  createMoverRequest,
  getCurrentPositionOrNull,
  fetchMoverProfileStatus,
  fetchReceivedMoverRequests,
  submitMoverProfile,
  updateMoverRequestStatus,
} = vi.hoisted(() => ({
  fetchMovers: vi.fn(),
  affiliateMover: vi.fn(),
  unaffiliateMover: vi.fn(),
  createMoverRequest: vi.fn(),
  getCurrentPositionOrNull: vi.fn(),
  fetchMoverProfileStatus: vi.fn(),
  fetchReceivedMoverRequests: vi.fn(),
  submitMoverProfile: vi.fn(),
  updateMoverRequestStatus: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchMovers,
    affiliateMover,
    unaffiliateMover,
    createMoverRequest,
    getCurrentPositionOrNull,
    fetchMoverProfileStatus,
    fetchReceivedMoverRequests,
    submitMoverProfile,
    updateMoverRequestStatus,
  };
});

const sampleMover = {
  _id: "mover-1",
  name: "Speedy Movers",
  verified: true,
  location: { town: "Westlands", county: "Nairobi" },
  serviceTypes: ["local"],
  basePrice: 5000,
  affiliatedOwners: [],
};

// Replaces the (previously nonexistent) test coverage for MoversPage with
// real render + interaction tests, for both the tenant/owner-facing
// directory and the mover's own dashboard.
describe("MoversPage - directory (non-mover roles)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders movers with real data for a signed-in tenant", async () => {
    fetchMovers.mockResolvedValue([sampleMover]);

    renderWithAuth(<MoversPage />, { signedIn: true, currentUser: { _id: "t1", role: "tenant" } });

    expect(await screen.findByText("Speedy Movers")).toBeInTheDocument();
    expect(screen.getByText("Westlands, Nairobi")).toBeInTheDocument();
    expect(screen.getByText(/Ksh\s*5,000/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request service" })).toBeInTheDocument();
  });

  it("prompts sign-in for anonymous visitors instead of showing Request service", async () => {
    fetchMovers.mockResolvedValue([sampleMover]);
    const openAuthPanel = vi.fn();
    const user = userEvent.setup();

    renderWithAuth(<MoversPage />, { signedIn: false, currentUser: null, openAuthPanel });

    const signInButton = await screen.findByRole("button", { name: "Sign in to request service" });
    await user.click(signInButton);

    expect(openAuthPanel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Request service" })).not.toBeInTheDocument();
  });

  it("filters movers by service type", async () => {
    fetchMovers.mockResolvedValue([sampleMover]);
    const user = userEvent.setup();

    renderWithAuth(<MoversPage />, { signedIn: true, currentUser: { _id: "t1", role: "tenant" } });
    await screen.findByText("Speedy Movers");

    await user.selectOptions(screen.getByLabelText("Service"), "packing");

    await waitFor(() => expect(fetchMovers).toHaveBeenLastCalledWith(expect.objectContaining({ serviceType: "packing" })));
  });

  it("shows the empty state when no movers match", async () => {
    fetchMovers.mockResolvedValue([]);

    renderWithAuth(<MoversPage />, { signedIn: true, currentUser: { _id: "t1", role: "tenant" } });

    expect(await screen.findByText("No movers found")).toBeInTheDocument();
  });

  it("shows an error state with retry", async () => {
    fetchMovers.mockRejectedValueOnce(new Error("Movers down"));
    fetchMovers.mockResolvedValueOnce([sampleMover]);
    const user = userEvent.setup();

    renderWithAuth(<MoversPage />, { signedIn: true, currentUser: { _id: "t1", role: "tenant" } });

    expect(await screen.findByText("Movers down")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Speedy Movers")).toBeInTheDocument();
  });

  it("lets a landlord add and remove a mover as an affiliate", async () => {
    fetchMovers.mockResolvedValue([sampleMover]);
    affiliateMover.mockResolvedValue({ ...sampleMover, affiliatedOwners: ["owner-1"] });
    const user = userEvent.setup();

    renderWithAuth(<MoversPage />, { signedIn: true, currentUser: { _id: "owner-1", role: "landlord" } });
    await screen.findByText("Speedy Movers");

    await user.click(screen.getByRole("button", { name: "Add as affiliate" }));

    expect(affiliateMover).toHaveBeenCalledWith("mover-1");
    expect(await screen.findByRole("button", { name: "Remove affiliate" })).toBeInTheDocument();
  });

  it("lets a tenant send a mover request and shows a confirmation", async () => {
    fetchMovers.mockResolvedValue([sampleMover]);
    getCurrentPositionOrNull.mockResolvedValue(null);
    createMoverRequest.mockResolvedValue({});
    const user = userEvent.setup();

    renderWithAuth(<MoversPage />, { signedIn: true, currentUser: { _id: "t1", role: "tenant" } });
    await screen.findByText("Speedy Movers");

    await user.click(screen.getByRole("button", { name: "Request service" }));
    await user.selectOptions(screen.getByLabelText("Home size"), "2br");
    await user.type(screen.getByPlaceholderText("Tell them about your move..."), "Moving next week");
    await user.click(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() =>
      expect(createMoverRequest).toHaveBeenCalledWith(
        expect.objectContaining({ mover: "mover-1", homeSize: "2br", message: "Moving next week" })
      )
    );
    expect(await screen.findByText("Request sent — the mover will respond soon.")).toBeInTheDocument();
  });
});

describe("MoversPage - mover dashboard", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the profile submission form when no profile exists yet", async () => {
    fetchMoverProfileStatus.mockResolvedValue({ status: "not_submitted" });

    renderWithAuth(<MoversPage />, { signedIn: true, currentUser: { _id: "m1", role: "mover" } });

    expect(await screen.findByText("Your mover profile")).toBeInTheDocument();
  });

  it("submits a new mover profile", async () => {
    fetchMoverProfileStatus.mockResolvedValue({ status: "not_submitted" });
    submitMoverProfile.mockResolvedValue({
      status: "pending",
      name: "New Movers Co",
      serviceTypes: ["local"],
      location: { county: "Nairobi", town: "Westlands" },
    });
    const user = userEvent.setup();

    renderWithAuth(<MoversPage />, { signedIn: true, currentUser: { _id: "m1", role: "mover" } });
    await screen.findByText("Your mover profile");

    await user.type(screen.getByLabelText("Business name"), "New Movers Co");
    await user.type(screen.getByLabelText("Phone"), "+254700000000");
    await user.type(screen.getByLabelText("County"), "Nairobi");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() =>
      expect(submitMoverProfile).toHaveBeenCalledWith(expect.objectContaining({ name: "New Movers Co" }))
    );
  });

  it("shows an approved profile and lets the mover accept a pending request", async () => {
    fetchMoverProfileStatus.mockResolvedValue({
      status: "approved",
      verified: true,
      name: "Speedy Movers",
      serviceTypes: ["local"],
      location: { town: "Westlands", county: "Nairobi" },
    });
    fetchReceivedMoverRequests.mockResolvedValue([
      {
        _id: "req-1",
        status: "pending",
        message: "Need help moving",
        tenant: { name: "Jane Tenant" },
        homeSize: "2br",
        distanceKm: 4.2,
        priceEstimate: 7520,
      },
    ]);
    updateMoverRequestStatus.mockResolvedValue({ _id: "req-1", status: "accepted", message: "Need help moving" });
    const user = userEvent.setup();

    renderWithAuth(<MoversPage />, { signedIn: true, currentUser: { _id: "m1", role: "mover" } });

    expect(await screen.findByText("Speedy Movers")).toBeInTheDocument();
    expect(await screen.findByText("Need help moving")).toBeInTheDocument();
    expect(screen.getByText("Home size: 2 Bedroom")).toBeInTheDocument();
    expect(screen.getByText("Estimated price: Ksh 7,520")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() =>
      expect(updateMoverRequestStatus).toHaveBeenCalledWith("req-1", { status: "accepted", response: "" })
    );
    expect(await screen.findByText("Accepted")).toBeInTheDocument();
  });

  it("highlights the mover request a notification tap pointed at", async () => {
    fetchMoverProfileStatus.mockResolvedValue({
      status: "approved",
      verified: true,
      name: "Speedy Movers",
      serviceTypes: ["local"],
      location: { town: "Westlands", county: "Nairobi" },
    });
    fetchReceivedMoverRequests.mockResolvedValue([
      { _id: "req-1", status: "pending", message: "Need help moving", tenant: { name: "Jane Tenant" } },
    ]);

    renderWithAuth(<MoversPage highlightId="req-1" />, {
      signedIn: true,
      currentUser: { _id: "m1", role: "mover" },
    });

    await screen.findByText("Need help moving");

    const card = screen.getByText("Need help moving").closest("article");
    expect(card.className).toContain("property-card--highlighted");
  });

  it("shows the dashboard error state with retry", async () => {
    fetchMoverProfileStatus.mockRejectedValueOnce(new Error("Dashboard down"));
    fetchMoverProfileStatus.mockResolvedValueOnce({ status: "not_submitted" });
    const user = userEvent.setup();

    renderWithAuth(<MoversPage />, { signedIn: true, currentUser: { _id: "m1", role: "mover" } });

    expect(await screen.findByText("Dashboard down")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Your mover profile")).toBeInTheDocument();
  });
});
