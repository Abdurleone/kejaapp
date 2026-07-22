import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PropertyCard from "../src/components/PropertyCard.jsx";
import PropertyImageManager from "../src/components/PropertyImageManager.jsx";

// Discover's grid can render up to 12 cards, and an owner's photo manager
// can list several thumbnails - lazy-loading these (unlike the single
// above-the-fold hero image on PropertyDetailPage, deliberately left eager)
// avoids fetching every image up front when most are below the fold.
describe("property image lazy loading", () => {
  it("lazy-loads DiscoverPage's PropertyCard image", () => {
    render(
      <PropertyCard
        property={{ _id: "prop-1", title: "Modern Kilimani Apartment" }}
        isSaved={false}
        isSaving={false}
        signedIn={false}
        onSave={() => {}}
        onOpenProperty={() => {}}
      />
    );

    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");
  });

  it("lazy-loads PropertyImageManager's thumbnail images", () => {
    render(
      <PropertyImageManager
        property={{
          _id: "prop-1",
          images: [{ _id: "img-1", url: "/uploads/photo.jpg", alt: "Living room" }],
        }}
        apiBaseUrl="http://localhost:5000"
        onPropertyUpdated={() => {}}
      />
    );

    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");
  });
});
