import assert from "node:assert/strict";
import mongoose from "mongoose";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import Notification from "../../models/Notification.js";
import User from "../../models/User.js";
import UserStatusLog from "../../models/UserStatusLog.js";
import UserViolation from "../../models/UserViolation.js";
import {
  automaticBanThreshold,
  enforceViolationThreshold,
} from "../../services/accountModerationService.js";

describe("accountModerationService", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("does not ban users below the violation threshold", async () => {
    mock.method(UserViolation, "countDocuments", async () => automaticBanThreshold - 1);

    const result = await enforceViolationThreshold(new mongoose.Types.ObjectId());

    assert.equal(result.banned, false);
    assert.equal(result.violationCount, automaticBanThreshold - 1);
  });

  it("automatically bans users at the violation threshold", async () => {
    const userId = new mongoose.Types.ObjectId();
    const user = {
      _id: userId,
      accountStatus: "active",
      saveCalled: false,
      async save() {
        this.saveCalled = true;
      },
    };
    let logPayload;
    let notificationPayload;

    mock.method(UserViolation, "countDocuments", async () => automaticBanThreshold);
    mock.method(User, "findById", async () => user);
    mock.method(UserStatusLog, "create", async (payload) => {
      logPayload = payload;
      return payload;
    });
    mock.method(Notification, "create", async (payload) => {
      notificationPayload = payload;
      return payload;
    });

    const result = await enforceViolationThreshold(userId);

    assert.equal(result.banned, true);
    assert.equal(user.accountStatus, "banned");
    assert.equal(user.saveCalled, true);
    assert.equal(logPayload.previousStatus, "active");
    assert.equal(logPayload.newStatus, "banned");
    assert.equal(logPayload.changedBy, null);
    assert.equal(notificationPayload.type, "system");
    assert.equal(notificationPayload.data.accountStatus, "banned");
  });
});
