import { render, screen, waitFor, within } from "@testing-library/react";
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
    fetchFavorites.mockResolvedValue({ favorites: [sampleFavorite], pagination: null });

    render(<SavedPage onOpenProperty={vi.fn()} />);

    const card = (await screen.findByText("Modern Kilimani Apartment")).closest("article");
    expect(card).not.toBeNull();
    expect(screen.getByText("Kilimani")).toBeInTheDocument();
    expect(screen.getByText(/Ksh\s*45,000/)).toBeInTheDocument();
  });

  it("is keyboard-operable: the whole card is a focusable button that opens on Enter, without double-firing from the nested Details button", async () => {
    fetchFavorites.mockResolvedValue({ favorites: [sampleFavorite], pagination: null });
    const onOpenProperty = vi.fn();
    const user = userEvent.setup();

    render(<SavedPage onOpenProperty={onOpenProperty} />);

    const card = (await screen.findByText("Modern Kilimani Apartment")).closest("article");
    expect(card).toHaveAttribute("role", "button");
    expect(card).toHaveAttribute("tabIndex", "0");

    card.focus();
    await user.keyboard("{Enter}");
    expect(onOpenProperty).toHaveBeenCalledWith("prop-1");

    onOpenProperty.mockClear();
    within(card).getByRole("button", { name: "Details" }).focus();
    await user.keyboard("{Enter}");
    expect(onOpenProperty).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state with a Browse listings action when there are no saved listings", async () => {
    fetchFavorites.mockResolvedValue({ favorites: [], pagination: null });
    const onBrowse = vi.fn();
    const user = userEvent.setup();

    render(<SavedPage onOpenProperty={vi.fn()} onBrowse={onBrowse} />);

    expect(await screen.findByText("No saved listings yet. Explore properties to add your favorites.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Browse listings" }));
    expect(onBrowse).toHaveBeenCalledTimes(1);
  });

  it("shows an error state with a retry action when the fetch fails", async () => {
    fetchFavorites.mockRejectedValueOnce(new Error("Network down"));

    render(<SavedPage onOpenProperty={vi.fn()} />);

    expect(await screen.findByText("Network down")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("retries loading favorites when Retry is clicked", async () => {
    fetchFavorites.mockRejectedValueOnce(new Error("Network down"));
    fetchFavorites.mockResolvedValueOnce({ favorites: [sampleFavorite], pagination: null });
    const user = userEvent.setup();

    render(<SavedPage onOpenProperty={vi.fn()} />);
    await screen.findByText("Network down");

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Modern Kilimani Apartment")).toBeInTheDocument();
  });

  it("opens property details when Details is clicked", async () => {
    fetchFavorites.mockResolvedValue({ favorites: [sampleFavorite], pagination: null });
    const onOpenProperty = vi.fn();
    const user = userEvent.setup();

    render(<SavedPage onOpenProperty={onOpenProperty} />);
    await screen.findByText("Modern Kilimani Apartment");

    await user.click(screen.getByRole("button", { name: "Details" }));

    expect(onOpenProperty).toHaveBeenCalledWith("prop-1");
  });

  it("removes a favorite and drops it from the list", async () => {
    fetchFavorites.mockResolvedValue({ favorites: [sampleFavorite], pagination: null });
    removeFavorite.mockResolvedValue({});
    const user = userEvent.setup();

    render(<SavedPage onOpenProperty={vi.fn()} />);
    await screen.findByText("Modern Kilimani Apartment");

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(removeFavorite).toHaveBeenCalledWith("prop-1");
    await waitFor(() => expect(screen.queryByText("Modern Kilimani Apartment")).not.toBeInTheDocument());
  });

  it("paginates to the next page of saved listings", async () => {
    const pageTwoFavorite = {
      property: {
        _id: "prop-2",
        title: "Nyali Beach View Apartment",
        price: { rent: 60000 },
        location: { area: "Nyali" },
      },
    };
    fetchFavorites.mockImplementation(({ page } = {}) =>
      page === 2
        ? Promise.resolve({ favorites: [pageTwoFavorite], pagination: { page: 2, limit: 20, total: 21, pages: 2 } })
        : Promise.resolve({ favorites: [sampleFavorite], pagination: { page: 1, limit: 20, total: 21, pages: 2 } })
    );
    const user = userEvent.setup();

    render(<SavedPage onOpenProperty={vi.fn()} />);
    await screen.findByText("Modern Kilimani Apartment");
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));

    await screen.findByText("Nyali Beach View Apartment");
    expect(fetchFavorites).toHaveBeenLastCalledWith({ page: 2 });
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("shows an inline error when removing a favorite fails, without hiding the rest of the list", async () => {
    fetchFavorites.mockResolvedValue({ favorites: [sampleFavorite], pagination: null });
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
