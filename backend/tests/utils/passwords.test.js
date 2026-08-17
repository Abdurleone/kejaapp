import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareAgainstDummyHash, comparePassword, hashPassword } from "../../utils/passwords.js";

describe("password utilities", () => {
  it("hashes and compares passwords", async () => {
    const hashedPassword = await hashPassword("password123");

    assert.notEqual(hashedPassword, "password123");
    assert.match(hashedPassword, /^\$2[aby]\$/);
    assert.equal(await comparePassword("password123", hashedPassword), true);
    assert.equal(await comparePassword("wrongpassword", hashedPassword), false);
  });

  it("compareAgainstDummyHash always resolves false, regardless of input", async () => {
    assert.equal(await compareAgainstDummyHash("anything"), false);
    assert.equal(await compareAgainstDummyHash(""), false);
  });

  it("compareAgainstDummyHash takes comparable time to a real failed comparison, not the near-zero time of skipping bcrypt entirely", async () => {
    const realHash = await hashPassword("a-real-password");

    const startReal = process.hrtime.bigint();
    await comparePassword("wrong-guess", realHash);
    const realDurationMs = Number(process.hrtime.bigint() - startReal) / 1e6;

    const startDummy = process.hrtime.bigint();
    await compareAgainstDummyHash("wrong-guess");
    const dummyDurationMs = Number(process.hrtime.bigint() - startDummy) / 1e6;

    // Same cost factor, same bcrypt.compare call shape - both should be
    // real bcrypt operations of comparable magnitude, not one skipped
    // outright (which would be orders of magnitude faster, sub-millisecond).
    assert.ok(dummyDurationMs > realDurationMs / 4, `dummy compare (${dummyDurationMs}ms) was implausibly faster than a real one (${realDurationMs}ms)`);
  });
});
