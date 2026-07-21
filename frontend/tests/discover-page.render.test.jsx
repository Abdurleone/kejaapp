import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DiscoverPage from "../src/pages/DiscoverPage.jsx";
import { renderWithAuth } from "./helpers/renderWithAuth.jsx";

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

    renderWithAuth(<DiscoverPage onOpenProperty={vi.fn()} />);

    const card = (await screen.findByText("Modern Kilimani Apartment")).closest("article");
    expect(within(card).getByText("Kilimani, Nairobi")).toBeInTheDocument();
    expect(within(card).getByText(/Ksh\s*45,000/)).toBeInTheDocument();
  });

  it("shows the empty state when no properties are returned", async () => {
    fetchProperties.mockResolvedValue([]);
    fetchFavorites.mockResolvedValue([]);

    renderWithAuth(<DiscoverPage onOpenProperty={vi.fn()} />);

    expect(await screen.findByText("No rentals found")).toBeInTheDocument();
  });

  it("shows an error state with a retry action when the fetch fails", async () => {
    fetchProperties.mockRejectedValueOnce(new Error("Network down"));
    fetchFavorites.mockResolvedValue([]);

    renderWithAuth(<DiscoverPage onOpenProperty={vi.fn()} />);

    expect(await screen.findByText("Network down")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("requires sign-in to save, and never calls saveFavorite, when signed out", async () => {
    fetchProperties.mockResolvedValue([sampleProperty]);
    fetchFavorites.mockResolvedValue([]);
    const openAuthPanel = vi.fn();
    const user = userEvent.setup();

    renderWithAuth(<DiscoverPage onOpenProperty={vi.fn()} />, { signedIn: false, openAuthPanel });

    const card = (await screen.findByText("Modern Kilimani Apartment")).closest("article");
    const saveButton = within(card).getByRole("button", { name: "Sign in to save" });
    await user.click(saveButton);

    expect(openAuthPanel).toHaveBeenCalledTimes(1);
    expect(saveFavorite).not.toHaveBeenCalled();
  });

  it("saves a listing when signed in, then reflects it as Saved and disables the button", async () => {
    fetchProperties.mockResolvedValue([sampleProperty]);
    fetchFavorites.mockResolvedValue([]);
    saveFavorite.mockResolvedValue({});
    const user = userEvent.setup();

    renderWithAuth(<DiscoverPage onOpenProperty={vi.fn()} />, { signedIn: true });

    const card = (await screen.findByText("Modern Kilimani Apartment")).closest("article");
    const saveButton = within(card).getByRole("button", { name: "Save" });
    await user.click(saveButton);

    expect(saveFavorite).toHaveBeenCalledWith("prop-1");
    await waitFor(() => expect(within(card).getByRole("button", { name: "Saved" })).toBeDisabled());
  });

  it("reflects a listing already in favorites as Saved on initial load, without calling saveFavorite", async () => {
    fetchProperties.mockResolvedValue([sampleProperty]);
    fetchFavorites.mockResolvedValue([{ property: { _id: "prop-1" } }]);

    renderWithAuth(<DiscoverPage onOpenProperty={vi.fn()} />, { signedIn: true });

    const card = (await screen.findByText("Modern Kilimani Apartment")).closest("article");
    expect(await within(card).findByRole("button", { name: "Saved" })).toBeDisabled();
    expect(saveFavorite).not.toHaveBeenCalled();
  });

  it("ignores a stale response that resolves after a newer filter change (race-condition guard)", async () => {
    const deferred = () => {
      let resolve;
      const promise = new Promise((res) => {
        resolve = res;
      });
      return { promise, resolve };
    };
    const initial = deferred();
    const filtered = deferred();
    fetchProperties.mockImplementationOnce(() => initial.promise).mockImplementationOnce(() => filtered.promise);
    fetchFavorites.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithAuth(<DiscoverPage onOpenProperty={vi.fn()} />);
    await waitFor(() => expect(fetchProperties).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "Filters" }));
    await user.selectOptions(screen.getByLabelText("Type"), "studio");
    await waitFor(() => expect(fetchProperties).toHaveBeenCalledTimes(2));

    // Resolve the newer (filtered) request first, then the older (initial,
    // now-stale) one - the out-of-order network scenario that used to let
    // the stale response overwrite the grid with results for a filter the
    // user no longer has selected.
    filtered.resolve([{ ...sampleProperty, _id: "prop-new", title: "New Filtered Listing" }]);
    await screen.findByText("New Filtered Listing");

    initial.resolve([{ ...sampleProperty, _id: "prop-stale", title: "Stale Unfiltered Listing" }]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByText("Stale Unfiltered Listing")).not.toBeInTheDocument();
    expect(screen.getByText("New Filtered Listing")).toBeInTheDocument();
  });

  it("keeps type/bedrooms/price filters collapsed behind a Filters toggle, and reflects the active count", async () => {
    fetchProperties.mockResolvedValue([sampleProperty]);
    fetchFavorites.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithAuth(<DiscoverPage onOpenProperty={vi.fn()} />);
    await screen.findByText("Modern Kilimani Apartment");

    expect(screen.queryByLabelText("Type")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Min rent")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Filters" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Type")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Type"), "studio");
    await waitFor(() => expect(fetchProperties).toHaveBeenLastCalledWith(expect.objectContaining({ type: "studio" })));

    expect(screen.getByRole("button", { name: "Filters (1)" })).toBeInTheDocument();
  });

  it("rejects an inverted price range instead of silently applying it", async () => {
    fetchProperties.mockResolvedValue([sampleProperty]);
    fetchFavorites.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithAuth(<DiscoverPage onOpenProperty={vi.fn()} />);
    await screen.findByText("Modern Kilimani Apartment");
    const callCountBeforeApply = fetchProperties.mock.calls.length;

    await user.click(screen.getByRole("button", { name: "Filters" }));
    await user.type(screen.getByPlaceholderText("Min rent"), "90000");
    await user.type(screen.getByPlaceholderText("Max rent"), "50000");
    await user.click(screen.getByRole("button", { name: "Apply price" }));

    expect(await screen.findByText("Min rent can't be greater than max rent.")).toBeInTheDocument();
    expect(fetchProperties.mock.calls.length).toBe(callCountBeforeApply);
  });

  it("hides the price-filter error when the Filters panel is collapsed again", async () => {
    fetchProperties.mockResolvedValue([sampleProperty]);
    fetchFavorites.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithAuth(<DiscoverPage onOpenProperty={vi.fn()} />);
    await screen.findByText("Modern Kilimani Apartment");

    const toggle = screen.getByRole("button", { name: "Filters" });
    await user.click(toggle);
    await user.type(screen.getByPlaceholderText("Min rent"), "90000");
    await user.type(screen.getByPlaceholderText("Max rent"), "50000");
    await user.click(screen.getByRole("button", { name: "Apply price" }));
    await screen.findByText("Min rent can't be greater than max rent.");

    // Collapsing hides the fields the error refers to - the error
    // shouldn't linger on screen with no visible context for it.
    await user.click(toggle);

    expect(screen.queryByText("Min rent can't be greater than max rent.")).not.toBeInTheDocument();
  });
});
