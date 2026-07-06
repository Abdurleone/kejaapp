import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { logError, logInfo, logWarn, nairobiTimestamp } from "../../utils/logger.js";

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

  it("formats timestamps in Nairobi time with a stable +03:00 offset", () => {
    const timestamp = nairobiTimestamp();

    assert.match(timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/);

    const utcHour = new Date().getUTCHours();
    const nairobiHour = Number(timestamp.slice(11, 13));
    assert.equal(nairobiHour, (utcHour + 3) % 24);
  });
});
