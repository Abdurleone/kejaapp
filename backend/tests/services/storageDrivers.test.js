import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as localStorageDriver from "../../services/storageDrivers/localStorageDriver.js";
import { getDriver } from "../../services/storageDrivers/index.js";

describe("storageDrivers (default env, no STORAGE_DRIVER set)", () => {
  it("getDriver() returns the local driver", () => {
    assert.equal(getDriver(), localStorageDriver);
  });
});
