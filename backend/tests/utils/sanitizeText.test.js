import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeText } from "../../utils/sanitizeText.js";

describe("sanitizeText", () => {
  it("strips HTML tags", () => {
    assert.equal(sanitizeText("<script>alert(1)</script>Hello"), "alert(1)Hello");
  });

  it("strips a tag with attributes", () => {
    assert.equal(sanitizeText('<img src=x onerror="alert(1)">Nice place'), "Nice place");
  });

  it("leaves plain text with no markup untouched (aside from trimming)", () => {
    assert.equal(sanitizeText("Spacious 2-bedroom apartment near Yaya Centre"), "Spacious 2-bedroom apartment near Yaya Centre");
  });

  it("trims surrounding whitespace", () => {
    assert.equal(sanitizeText("  Great host, would rent again  "), "Great host, would rent again");
  });

  it("passes non-string values through unchanged", () => {
    assert.equal(sanitizeText(undefined), undefined);
    assert.equal(sanitizeText(null), null);
  });
});
