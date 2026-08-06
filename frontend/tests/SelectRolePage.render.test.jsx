import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import SelectRolePage from "../src/pages/SelectRolePage.jsx";

const { confirmRole } = vi.hoisted(() => ({
  confirmRole: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, confirmRole };
});

describe("SelectRolePage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submits the selected role and calls onRoleConfirmed with the updated user", async () => {
    const user = userEvent.setup();
    confirmRole.mockResolvedValue({ id: "u1", role: "landlord", roleConfirmed: true });
    const onRoleConfirmed = vi.fn();

    render(<SelectRolePage onRoleConfirmed={onRoleConfirmed} />);

    await user.selectOptions(screen.getByLabelText("I am a"), "landlord");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(confirmRole).toHaveBeenCalledWith("landlord"));
    expect(onRoleConfirmed).toHaveBeenCalledWith({ id: "u1", role: "landlord", roleConfirmed: true });
  });

  it("shows an error and does not call onRoleConfirmed when confirmRole fails", async () => {
    const user = userEvent.setup();
    confirmRole.mockRejectedValue(new Error("Invalid role"));
    const onRoleConfirmed = vi.fn();

    render(<SelectRolePage onRoleConfirmed={onRoleConfirmed} />);

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Invalid role")).toBeInTheDocument();
    expect(onRoleConfirmed).not.toHaveBeenCalled();
  });
});
