import { describe, expect, it } from "vitest";
import PropertyCard from "../src/components/PropertyCard.jsx";
import SavedPropertyCard from "../src/components/SavedPropertyCard.jsx";
import NotificationRow from "../src/components/NotificationRow.jsx";
import { InquiryCard, ViewingRequestCard } from "../src/pages/WorkspacePage.jsx";

// A row that isn't wrapped in React.memo re-renders every time its parent
// list re-renders, even if its own props are unchanged - e.g. clicking
// "Save" on one card would previously re-render every other card in the
// grid too. Checking the react.memo marker directly (rather than counting
// renders) matches the pattern already used for mobile's PropertyCard.
describe("list row memoization", () => {
  it.each([
    ["DiscoverPage's PropertyCard", PropertyCard],
    ["SavedPage's SavedPropertyCard", SavedPropertyCard],
    ["NotificationsPage's NotificationRow", NotificationRow],
    ["WorkspacePage's InquiryCard", InquiryCard],
    ["WorkspacePage's ViewingRequestCard", ViewingRequestCard],
  ])("%s is wrapped in React.memo", (_name, Component) => {
    expect(Component.$$typeof).toBe(Symbol.for("react.memo"));
  });
});
