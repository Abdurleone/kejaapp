import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeRegExp, escapeRegExpQueryParam } from "../../utils/regex.js";

describe("escapeRegExp", () => {
  it("escapes every regex metacharacter", () => {
    assert.equal(escapeRegExp(".*+?^${}()|[]\\"), "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });

  it("leaves plain alphanumeric text untouched", () => {
    assert.equal(escapeRegExp("Nairobi West 2"), "Nairobi West 2");
  });
});

describe("escapeRegExpQueryParam", () => {
  it("escapes a valid string the same way escapeRegExp does", () => {
    assert.equal(escapeRegExpQueryParam("Nairobi (West)", "county"), "Nairobi \\(West\\)");
  });

  it("rejects a non-string value with a clean 400 instead of throwing a raw TypeError", () => {
    // Express's default query parser turns ?county[$gt]= into a nested
    // object - escapeRegExp's own .replace() call would throw an unhandled
    // TypeError on that (objects have no .replace), surfacing as an
    // ungraceful 500 instead of a clean validation error.
    assert.throws(() => escapeRegExpQueryParam({ $gt: "" }, "county"), {
      statusCode: 400,
      message: "county must be a string",
    });
  });

  it("rejects an array the same way", () => {
    assert.throws(() => escapeRegExpQueryParam(["Nairobi", "Mombasa"], "county"), {
      statusCode: 400,
      message: "county must be a string",
    });
  });
});
