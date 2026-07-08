import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import User from "../../models/User.js";
import { buildUsername, generateUniqueUsername, suggestUsernames } from "../../utils/usernameGenerator.js";

describe("usernameGenerator", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("builds a lowercase adjective+noun+digits handle", () => {
    const username = buildUsername();

    assert.match(username, /^[a-z]+[a-z]+\d{3,4}$/);
  });

  it("returns the first candidate when it is not taken", async () => {
    mock.method(User, "exists", async () => false);

    const username = await generateUniqueUsername(User);

    assert.match(username, /^[a-z]+[a-z]+\d{3,4}$/);
    assert.equal(User.exists.mock.callCount(), 1);
  });

  it("retries with a new candidate on collision", async () => {
    let callCount = 0;
    mock.method(User, "exists", async () => {
      callCount += 1;
      return callCount === 1;
    });

    const username = await generateUniqueUsername(User);

    assert.equal(User.exists.mock.callCount(), 2);
    assert.match(username, /^[a-z]+[a-z]+\d{3,4}$/);
  });

  it("throws after exhausting all attempts", async () => {
    mock.method(User, "exists", async () => true);

    await assert.rejects(() => generateUniqueUsername(User), /Could not generate a unique username/);
    assert.equal(User.exists.mock.callCount(), 5);
  });

  it("suggests available variations of the requested username", async () => {
    mock.method(User, "exists", async () => false);

    const suggestions = await suggestUsernames(User, "JohnKamau ");

    assert.equal(suggestions.length, 3);
    for (const suggestion of suggestions) {
      assert.match(suggestion, /^johnkamau\d{3,4}$/);
    }
    assert.equal(new Set(suggestions).size, 3);
  });

  it("skips suggestion candidates that are already taken", async () => {
    let callCount = 0;
    mock.method(User, "exists", async () => {
      callCount += 1;
      // Only the first candidate collides; every later one is free.
      return callCount === 1;
    });

    const suggestions = await suggestUsernames(User, "johnkamau", 2);

    assert.equal(suggestions.length, 2);
    assert.ok(User.exists.mock.callCount() > 2);
  });

  it("returns fewer suggestions than requested if it runs out of attempts", async () => {
    mock.method(User, "exists", async () => true);

    const suggestions = await suggestUsernames(User, "johnkamau", 3);

    assert.equal(suggestions.length, 0);
  });
});
