import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");

describe("responsive stylesheet", () => {
  it("keeps primary layout regions container-safe", () => {
    assert.match(styles, /grid-template-columns:\s*minmax\(260px,\s*320px\)\s+minmax\(0,\s*1fr\)/);
    assert.match(styles, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*270px\),\s*1fr\)\)/);
  });

  it("includes tablet and phone breakpoints", () => {
    assert.match(styles, /@media\s*\(max-width:\s*1320px\)/);
    assert.match(styles, /@media\s*\(max-width:\s*1180px\)/);
    assert.match(styles, /@media\s*\(max-width:\s*620px\)/);
    assert.match(styles, /@media\s*\(max-width:\s*480px\)/);
  });

  it("lets taskbar authentication controls wrap instead of overflowing", () => {
    assert.match(styles, /\.connection-bar\s*{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/s);
    assert.match(styles, /\.taskbar-auth\s*{[^}]*white-space:\s*nowrap;/s);
    assert.match(styles, /@media\s*\(max-width:\s*620px\)\s*{[\s\S]*?\.connection-bar\s*{[^}]*display:\s*grid;/s);
  });

  it("keeps listing action buttons and detail panels responsive", () => {
    assert.match(styles, /\.card-actions\s*{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(92px,\s*1fr\)\);/s);
    assert.match(styles, /\.property-detail\s*{[^}]*grid-template-columns:\s*minmax\(220px,\s*0\.86fr\)\s+minmax\(0,\s*1\.14fr\);/s);
  });

  it("protects tables and dialogs from narrow-screen overflow", () => {
    assert.match(styles, /\.table-panel\s*{[^}]*overflow-x:\s*auto;/s);
    assert.match(styles, /dialog\s*{[^}]*max-width:\s*calc\(100vw - 24px\);/s);
  });

  it("includes landing and color-mode styles", () => {
    assert.match(styles, /\[hidden\]\s*{[^}]*display:\s*none\s*!important;/s);
    assert.match(styles, /\.landing-page\s*{[^}]*grid-template-columns:/s);
    assert.match(styles, /:root\[data-color-mode="dark"\]/);
  });
});
