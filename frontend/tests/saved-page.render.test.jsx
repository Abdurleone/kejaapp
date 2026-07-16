import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import SavedPage from "../src/pages/SavedPage.jsx";

const { fetchFavorites, removeFavorite } = vi.hoisted(() => ({
  fetchFavorites: vi.fn(),
  removeFavorite: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchFavorites, removeFavorite };
});

const sampleFavorite = {
  property: {
    _id: "prop-1",
    title: "Modern Kilimani Apartment",
    price: { rent: 45000 },
    location: { area: "Kilimani" },
  },
};

// Replaces page-components.test.js's regex-source-matching assertions for
// SavedPage with real render + interaction tests.
describe("SavedPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders saved listings with real favorite data", async () => {
    fetchFavorites.mockResolvedValue([sampleFavorite]);

    render(<SavedPage onOpenProperty={vi.fn()} />);

    const card = (await screen.findByText("Modern Kilimani Apartment")).closest("article");
    expect(card).not.toBeNull();
    expect(screen.getByText("Kilimani")).toBeInTheDocument();
    expect(screen.getByText(/Ksh\s*45,000/)).toBeInTheDocument();
  });

  it("shows the empty state when there are no saved listings", async () => {
    fetchFavorites.mockResolvedValue([]);

    render(<SavedPage onOpenProperty={vi.fn()} />);

    expect(await screen.findByText("No saved listings yet. Explore properties to add your favorites.")).toBeInTheDocument();
  });

  it("shows an error state with a retry action when the fetch fails", async () => {
    fetchFavorites.mockRejectedValueOnce(new Error("Network down"));

    render(<SavedPage onOpenProperty={vi.fn()} />);

    expect(await screen.findByText("Network down")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("retries loading favorites when Retry is clicked", async () => {
    fetchFavorites.mockRejectedValueOnce(new Error("Network down"));
    fetchFavorites.mockResolvedValueOnce([sampleFavorite]);
    const user = userEvent.setup();

    render(<SavedPage onOpenProperty={vi.fn()} />);
    await screen.findByText("Network down");

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Modern Kilimani Apartment")).toBeInTheDocument();
  });

  it("opens property details when Details is clicked", async () => {
    fetchFavorites.mockResolvedValue([sampleFavorite]);
    const onOpenProperty = vi.fn();
    const user = userEvent.setup();

    render(<SavedPage onOpenProperty={onOpenProperty} />);
    await screen.findByText("Modern Kilimani Apartment");

    await user.click(screen.getByRole("button", { name: "Details" }));

    expect(onOpenProperty).toHaveBeenCalledWith("prop-1");
  });

  it("removes a favorite and drops it from the list", async () => {
    fetchFavorites.mockResolvedValue([sampleFavorite]);
    removeFavorite.mockResolvedValue({});
    const user = userEvent.setup();

    render(<SavedPage onOpenProperty={vi.fn()} />);
    await screen.findByText("Modern Kilimani Apartment");

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(removeFavorite).toHaveBeenCalledWith("prop-1");
    await waitFor(() => expect(screen.queryByText("Modern Kilimani Apartment")).not.toBeInTheDocument());
  });

  it("shows an inline error when removing a favorite fails, without hiding the rest of the list", async () => {
    fetchFavorites.mockResolvedValue([sampleFavorite]);
    removeFavorite.mockRejectedValue(new Error("Unable to remove favorite."));
    const user = userEvent.setup();

    render(<SavedPage onOpenProperty={vi.fn()} />);
    await screen.findByText("Modern Kilimani Apartment");

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("Unable to remove favorite.")).toBeInTheDocument();
    // The card stays visible - a failed action no longer nukes the whole grid.
    expect(screen.getByText("Modern Kilimani Apartment")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });
});
