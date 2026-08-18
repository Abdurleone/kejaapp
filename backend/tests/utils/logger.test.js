import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { logError, logInfo, logWarn, maskPii, nairobiTimestamp } from "../../utils/logger.js";

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

  it("masks email addresses embedded in log messages", () => {
    const spy = mock.method(console, "log", () => {});

    logInfo("Notified john.doe@example.com about their request");

    assert.equal(spy.mock.calls[0].arguments[0], "Notified j***@e***.com about their request");
  });

  it("masks Kenyan phone numbers embedded in log messages", () => {
    const spy = mock.method(console, "warn", () => {});

    logWarn("Invalid phone 0712345678 on profile update");

    assert.equal(spy.mock.calls[0].arguments[0], "Invalid phone *******678 on profile update");
  });

  it("leaves ordinary messages (dates, hostnames, ports) unmasked", () => {
    const spy = mock.method(console, "error", () => {});

    logError("MongoDB connected: cluster0.abcde.mongodb.net on 2026-07-23T14:06:09");

    assert.equal(
      spy.mock.calls[0].arguments[0],
      "MongoDB connected: cluster0.abcde.mongodb.net on 2026-07-23T14:06:09"
    );
  });

  it("maskPii masks +254-prefixed numbers and multiple emails in one string", () => {
    const masked = maskPii("Contact +254712345678 or admin@jakezapp.com, cc jane@example.co.ke");

    assert.equal(masked, "Contact +*********678 or a***@j***.com, cc j***@e***.ke");
  });

  it("formats timestamps in Nairobi time with a stable +03:00 offset", () => {
    const timestamp = nairobiTimestamp();

    assert.match(timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/);

    const utcHour = new Date().getUTCHours();
    const nairobiHour = Number(timestamp.slice(11, 13));
    assert.equal(nairobiHour, (utcHour + 3) % 24);
  });
});
