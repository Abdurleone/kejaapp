import PropertyCard from "./PropertyCard.js";

describe("PropertyCard", () => {
  it("is wrapped in React.memo so FlatList re-renders don't cascade into every row", () => {
    expect(PropertyCard.$$typeof).toBe(Symbol.for("react.memo"));
  });
});
