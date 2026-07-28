import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { users as demoUsers } from "../../seeders/seedDemoData.js";
import { isProtectedDemoUser, partitionUsers } from "../../scripts/cleanupTestData.js";

describe("cleanupTestData", () => {
  it("protects every account seedDemoData.js actually creates", () => {
    for (const user of demoUsers) {
      assert.equal(isProtectedDemoUser(user.email), true, `expected ${user.email} to be protected`);
    }
  });

  it("is case-insensitive when matching protected emails", () => {
    assert.equal(isProtectedDemoUser("Tenant@Example.com"), true);
  });

  it("does not protect an ad-hoc QA/test account", () => {
    assert.equal(isProtectedDemoUser("qa-tenant-1784803425016@example.com"), false);
    assert.equal(isProtectedDemoUser("test-1783963189823@example.com"), false);
    assert.equal(isProtectedDemoUser(undefined), false);
  });

  it("partitions a mixed list into keep/delete without touching a real account", () => {
    const users = [
      { _id: "1", email: "tenant@example.com", name: "Demo Tenant", role: "tenant" },
      { _id: "2", email: "qa-tenant-123@example.com", name: "QA Tenant", role: "tenant" },
      { _id: "3", email: "admin@example.com", name: "Demo Admin", role: "admin" },
      { _id: "4", email: "test-456@example.com", name: "Test User", role: "tenant" },
    ];

    const { toDelete, toKeep } = partitionUsers(users);

    assert.deepEqual(toKeep.map((u) => u._id), ["1", "3"]);
    assert.deepEqual(toDelete.map((u) => u._id), ["2", "4"]);
  });
});
