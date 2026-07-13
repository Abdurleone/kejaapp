import assert from "node:assert/strict";
import { describe, it } from "node:test";
import PushReceipt from "../../models/PushReceipt.js";

describe("PushReceipt model", () => {
  it("stores a ticket id and its associated device token", () => {
    const pushReceipt = new PushReceipt({
      ticketId: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
      token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    });

    assert.equal(pushReceipt.ticketId, "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX");
    assert.equal(pushReceipt.token, "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]");
  });

  it("requires a ticket id and a token", () => {
    const pushReceipt = new PushReceipt({});
    const error = pushReceipt.validateSync();

    assert.ok(error.errors.ticketId);
    assert.ok(error.errors.token);
  });
});
