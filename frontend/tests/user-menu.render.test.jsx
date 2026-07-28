import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UserMenu from "../src/components/UserMenu.jsx";

// Replaces a header that previously showed a name pill plus an always-visible
// "Sign out" button as two separate elements - folded into one compact
// trigger + menu so the signed-in header fits on a single row at any width.
describe("UserMenu", () => {
  it("shows the label and keeps sign-out hidden until opened", () => {
    render(<UserMenu label="Demo Tenant" onSignOut={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Demo Tenant" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("opens the menu on click and calls onSignOut when Sign out is clicked", async () => {
    const onSignOut = vi.fn();
    const user = userEvent.setup();
    render(<UserMenu label="Demo Tenant" onSignOut={onSignOut} />);

    await user.click(screen.getByRole("button", { name: "Demo Tenant" }));
    const signOutItem = screen.getByRole("menuitem", { name: "Sign out" });
    expect(signOutItem).toBeInTheDocument();

    await user.click(signOutItem);
    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menuitem", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("closes the menu when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <UserMenu label="Demo Tenant" onSignOut={vi.fn()} />
        <button type="button">Elsewhere</button>
      </div>
    );

    await user.click(screen.getByRole("button", { name: "Demo Tenant" }));
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("menuitem", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("closes the menu on Escape", async () => {
    const user = userEvent.setup();
    render(<UserMenu label="Demo Tenant" onSignOut={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Demo Tenant" }));
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menuitem", { name: "Sign out" })).not.toBeInTheDocument();
  });
});
