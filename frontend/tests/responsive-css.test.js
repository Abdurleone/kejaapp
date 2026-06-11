import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");

describe("responsive stylesheet", () => {
  it("keeps primary layout regions container-safe", () => {
    assert.match(styles, /grid-template-columns:\s*minmax\(280px,\s*330px\)\s+minmax\(0,\s*1fr\)/);
    assert.match(styles, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*260px\),\s*1fr\)\)/);
  });

  it("includes tablet and phone breakpoints", () => {
    assert.match(styles, /@media\s*\(max-width:\s*1180px\)/);
    assert.match(styles, /@media\s*\(max-width:\s*620px\)/);
    assert.match(styles, /@media\s*\(max-width:\s*480px\)/);
  });

  it("protects tables and dialogs from narrow-screen overflow", () => {
    assert.match(styles, /\.table-panel\s*{[^}]*overflow-x:\s*auto;/s);
    assert.match(styles, /dialog\s*{[^}]*max-width:\s*calc\(100vw - 24px\);/s);
  });
});
