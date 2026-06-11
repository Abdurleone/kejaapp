import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateOpaqueToken, hashToken } from "../../utils/tokens.js";

describe("token utils", () => {
  it("generates opaque refresh tokens", () => {
    const token = generateOpaqueToken();

    assert.equal(typeof token, "string");
    assert.equal(token.length > 40, true);
  });

  it("hashes tokens consistently", () => {
    assert.equal(hashToken("abc"), hashToken("abc"));
    assert.notEqual(hashToken("abc"), "abc");
  });
});
