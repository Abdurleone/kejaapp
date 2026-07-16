import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PropertyDetailSkeleton from "../src/components/PropertyDetailSkeleton.jsx";
import DashboardSkeleton from "../src/components/DashboardSkeleton.jsx";
import { PropertyCardSkeletonGrid } from "../src/components/PropertyCardSkeleton.jsx";

// aria-hidden="true" removes an element (and its role) from the accessibility
// tree entirely - screen.getByRole("status") only succeeds if the loading
// indicator is actually reachable by assistive tech, which is exactly what
// putting aria-hidden on the same element as role="status" broke. These
// tests catch a regression back to that bug directly, not just by reading
// the source for the string "aria-hidden".
describe("loading-skeleton accessibility", () => {
  it("PropertyCardSkeletonGrid's status role is reachable (the already-correct reference pattern)", () => {
    render(<PropertyCardSkeletonGrid />);

    expect(screen.getByRole("status", { name: "Loading listings" })).toBeInTheDocument();
  });

  it("PropertyDetailSkeleton's status role is reachable, not hidden by aria-hidden on the same element", () => {
    render(<PropertyDetailSkeleton />);

    expect(screen.getByRole("status", { name: "Loading property" })).toBeInTheDocument();
  });

  it("DashboardSkeleton's status role is reachable, not hidden by aria-hidden on the same element", () => {
    render(<DashboardSkeleton />);

    expect(screen.getByRole("status", { name: "Loading dashboard" })).toBeInTheDocument();
  });
});
