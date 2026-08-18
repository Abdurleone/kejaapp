import assert from "node:assert/strict";
import { describe, it } from "node:test";
import parseCookies from "../../utils/cookies.js";

describe("parseCookies", () => {
  it("parses cookie headers into a key-value object", () => {
    assert.deepEqual(parseCookies("jakez_token=abc123; theme=dark"), {
      jakez_token: "abc123",
      theme: "dark",
    });
  });
});
