import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PropertyImage from "../src/components/PropertyImage.jsx";

// A property photo can fail to load (removed file, broken URL, even the
// external Unsplash fallback being unreachable) - previously a bare <img>
// with no error handling, rendering the browser's tiny default broken-image
// icon against a mostly blank box. This covers the replacement fallback.
describe("PropertyImage", () => {
  it("renders the image when a src is given", () => {
    render(<PropertyImage src="https://example.com/photo.jpg" alt="Modern Kilimani Apartment" />);

    const img = screen.getByRole("img", { name: "Modern Kilimani Apartment" });
    expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(screen.queryByText("Photo unavailable")).not.toBeInTheDocument();
  });

  it("renders eagerly when the eager prop is set", () => {
    render(<PropertyImage src="https://example.com/photo.jpg" alt="Hero photo" eager />);

    expect(screen.getByRole("img", { name: "Hero photo" })).toHaveAttribute("loading", "eager");
  });

  it("shows a local placeholder immediately when no src is given", () => {
    render(<PropertyImage src="" alt="Rental property" />);

    expect(screen.getByText("Photo unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("swaps to the placeholder once the image fails to load", () => {
    render(<PropertyImage src="https://example.com/broken.jpg" alt="Rental property" />);

    const img = screen.getByRole("img", { name: "Rental property" });
    fireEvent.error(img);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Photo unavailable")).toBeInTheDocument();
  });
});
