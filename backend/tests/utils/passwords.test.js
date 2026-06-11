import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { comparePassword, hashPassword } from "../../utils/passwords.js";

describe("password utilities", () => {
  it("hashes and compares passwords", async () => {
    const hashedPassword = await hashPassword("password123");

    assert.notEqual(hashedPassword, "password123");
    assert.match(hashedPassword, /^\$2[aby]\$/);
    assert.equal(await comparePassword("password123", hashedPassword), true);
    assert.equal(await comparePassword("wrongpassword", hashedPassword), false);
  });
});
