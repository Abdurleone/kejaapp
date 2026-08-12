import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

const collection = JSON.parse(fs.readFileSync(new URL("../../../docs/dev/kejaapp-insomnia.json", import.meta.url)));

describe("Insomnia collection", () => {
  it("uses environment variables for reusable resource ids", () => {
    const serializedCollection = JSON.stringify(collection);

    assert.equal(serializedCollection.includes(":property_id"), false);
    assert.equal(serializedCollection.includes(":review_id"), false);
    assert.equal(serializedCollection.includes(":image_id"), false);
    assert.equal(serializedCollection.includes(":inquiry_id"), false);
    assert.equal(serializedCollection.includes(":viewing_id"), false);
    assert.equal(serializedCollection.includes(":notification_id"), false);
    assert.equal(serializedCollection.includes(":verification_id"), false);
  });

  it("defines reusable id environment variables", () => {
    const environment = collection.resources.find((resource) => resource._id === "env_kejaapp_base");

    assert.ok(environment);
    assert.equal(environment.data.property_id, "");
    assert.equal(environment.data.review_id, "");
    assert.equal(environment.data.image_id, "");
    assert.equal(environment.data.inquiry_id, "");
    assert.equal(environment.data.viewing_id, "");
    assert.equal(environment.data.notification_id, "");
    assert.equal(environment.data.verification_id, "");
  });
});
