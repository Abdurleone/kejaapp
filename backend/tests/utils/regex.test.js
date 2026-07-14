import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeRegExp } from "../../utils/regex.js";

describe("escapeRegExp", () => {
  it("escapes every regex metacharacter", () => {
    assert.equal(escapeRegExp(".*+?^${}()|[]\\"), "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });

  it("leaves plain alphanumeric text untouched", () => {
    assert.equal(escapeRegExp("Nairobi West 2"), "Nairobi West 2");
  });
});
