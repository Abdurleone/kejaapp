import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountPage from "../src/pages/AccountPage.jsx";
import { renderWithAuth } from "./helpers/renderWithAuth.jsx";

const { fetchSavedSearches, deleteSavedSearch, deleteCurrentAccount } = vi.hoisted(() => ({
  fetchSavedSearches: vi.fn(),
  deleteSavedSearch: vi.fn(),
  deleteCurrentAccount: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchSavedSearches, deleteSavedSearch, deleteCurrentAccount };
});

const tenantUser = { name: "Jane Tenant", username: "janetenant", email: "jane@example.com", role: "tenant", phone: "+254700000000" };

// Replaces page-components.test.js's regex-source-matching assertions for
// AccountPage with real render + interaction tests.
describe("AccountPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the signed-in user's profile fields", async () => {
    fetchSavedSearches.mockResolvedValue([]);

    renderWithAuth(<AccountPage onAccountDeleted={vi.fn()} />, { currentUser: tenantUser });

    expect(await screen.findByText("janetenant")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("tenant")).toBeInTheDocument();
  });

  it("shows saved searches only for tenants", async () => {
    fetchSavedSearches.mockResolvedValue([{ _id: "ss-1", county: "Nairobi", bedrooms: 2 }]);

    renderWithAuth(<AccountPage onAccountDeleted={vi.fn()} />, { currentUser: tenantUser });

    expect(await screen.findByText(/in Nairobi/)).toBeInTheDocument();
  });

  it("does not show the saved searches panel for a landlord", async () => {
    renderWithAuth(<AccountPage onAccountDeleted={vi.fn()} />, {
      currentUser: { ...tenantUser, role: "landlord" },
    });

    await screen.findByText("Delete account");
    expect(screen.queryByText("Saved searches")).not.toBeInTheDocument();
    expect(fetchSavedSearches).not.toHaveBeenCalled();
  });

  it("removes a saved search", async () => {
    fetchSavedSearches.mockResolvedValue([{ _id: "ss-1", county: "Nairobi" }]);
    deleteSavedSearch.mockResolvedValue({});
    const user = userEvent.setup();

    renderWithAuth(<AccountPage onAccountDeleted={vi.fn()} />, { currentUser: tenantUser });
    await screen.findByText(/in Nairobi/);

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(deleteSavedSearch).toHaveBeenCalledWith("ss-1");
    await waitFor(() => expect(screen.queryByText(/in Nairobi/)).not.toBeInTheDocument());
  });

  it("shows an inline error when removing a saved search fails, without hiding the rest of the list", async () => {
    fetchSavedSearches.mockResolvedValue([{ _id: "ss-1", county: "Nairobi" }]);
    deleteSavedSearch.mockRejectedValue(new Error("Could not delete this saved search."));
    const user = userEvent.setup();

    renderWithAuth(<AccountPage onAccountDeleted={vi.fn()} />, { currentUser: tenantUser });
    await screen.findByText(/in Nairobi/);

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("Could not delete this saved search.")).toBeInTheDocument();
    // The saved search stays visible - a failed action no longer nukes the whole list.
    expect(screen.getByText(/in Nairobi/)).toBeInTheDocument();
  });

  it("keeps Delete my account disabled until DELETE is typed exactly", async () => {
    fetchSavedSearches.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithAuth(<AccountPage onAccountDeleted={vi.fn()} />, { currentUser: tenantUser });
    await screen.findByText("Delete account");

    const deleteButton = screen.getByRole("button", { name: "Delete my account" });
    expect(deleteButton).toBeDisabled();

    await user.type(screen.getByLabelText("Type DELETE to confirm"), "delete");
    expect(deleteButton).toBeDisabled();

    await user.clear(screen.getByLabelText("Type DELETE to confirm"));
    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    expect(deleteButton).toBeEnabled();
  });

  it("deletes the account once confirmed", async () => {
    fetchSavedSearches.mockResolvedValue([]);
    deleteCurrentAccount.mockResolvedValue({});
    const onAccountDeleted = vi.fn();
    const user = userEvent.setup();

    renderWithAuth(<AccountPage onAccountDeleted={onAccountDeleted} />, { currentUser: tenantUser });
    await screen.findByText("Delete account");

    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await user.click(screen.getByRole("button", { name: "Delete my account" }));

    await waitFor(() => expect(deleteCurrentAccount).toHaveBeenCalledTimes(1));
    expect(onAccountDeleted).toHaveBeenCalledTimes(1);
  });

  it("shows an error and does not call onAccountDeleted when deletion fails", async () => {
    fetchSavedSearches.mockResolvedValue([]);
    deleteCurrentAccount.mockRejectedValue(new Error("Account deletion failed"));
    const onAccountDeleted = vi.fn();
    const user = userEvent.setup();

    renderWithAuth(<AccountPage onAccountDeleted={onAccountDeleted} />, { currentUser: tenantUser });
    await screen.findByText("Delete account");

    await user.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await user.click(screen.getByRole("button", { name: "Delete my account" }));

    expect(await screen.findByText("Account deletion failed")).toBeInTheDocument();
    expect(onAccountDeleted).not.toHaveBeenCalled();
  });
});
