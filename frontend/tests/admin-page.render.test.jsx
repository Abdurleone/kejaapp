import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminPage from "../src/pages/AdminPage.jsx";
import { renderWithAuth } from "./helpers/renderWithAuth.jsx";

const {
  fetchAdminUsers,
  fetchAdminUserSummary,
  fetchAdminUserStatusHistory,
  fetchAdminReviews,
  updateAdminUserStatus,
} = vi.hoisted(() => ({
  fetchAdminUsers: vi.fn(),
  fetchAdminUserSummary: vi.fn(),
  fetchAdminUserStatusHistory: vi.fn(),
  fetchAdminReviews: vi.fn(),
  updateAdminUserStatus: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchAdminUsers,
    fetchAdminUserSummary,
    fetchAdminUserStatusHistory,
    fetchAdminReviews,
    updateAdminUserStatus,
  };
});

const adminUser = { _id: "admin-1", name: "Admin User", role: "admin" };
const janeUser = { _id: "user-1", name: "Jane Tenant", email: "jane@example.com", role: "tenant", accountStatus: "active" };

const usersPage = { users: [janeUser], pagination: { page: 1, pages: 1, total: 1 } };

// Replaces the (previously nonexistent) test coverage for AdminPage with
// real render + interaction tests: the Users list/search/filter/detail/
// status-update flow, and the read-only Reviews segment.
describe("AdminPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the users list with real data", async () => {
    fetchAdminUsers.mockResolvedValue(usersPage);

    renderWithAuth(<AdminPage />, { currentUser: adminUser });

    expect(await screen.findByText("Users (1)")).toBeInTheDocument();
    expect(screen.getByText("Jane Tenant")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("re-fetches when the role filter changes, resetting to page 1", async () => {
    fetchAdminUsers.mockResolvedValue(usersPage);
    const user = userEvent.setup();

    renderWithAuth(<AdminPage />, { currentUser: adminUser });
    await screen.findByText("Jane Tenant");

    await user.selectOptions(screen.getByDisplayValue("All roles"), "landlord");

    await waitFor(() =>
      expect(fetchAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, role: "landlord" }))
    );
  });

  it("searches by name/email/phone", async () => {
    fetchAdminUsers.mockResolvedValue(usersPage);
    const user = userEvent.setup();

    renderWithAuth(<AdminPage />, { currentUser: adminUser });
    await screen.findByText("Jane Tenant");

    await user.type(screen.getByPlaceholderText("Search by name, email, or phone"), "jane");

    await waitFor(() =>
      expect(fetchAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ search: "jane" }))
    );
  });

  it("debounces the search input instead of fetching per keystroke", async () => {
    fetchAdminUsers.mockResolvedValue(usersPage);
    const user = userEvent.setup();

    renderWithAuth(<AdminPage />, { currentUser: adminUser });
    await screen.findByText("Jane Tenant");

    const callCountBeforeTyping = fetchAdminUsers.mock.calls.length;

    // A single change is enough to prove the fetch is debounced rather than
    // firing once per keystroke - typing "jane" is 4 keystrokes, but only
    // one additional fetch (for the final settled value) should follow.
    await user.type(screen.getByPlaceholderText("Search by name, email, or phone"), "jane");

    await waitFor(() =>
      expect(fetchAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ search: "jane" }))
    );

    expect(fetchAdminUsers.mock.calls.length).toBe(callCountBeforeTyping + 1);
  });

  it("shows the empty state when no users match", async () => {
    fetchAdminUsers.mockResolvedValue({ users: [], pagination: { page: 1, pages: 1, total: 0 } });

    renderWithAuth(<AdminPage />, { currentUser: adminUser });

    expect(await screen.findByText("No users match this search.")).toBeInTheDocument();
  });

  it("shows an error state with retry", async () => {
    fetchAdminUsers.mockRejectedValueOnce(new Error("Users down"));
    fetchAdminUsers.mockResolvedValueOnce(usersPage);
    const user = userEvent.setup();

    renderWithAuth(<AdminPage />, { currentUser: adminUser });

    expect(await screen.findByText("Users down")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Jane Tenant")).toBeInTheDocument();
  });

  it("opens a user's detail panel and updates their account status", async () => {
    fetchAdminUsers.mockResolvedValue(usersPage);
    fetchAdminUserSummary.mockResolvedValue({
      user: janeUser,
      summary: { violations: { open: 0 }, tenant: { savedProperties: 2, inquiries: { open: 1 } } },
    });
    fetchAdminUserStatusHistory.mockResolvedValue([]);
    updateAdminUserStatus.mockResolvedValue({ ...janeUser, accountStatus: "suspended" });
    const user = userEvent.setup();

    renderWithAuth(<AdminPage />, { currentUser: adminUser });
    await screen.findByText("Jane Tenant");

    await user.click(screen.getByText("Jane Tenant"));
    expect(await screen.findByText("Open violations")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Account status"), "suspended");
    await user.type(screen.getByLabelText("Reason (required for suspend or ban)"), "Repeated violations");
    await user.click(screen.getByRole("button", { name: "Update status" }));

    await waitFor(() =>
      expect(updateAdminUserStatus).toHaveBeenCalledWith("user-1", {
        status: "suspended",
        reason: "Repeated violations",
      })
    );
    expect(await screen.findByText("Account status updated.")).toBeInTheDocument();
  });

  it("prevents an admin from changing their own account status", async () => {
    fetchAdminUsers.mockResolvedValue({
      users: [adminUser],
      pagination: { page: 1, pages: 1, total: 1 },
    });
    fetchAdminUserSummary.mockResolvedValue({
      user: adminUser,
      summary: { violations: { open: 0 } },
    });
    fetchAdminUserStatusHistory.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithAuth(<AdminPage />, { currentUser: adminUser });
    await screen.findByText("Admin User");

    await user.click(screen.getByText("Admin User"));

    expect(await screen.findByText("You cannot change your own account status.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update status" })).not.toBeInTheDocument();
  });

  it("switches to the Reviews segment and renders read-only review data", async () => {
    fetchAdminUsers.mockResolvedValue(usersPage);
    fetchAdminReviews.mockResolvedValue([
      {
        _id: "rev-1",
        property: { title: "Modern Kilimani Apartment" },
        user: { name: "Jane Tenant" },
        rating: 5,
        comment: "Great place!",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const user = userEvent.setup();

    renderWithAuth(<AdminPage />, { currentUser: adminUser });
    await screen.findByText("Jane Tenant");

    await user.click(screen.getByRole("button", { name: "Reviews" }));

    expect(await screen.findByText("Modern Kilimani Apartment")).toBeInTheDocument();
    expect(screen.getByText("Great place!")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /respond/i })).not.toBeInTheDocument();
  });
});
