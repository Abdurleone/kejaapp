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
    await user.selectOptions(screen.getByLabelText("Role"), "landlord");
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
      })
    );
    expect(onAuthenticated).toHaveBeenCalledWith({ _id: "u2", role: "landlord" });
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
    const form = container.querySelector("form");
    await user.click(within(form).getByRole("button", { name: "Register" }));

    expect(await screen.findByText("Username taken")).toBeInTheDocument();
    const suggestionButton = screen.getByRole("button", { name: "janelandlord2" });
    await user.click(suggestionButton);

    expect(screen.getByLabelText("Username")).toHaveValue("janelandlord2");
    expect(screen.queryByRole("button", { name: "janelandlord2" })).not.toBeInTheDocument();
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
});
