import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DiscoverPage from "../src/pages/DiscoverPage.jsx";

const { fetchProperties, fetchFavorites, saveFavorite, createSavedSearch } = vi.hoisted(() => ({
  fetchProperties: vi.fn(),
  fetchFavorites: vi.fn(),
  saveFavorite: vi.fn(),
  createSavedSearch: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchProperties, fetchFavorites, saveFavorite, createSavedSearch };
});

const sampleProperty = {
  _id: "prop-1",
  title: "Modern Kilimani Apartment",
  price: { rent: 45000 },
  location: { area: "Kilimani", county: "Nairobi" },
  bedrooms: 2,
  bathrooms: 1,
  images: [],
};

// This replaces three previously regex-source-matching assertions in
// page-components.test.js (which only proved these strings exist in the
// JSX source, not that the component behaves correctly at runtime) for
// Discover's highest-risk behavior: auth-gated saving and saved-state
// reflection.
describe("DiscoverPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders fetched property cards with real listing data", async () => {
    fetchProperties.mockResolvedValue([sampleProperty]);
    fetchFavorites.mockResolvedValue([]);

    render(<DiscoverPage signedIn={false} onRequireAuth={vi.fn()} onOpenProperty={vi.fn()} />);

    const card = (await screen.findByText("Modern Kilimani Apartment")).closest("article");
    expect(within(card).getByText("Kilimani, Nairobi")).toBeInTheDocument();
    expect(within(card).getByText(/Ksh\s*45,000/)).toBeInTheDocument();
  });

  it("shows the empty state when no properties are returned", async () => {
    fetchProperties.mockResolvedValue([]);
    fetchFavorites.mockResolvedValue([]);

    render(<DiscoverPage signedIn={false} onRequireAuth={vi.fn()} onOpenProperty={vi.fn()} />);

    expect(await screen.findByText("No rentals found")).toBeInTheDocument();
  });

  it("shows an error state with a retry action when the fetch fails", async () => {
    fetchProperties.mockRejectedValueOnce(new Error("Network down"));
    fetchFavorites.mockResolvedValue([]);

    render(<DiscoverPage signedIn={false} onRequireAuth={vi.fn()} onOpenProperty={vi.fn()} />);

    expect(await screen.findByText("Network down")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("requires sign-in to save, and never calls saveFavorite, when signed out", async () => {
    fetchProperties.mockResolvedValue([sampleProperty]);
    fetchFavorites.mockResolvedValue([]);
    const onRequireAuth = vi.fn();
    const user = userEvent.setup();

    render(<DiscoverPage signedIn={false} onRequireAuth={onRequireAuth} onOpenProperty={vi.fn()} />);

    const card = (await screen.findByText("Modern Kilimani Apartment")).closest("article");
    const saveButton = within(card).getByRole("button", { name: "Sign in to save" });
    await user.click(saveButton);

    expect(onRequireAuth).toHaveBeenCalledTimes(1);
    expect(saveFavorite).not.toHaveBeenCalled();
  });

  it("saves a listing when signed in, then reflects it as Saved and disables the button", async () => {
    fetchProperties.mockResolvedValue([sampleProperty]);
    fetchFavorites.mockResolvedValue([]);
    saveFavorite.mockResolvedValue({});
    const user = userEvent.setup();

    render(<DiscoverPage signedIn onRequireAuth={vi.fn()} onOpenProperty={vi.fn()} />);

    const card = (await screen.findByText("Modern Kilimani Apartment")).closest("article");
    const saveButton = within(card).getByRole("button", { name: "Save" });
    await user.click(saveButton);

    expect(saveFavorite).toHaveBeenCalledWith("prop-1");
    await waitFor(() => expect(within(card).getByRole("button", { name: "Saved" })).toBeDisabled());
  });

  it("reflects a listing already in favorites as Saved on initial load, without calling saveFavorite", async () => {
    fetchProperties.mockResolvedValue([sampleProperty]);
    fetchFavorites.mockResolvedValue([{ property: { _id: "prop-1" } }]);

    render(<DiscoverPage signedIn onRequireAuth={vi.fn()} onOpenProperty={vi.fn()} />);

    const card = (await screen.findByText("Modern Kilimani Apartment")).closest("article");
    expect(await within(card).findByRole("button", { name: "Saved" })).toBeDisabled();
    expect(saveFavorite).not.toHaveBeenCalled();
  });
});
