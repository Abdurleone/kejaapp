import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthModal from "../src/components/AuthModal.jsx";

const { loginUser, registerUser } = vi.hoisted(() => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loginUser, registerUser };
});

// Extracted out of App.jsx's page-components.test.js regex checks - now real
// render + interaction tests covering the sign-in/register mode switch,
// submit wiring to loginUser/registerUser, the username-suggestion-on-
// conflict flow, and both dismiss actions.
describe("AuthModal", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to sign-in mode with only email/username and password fields", () => {
    render(<AuthModal onClose={vi.fn()} onAuthenticated={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email or username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
  });

  it("switches to register mode, revealing name/username/phone/role fields", async () => {
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toBeInTheDocument();
    expect(screen.getByLabelText("Role")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /agree to the terms of service/i })).toBeInTheDocument();
  });

  it("logs in with the identifier/password and reports the authenticated user", async () => {
    loginUser.mockResolvedValue({ user: { _id: "u1", role: "tenant" } });
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<AuthModal onClose={vi.fn()} onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText("Email or username"), "tenant@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    const form = container.querySelector("form");
    await user.click(within(form).getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(loginUser).toHaveBeenCalledWith({ identifier: "tenant@example.com", password: "password123" })
    );
    expect(onAuthenticated).toHaveBeenCalledWith({ _id: "u1", role: "tenant" });
  });

  it("registers with the full form and reports the authenticated user", async () => {
    registerUser.mockResolvedValue({ user: { _id: "u2", role: "landlord" } });
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<AuthModal onClose={vi.fn()} onAuthenticated={onAuthenticated} />);

    await user.click(screen.getByRole("button", { name: "Register" }));
    await user.type(screen.getByLabelText("Name"), "Jane Landlord");
    await user.type(screen.getByLabelText("Username"), "janelandlord");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.selectOptions(screen.getByLabelText("Role"), "landlord");
    await user.click(screen.getByRole("checkbox", { name: /agree to the terms of service/i }));
    const form = container.querySelector("form");
    await user.click(within(form).getByRole("button", { name: "Register" }));

    await waitFor(() =>
      expect(registerUser).toHaveBeenCalledWith({
        name: "Jane Landlord",
        email: "jane@example.com",
        username: "janelandlord",
        password: "password123",
        phone: "",
        role: "landlord",
        termsAccepted: true,
      })
    );
    expect(onAuthenticated).toHaveBeenCalledWith({ _id: "u2", role: "landlord" });
  });

  it("rejects registration locally when the terms checkbox isn't checked, without calling the API", async () => {
    const user = userEvent.setup();
    const { container } = render(<AuthModal onClose={vi.fn()} onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Register" }));
    await user.type(screen.getByLabelText("Name"), "Jane Landlord");
    await user.type(screen.getByLabelText("Username"), "janelandlord");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    const form = container.querySelector("form");
    await user.click(within(form).getByRole("button", { name: "Register" }));

    expect(await screen.findByText("You must agree to the Terms of Service to create an account.")).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("shows an error and username suggestions on a register conflict, and fills the field on click", async () => {
    const conflictError = Object.assign(new Error("Username taken"), { suggestions: ["janelandlord2", "jane_landlord"] });
    registerUser.mockRejectedValue(conflictError);
    const user = userEvent.setup();
    const { container } = render(<AuthModal onClose={vi.fn()} onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Register" }));
    await user.type(screen.getByLabelText("Name"), "Jane");
    await user.type(screen.getByLabelText("Username"), "janelandlord");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("checkbox", { name: /agree to the terms of service/i }));
    const form = container.querySelector("form");
    await user.click(within(form).getByRole("button", { name: "Register" }));

    expect(await screen.findByText("Username taken")).toBeInTheDocument();
    const suggestionButton = screen.getByRole("button", { name: "janelandlord2" });
    await user.click(suggestionButton);

    expect(screen.getByLabelText("Username")).toHaveValue("janelandlord2");
    expect(screen.queryByRole("button", { name: "janelandlord2" })).not.toBeInTheDocument();
  });

  it("only shows a confirm-password field in register mode", async () => {
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} onAuthenticated={vi.fn()} />);

    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Register" }));
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });

  it("rejects registration locally when the confirmation doesn't match, without calling the API", async () => {
    const user = userEvent.setup();
    const { container } = render(<AuthModal onClose={vi.fn()} onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Register" }));
    await user.type(screen.getByLabelText("Name"), "Jane Landlord");
    await user.type(screen.getByLabelText("Username"), "janelandlord");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "somethingelse");
    const form = container.querySelector("form");
    await user.click(within(form).getByRole("button", { name: "Register" }));

    expect(await screen.findByText("Password and confirmation don't match.")).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("toggles password visibility with the Show/Hide button", async () => {
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} onAuthenticated={vi.fn()} />);

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("calls onClose from both the header Close button and the form Cancel button", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AuthModal onClose={onClose} onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("exposes proper dialog semantics", () => {
    render(<AuthModal onClose={vi.fn()} onAuthenticated={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "auth-panel-title");
    expect(screen.getByRole("heading", { name: "Sign in" })).toHaveAttribute("id", "auth-panel-title");
  });

  it("moves focus to the first field on open, not the Close button", () => {
    render(<AuthModal onClose={vi.fn()} onAuthenticated={vi.fn()} />);

    expect(screen.getByLabelText("Email or username")).toHaveFocus();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AuthModal onClose={onClose} onAuthenticated={vi.fn()} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps Tab focus inside the dialog, wrapping from the last element back to the first", async () => {
    const user = userEvent.setup();
    const { container } = render(<AuthModal onClose={vi.fn()} onAuthenticated={vi.fn()} />);

    // Cancel is the last focusable element in sign-in mode - Tab from here
    // must wrap back to the first (Close), not escape the dialog.
    const form = container.querySelector("form");
    within(form).getByRole("button", { name: "Cancel" }).focus();
    expect(within(form).getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    // Shift+Tab from the first element must wrap to the last.
    await user.tab({ shift: true });
    expect(within(form).getByRole("button", { name: "Cancel" })).toHaveFocus();
  });
});
