import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PropertyCreatePage from "../src/pages/PropertyCreatePage.jsx";

const { createProperty } = vi.hoisted(() => ({
  createProperty: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, createProperty };
});

// Replaces page-components.test.js's regex-source-matching assertions for
// PropertyCreatePage (and the shared PropertyForm it uses) with real
// render + interaction tests.
describe("PropertyCreatePage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a listing via the shared form and reports it back", async () => {
    const created = { _id: "prop-new", title: "Cozy Studio" };
    createProperty.mockResolvedValue(created);
    const onCreated = vi.fn();
    const user = userEvent.setup();

    render(<PropertyCreatePage onBack={vi.fn()} onCreated={onCreated} />);

    await user.type(screen.getByLabelText("Title"), "Cozy Studio");
    await user.type(screen.getByLabelText("Monthly rent (KES)"), "30000");
    await user.click(screen.getByRole("button", { name: "Create listing" }));

    await waitFor(() =>
      expect(createProperty).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Cozy Studio", price: expect.objectContaining({ rent: 30000 }) })
      )
    );
    expect(onCreated).toHaveBeenCalledWith(created);
  });

  it("shows a validation error and never calls the API when the title is too short", async () => {
    const user = userEvent.setup();

    render(<PropertyCreatePage onBack={vi.fn()} onCreated={vi.fn()} />);

    await user.type(screen.getByLabelText("Title"), "Hi");
    await user.type(screen.getByLabelText("Monthly rent (KES)"), "30000");
    await user.click(screen.getByRole("button", { name: "Create listing" }));

    expect(await screen.findByText("Title must be at least 3 characters.")).toBeInTheDocument();
    expect(createProperty).not.toHaveBeenCalled();
  });

  it("shows a server error when creation fails", async () => {
    createProperty.mockRejectedValue(new Error("Could not create this listing."));
    const user = userEvent.setup();

    render(<PropertyCreatePage onBack={vi.fn()} onCreated={vi.fn()} />);

    await user.type(screen.getByLabelText("Title"), "Cozy Studio");
    await user.type(screen.getByLabelText("Monthly rent (KES)"), "30000");
    await user.click(screen.getByRole("button", { name: "Create listing" }));

    expect(await screen.findByText("Could not create this listing.")).toBeInTheDocument();
  });

  it("calls onBack when Done/back is clicked", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(<PropertyCreatePage onBack={onBack} onCreated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "← Back to workspace" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
