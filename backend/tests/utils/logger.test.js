import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { logError, logInfo, logWarn } from "../../utils/logger.js";

describe("logger", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("forwards info messages to console.log", () => {
    const spy = mock.method(console, "log", () => {});

    logInfo("hello info");

    assert.equal(spy.mock.callCount(), 1);
    assert.equal(spy.mock.calls[0].arguments[0], "hello info");
  });

  it("forwards warn messages to console.warn", () => {
    const spy = mock.method(console, "warn", () => {});

    logWarn("hello warn");

    assert.equal(spy.mock.callCount(), 1);
    assert.equal(spy.mock.calls[0].arguments[0], "hello warn");
  });

  it("forwards error messages to console.error", () => {
    const spy = mock.method(console, "error", () => {});

    logError("hello error");

    assert.equal(spy.mock.callCount(), 1);
    assert.equal(spy.mock.calls[0].arguments[0], "hello error");
  });
});
