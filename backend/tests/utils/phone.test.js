import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeKenyanPhone } from "../../utils/phone.js";

describe("normalizeKenyanPhone", () => {
  it("normalizes 07XX/01XX local format", () => {
    assert.equal(normalizeKenyanPhone("0712345678"), "254712345678");
    assert.equal(normalizeKenyanPhone("0112345678"), "254112345678");
  });

  it("accepts already-normalized 254 format", () => {
    assert.equal(normalizeKenyanPhone("254712345678"), "254712345678");
  });

  it("strips non-digit characters (spaces, +, dashes)", () => {
    assert.equal(normalizeKenyanPhone("+254 712 345 678"), "254712345678");
    assert.equal(normalizeKenyanPhone("0712-345-678"), "254712345678");
  });

  it("rejects malformed or non-Kenyan numbers", () => {
    assert.equal(normalizeKenyanPhone("12345"), null);
    assert.equal(normalizeKenyanPhone("0812345678"), null);
    assert.equal(normalizeKenyanPhone("+15551234567"), null);
    assert.equal(normalizeKenyanPhone(""), null);
    assert.equal(normalizeKenyanPhone(undefined), null);
  });
});
