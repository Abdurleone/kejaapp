import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountPage from "../src/pages/AccountPage.jsx";
import { renderWithAuth } from "./helpers/renderWithAuth.jsx";

const { fetchSavedSearches, deleteSavedSearch, deleteCurrentAccount, updateCurrentUser, changeCurrentUserPassword } =
  vi.hoisted(() => ({
    fetchSavedSearches: vi.fn(),
    deleteSavedSearch: vi.fn(),
    deleteCurrentAccount: vi.fn(),
    updateCurrentUser: vi.fn(),
    changeCurrentUserPassword: vi.fn(),
  }));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchSavedSearches, deleteSavedSearch, deleteCurrentAccount, updateCurrentUser, changeCurrentUserPassword };
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

  it("edits and saves name/phone, updating the shared currentUser", async () => {
    fetchSavedSearches.mockResolvedValue([]);
    updateCurrentUser.mockResolvedValue({ ...tenantUser, name: "Jane Updated", phone: "+254711111111" });
    const setCurrentUser = vi.fn();
    const user = userEvent.setup();

    renderWithAuth(<AccountPage onAccountDeleted={vi.fn()} />, { currentUser: tenantUser, setCurrentUser });
    await screen.findByText("janetenant");

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Jane Updated");
    const phoneInput = screen.getByLabelText("Phone");
    await user.clear(phoneInput);
    await user.type(phoneInput, "+254711111111");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateCurrentUser).toHaveBeenCalledWith({ name: "Jane Updated", phone: "+254711111111" })
    );
    expect(setCurrentUser).toHaveBeenCalledWith({ ...tenantUser, name: "Jane Updated", phone: "+254711111111" });
    expect(await screen.findByText("Profile updated.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("shows an inline error and stays in edit mode when the profile update fails", async () => {
    fetchSavedSearches.mockResolvedValue([]);
    updateCurrentUser.mockRejectedValue(new Error("Name must be at least 2 characters"));
    const user = userEvent.setup();

    renderWithAuth(<AccountPage onAccountDeleted={vi.fn()} />, { currentUser: tenantUser });
    await screen.findByText("janetenant");

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Name must be at least 2 characters")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("cancels editing without saving", async () => {
    fetchSavedSearches.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithAuth(<AccountPage onAccountDeleted={vi.fn()} />, { currentUser: tenantUser });
    await screen.findByText("janetenant");

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Should not save");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(updateCurrentUser).not.toHaveBeenCalled();
    expect(screen.getByText("Jane Tenant")).toBeInTheDocument();
  });

  it("changes the password when current and new passwords are valid", async () => {
    fetchSavedSearches.mockResolvedValue([]);
    changeCurrentUserPassword.mockResolvedValue({ message: "Password updated" });
    const user = userEvent.setup();

    renderWithAuth(<AccountPage onAccountDeleted={vi.fn()} />, { currentUser: tenantUser });
    await screen.findByText("Change password");

    await user.type(screen.getByLabelText("Current password"), "oldpassword1");
    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm new password"), "newpassword1");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() =>
      expect(changeCurrentUserPassword).toHaveBeenCalledWith({
        currentPassword: "oldpassword1",
        newPassword: "newpassword1",
      })
    );
    expect(await screen.findByText("Password updated.")).toBeInTheDocument();
  });

  it("rejects a password change locally when confirmation doesn't match, without calling the API", async () => {
    fetchSavedSearches.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithAuth(<AccountPage onAccountDeleted={vi.fn()} />, { currentUser: tenantUser });
    await screen.findByText("Change password");

    await user.type(screen.getByLabelText("Current password"), "oldpassword1");
    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm new password"), "somethingelse1");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("New password and confirmation don't match.")).toBeInTheDocument();
    expect(changeCurrentUserPassword).not.toHaveBeenCalled();
  });

  it("shows an inline error when the password change is rejected by the API", async () => {
    fetchSavedSearches.mockResolvedValue([]);
    changeCurrentUserPassword.mockRejectedValue(new Error("Current password is incorrect"));
    const user = userEvent.setup();

    renderWithAuth(<AccountPage onAccountDeleted={vi.fn()} />, { currentUser: tenantUser });
    await screen.findByText("Change password");

    await user.type(screen.getByLabelText("Current password"), "wrongpassword");
    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm new password"), "newpassword1");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Current password is incorrect")).toBeInTheDocument();
  });
});
