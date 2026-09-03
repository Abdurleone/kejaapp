import { fireEvent, render, waitFor } from "@testing-library/react-native";
import AdminUserDetailScreen from "./AdminUserDetailScreen.js";
import { lightColors } from "../../theme/colors.js";

jest.mock("../../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({
  fetchAdminUserSummary: jest.fn(),
  fetchAdminUserStatusHistory: jest.fn(),
  updateAdminUserStatus: jest.fn(),
}));

import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import {
  fetchAdminUserSummary,
  fetchAdminUserStatusHistory,
  updateAdminUserStatus,
} from "../../api/index.js";

const tenantSummary = {
  user: { _id: "u2", name: "Jane Tenant", email: "jane@example.com", role: "tenant", accountStatus: "active" },
  summary: { violations: { open: 0 }, tenant: { savedProperties: 2, inquiries: { open: 1 } } },
};

const renderScreen = () => render(<AdminUserDetailScreen route={{ params: { userId: "u2" } }} />);

describe("AdminUserDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
    useAuth.mockReturnValue({ user: { _id: "admin1" } });
  });

  it("loads and renders a user's stats and status history", async () => {
    fetchAdminUserSummary.mockResolvedValue(tenantSummary);
    fetchAdminUserStatusHistory.mockResolvedValue([
      { _id: "h1", newStatus: "active", changedBy: { name: "Admin One" }, reason: "" },
    ]);

    const { findByText, getByText } = await renderScreen();

    expect(await findByText("Jane Tenant")).toBeTruthy();
    expect(getByText("jane@example.com")).toBeTruthy();
    expect(getByText("2")).toBeTruthy();
    expect(getByText(/Admin One/)).toBeTruthy();
  });

  it("shows an empty state when there's no status history yet", async () => {
    fetchAdminUserSummary.mockResolvedValue(tenantSummary);
    fetchAdminUserStatusHistory.mockResolvedValue([]);

    const { findByText } = await renderScreen();

    expect(await findByText("No status changes recorded yet.")).toBeTruthy();
  });

  it("prevents an admin from changing their own account status", async () => {
    fetchAdminUserSummary.mockResolvedValue({
      user: { _id: "admin1", name: "Admin One", email: "admin@example.com", role: "admin", accountStatus: "active" },
      summary: { violations: { open: 0 } },
    });
    fetchAdminUserStatusHistory.mockResolvedValue([]);

    const { findByText, queryByText } = await renderScreen();

    expect(await findByText("You cannot change your own account status.")).toBeTruthy();
    expect(queryByText("Update status")).toBeNull();
  });

  it("updates a user's account status with a reason", async () => {
    fetchAdminUserSummary.mockResolvedValue(tenantSummary);
    fetchAdminUserStatusHistory
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { _id: "h2", newStatus: "suspended", changedBy: { name: "Admin One" }, reason: "Policy violation" },
      ]);
    updateAdminUserStatus.mockResolvedValue({ ...tenantSummary.user, accountStatus: "suspended" });

    const { findByText, getByText, getByPlaceholderText } = await renderScreen();
    await findByText("Jane Tenant");

    await fireEvent.press(getByText("Suspended"));
    await fireEvent.changeText(
      getByPlaceholderText("Why is this account's status changing?"),
      "Policy violation",
    );
    await fireEvent.press(getByText("Update status"));

    await waitFor(() => expect(getByText("Account status updated.")).toBeTruthy());
    expect(updateAdminUserStatus).toHaveBeenCalledWith("u2", { status: "suspended", reason: "Policy violation" });
    expect(await findByText(/Admin One/)).toBeTruthy();
  });

  it("blocks suspending an account with a blank reason, without calling updateAdminUserStatus", async () => {
    fetchAdminUserSummary.mockResolvedValue(tenantSummary);
    fetchAdminUserStatusHistory.mockResolvedValue([]);

    const { findByText, getByText } = await renderScreen();
    await findByText("Jane Tenant");

    await fireEvent.press(getByText("Suspended"));
    await fireEvent.press(getByText("Update status"));

    await waitFor(() => expect(getByText("A reason is required to suspend or ban an account.")).toBeTruthy());
    expect(updateAdminUserStatus).not.toHaveBeenCalled();
  });

  it("shows a retry action when loading fails", async () => {
    fetchAdminUserSummary.mockRejectedValueOnce(new Error("Could not load user"));
    fetchAdminUserStatusHistory.mockRejectedValueOnce(new Error("Could not load user"));
    fetchAdminUserSummary.mockResolvedValueOnce(tenantSummary);
    fetchAdminUserStatusHistory.mockResolvedValueOnce([]);

    const { findByText, getByText } = await renderScreen();

    expect(await findByText("Could not load user")).toBeTruthy();

    await fireEvent.press(getByText("Retry"));

    expect(await findByText("Jane Tenant")).toBeTruthy();
  });
});
