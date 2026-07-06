import { formatKes, formatRatingSummary, formatStatusLabel } from "./format.js";

describe("formatKes", () => {
  it("formats a number as whole-shilling KES currency", () => {
    const result = formatKes(85000);
    expect(result).toMatch(/ksh/i);
    expect(result).toContain("85,000");
    expect(result).not.toMatch(/\./);
  });

  it("treats missing/falsy values as zero", () => {
    expect(formatKes(undefined)).toContain("0");
    expect(formatKes(null)).toContain("0");
  });
});

describe("formatRatingSummary", () => {
  it("reports no ratings when count is zero", () => {
    expect(formatRatingSummary(4.5, 0)).toBe("No ratings");
    expect(formatRatingSummary(4.5, undefined)).toBe("No ratings");
  });

  it("formats the average to one decimal with the count", () => {
    expect(formatRatingSummary(4.567, 12)).toBe("4.6 rating (12)");
  });
});

describe("formatStatusLabel", () => {
  it("converts snake_case to Title Case words", () => {
    expect(formatStatusLabel("pending_review")).toBe("Pending Review");
  });

  it("handles empty/missing input", () => {
    expect(formatStatusLabel("")).toBe("");
    expect(formatStatusLabel(undefined)).toBe("");
  });
});
