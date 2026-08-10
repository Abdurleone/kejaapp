import assert from "node:assert/strict";
import { describe, it } from "node:test";

// AUTH_COOKIE_SAME_SITE must be set before config/env.js is first imported
// (by the dynamic import below), since env.js reads process.env once at
// module load - same convention as envS3.test.js.
process.env.AUTH_COOKIE_SAME_SITE = "lax";
// Deliberately NOT "true" here: proves authCookieSameSite is independent of
// authCookieSecure, not just a relabeling of the same ternary - a
// consolidated same-origin deployment wants secure (still HTTPS) + lax
// (same-site) together, which the old single derivation couldn't express.
process.env.AUTH_COOKIE_SECURE = "true";

describe("env config (explicit AUTH_COOKIE_SAME_SITE override)", () => {
  it("lets AUTH_COOKIE_SAME_SITE win over the authCookieSecure-derived default", async () => {
    const { default: env } = await import("../../config/env.js");

    assert.equal(env.authCookieSecure, true);
    assert.equal(env.authCookieSameSite, "lax");
  });
});
