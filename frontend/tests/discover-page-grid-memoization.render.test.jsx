import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { memo } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DiscoverPage from "../src/pages/DiscoverPage.jsx";
import { renderWithAuth } from "./helpers/renderWithAuth.jsx";

const { fetchProperties, fetchFavorites } = vi.hoisted(() => ({
  fetchProperties: vi.fn(),
  fetchFavorites: vi.fn(),
}));

vi.mock("../app-utils.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchProperties, fetchFavorites };
});

let renderCount = 0;

// Wrapped in memo with the same default (shallow-prop) comparison the real
// PropertyCard uses, so this stands in as a faithful proxy for "did the real
// memoized card actually re-render" without needing to reach into its
// module internals.
vi.mock("../src/components/PropertyCard.jsx", () => ({
  default: memo(function PropertyCardSpy({ property }) {
    renderCount += 1;
    return <div data-testid={`card-${property._id}`}>{property.title}</div>;
  }),
}));

const sampleProperty = {
  _id: "prop-1",
  title: "Modern Kilimani Apartment",
  price: { rent: 45000 },
  location: { area: "Kilimani", county: "Nairobi" },
  bedrooms: 2,
  bathrooms: 1,
  images: [],
};

describe("DiscoverPage's property grid", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not re-render existing cards when typing in the Min/Max rent inputs", async () => {
    renderCount = 0;
    fetchProperties.mockResolvedValue([sampleProperty]);
    fetchFavorites.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithAuth(<DiscoverPage onOpenProperty={vi.fn()} />);
    await screen.findByTestId("card-prop-1");

    expect(renderCount).toBe(1);

    await user.click(screen.getByRole("button", { name: "Filters" }));
    await user.type(screen.getByPlaceholderText("Min rent"), "12345");

    // Typing five characters into an unrelated field should not re-render
    // the card grid at all - the properties list, saved-state, and handlers
    // it depends on are all unchanged.
    expect(renderCount).toBe(1);
  });
});
