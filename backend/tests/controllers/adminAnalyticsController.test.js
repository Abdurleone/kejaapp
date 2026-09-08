import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "../helpers/nodeTestCompat.js";
import { getAdminAnalytics } from "../../controllers/adminAnalyticsController.js";
import { roleList } from "../../constants/rbac.js";
import LoginEvent from "../../models/LoginEvent.js";
import User from "../../models/User.js";

const createResponse = () => ({
  body: null,
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

describe("adminAnalyticsController", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("returns a 30-day range by default with role totals and merged login counts", async () => {
    mock.method(User, "aggregate", async (pipeline) => {
      if (pipeline.some((stage) => stage.$match)) {
        return [{ _id: "2026-09-01", count: 2 }];
      }
      return [
        { _id: "tenant", count: 5 },
        { _id: "landlord", count: 2 },
      ];
    });
    mock.method(LoginEvent, "aggregate", async () => [
      { _id: { day: "2026-09-01", success: true }, count: 4 },
      { _id: { day: "2026-09-01", success: false }, count: 1 },
    ]);

    const req = { query: {} };
    const res = createResponse();

    await getAdminAnalytics(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.rangeDays, 30);
    assert.equal(res.body.data.totalUsers, 7);
    assert.equal(res.body.data.usersByRole.tenant, 5);
    assert.equal(res.body.data.usersByRole.landlord, 2);
    // Every role gets a zero-filled entry, even ones with no users yet.
    roleList.forEach((role) => {
      assert.ok(Object.prototype.hasOwnProperty.call(res.body.data.usersByRole, role));
    });
    assert.deepEqual(res.body.data.signupsByDay, [{ day: "2026-09-01", count: 2 }]);
    assert.deepEqual(res.body.data.loginsByDay, [{ day: "2026-09-01", success: 4, failed: 1 }]);
  });

  it("honors a custom ?days= query param, clamped to 365", async () => {
    mock.method(User, "aggregate", async () => []);
    mock.method(LoginEvent, "aggregate", async () => []);

    const req = { query: { days: "9000" } };
    const res = createResponse();

    await getAdminAnalytics(req, res, (error) => {
      throw error;
    });

    assert.equal(res.body.data.rangeDays, 365);
  });

  it("falls back to 30 days for an invalid days value", async () => {
    mock.method(User, "aggregate", async () => []);
    mock.method(LoginEvent, "aggregate", async () => []);

    const req = { query: { days: "not-a-number" } };
    const res = createResponse();

    await getAdminAnalytics(req, res, (error) => {
      throw error;
    });

    assert.equal(res.body.data.rangeDays, 30);
  });

  it("zero-fills every role and reports zero total users when the collection is empty", async () => {
    mock.method(User, "aggregate", async () => []);
    mock.method(LoginEvent, "aggregate", async () => []);

    const req = { query: {} };
    const res = createResponse();

    await getAdminAnalytics(req, res, (error) => {
      throw error;
    });

    assert.equal(res.body.data.totalUsers, 0);
    roleList.forEach((role) => {
      assert.equal(res.body.data.usersByRole[role], 0);
    });
    assert.deepEqual(res.body.data.signupsByDay, []);
    assert.deepEqual(res.body.data.loginsByDay, []);
  });

  it("keeps a day's success and failed counts separate when only one is present", async () => {
    mock.method(User, "aggregate", async () => []);
    mock.method(LoginEvent, "aggregate", async () => [{ _id: { day: "2026-09-05", success: false }, count: 3 }]);

    const req = { query: {} };
    const res = createResponse();

    await getAdminAnalytics(req, res, (error) => {
      throw error;
    });

    assert.deepEqual(res.body.data.loginsByDay, [{ day: "2026-09-05", success: 0, failed: 3 }]);
  });
});
