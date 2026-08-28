import { fireEvent, render, waitFor } from "@testing-library/react-native";
import SelectRoleScreen from "./SelectRoleScreen.js";
import { lightColors } from "../../theme/colors.js";

jest.mock("../../context/AuthContext.js", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/ThemeContext.js", () => ({ useTheme: jest.fn() }));
jest.mock("../../api/index.js", () => ({ confirmRole: jest.fn() }));

import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { confirmRole } from "../../api/index.js";

describe("SelectRoleScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTheme.mockReturnValue({ colors: lightColors });
  });

  it("submits the selected role and updates the user via context", async () => {
    const updateUser = jest.fn();
    useAuth.mockReturnValue({ updateUser });
    confirmRole.mockResolvedValue({ id: "u1", role: "landlord", roleConfirmed: true });

    const { getByText, getByLabelText } = await render(<SelectRoleScreen />);

    await fireEvent.press(getByText("Landlord - I own properties to rent out"));
    await fireEvent.press(getByLabelText("I agree to the Terms of Service and Privacy & Data Protection Policy"));
    await fireEvent.press(getByText("Continue"));

    await waitFor(() => expect(confirmRole).toHaveBeenCalledWith("landlord", true));
    expect(updateUser).toHaveBeenCalledWith({ id: "u1", role: "landlord", roleConfirmed: true });
  });

  it("defaults to tenant and shows an error without updating the user when confirmRole fails", async () => {
    const updateUser = jest.fn();
    useAuth.mockReturnValue({ updateUser });
    confirmRole.mockRejectedValue(new Error("Invalid role"));

    const { getByText, getByLabelText } = await render(<SelectRoleScreen />);

    await fireEvent.press(getByLabelText("I agree to the Terms of Service and Privacy & Data Protection Policy"));
    await fireEvent.press(getByText("Continue"));

    await waitFor(() => expect(confirmRole).toHaveBeenCalledWith("tenant", true));
    expect(await getByText("Invalid role")).toBeTruthy();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("rejects submission when the terms checkbox isn't checked, without calling confirmRole", async () => {
    const updateUser = jest.fn();
    useAuth.mockReturnValue({ updateUser });

    const { getByText, findByText } = await render(<SelectRoleScreen />);

    await fireEvent.press(getByText("Continue"));

    expect(await findByText("You must agree to the Terms of Service to continue.")).toBeTruthy();
    expect(confirmRole).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });
});
