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

  it("lets header actions wrap and stack instead of overflowing", () => {
    assert.match(styles, /\.app-header\s*{[^}]*position:\s*sticky;/s);
    assert.match(styles, /\.header-actions\s*,[\s\S]*?\.auth-panel-tabs\s*{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/s);
    assert.match(styles, /@media\s*\(max-width:\s*480px\)\s*{[\s\S]*?\.header-actions\s*,[\s\S]*?\.card-actions\s*{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*1fr;/s);
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

  it("prints legal pages with a watermark and forced light colors", () => {
    // .legal-footer must be hidden too, not just .app-header/.tabs/.no-print -
    // otherwise the site-wide nav footer prints at the bottom of every legal
    // page alongside the actual policy content (caught via a real page.pdf()
    // render, not just an emulated-media screenshot).
    assert.match(styles, /@media print\s*{[\s\S]*?\.legal-footer,\s*\n\s*\.no-print\s*{[^}]*display:\s*none\s*!important;/s);
    assert.match(
      styles,
      /@media print\s*{[\s\S]*?:root,\s*\n\s*:root\[data-color-mode="dark"\]\s*{[^}]*--ink:\s*#000000;/s,
    );
    // z-index: 0 (not just position: relative) is required so .legal-page
    // establishes its own stacking context - otherwise the watermark's
    // z-index: -1 escapes to the root stacking context and renders behind
    // the opaque `body` background instead of behind the page's own text.
    assert.match(styles, /@media print\s*{[\s\S]*?\.legal-page\s*{[^}]*position:\s*relative;[^}]*z-index:\s*0;/s);
    // .panel needs a transparent background under print, or the watermark
    // would only ever be visible in the gaps between panels, never through
    // the (otherwise opaque) boxed sections that make up almost the entire
    // page.
    assert.match(styles, /@media print\s*{[\s\S]*?\.legal-page \.panel\s*{[^}]*background:\s*transparent;/s);
    assert.match(
      styles,
      /@media print\s*{[\s\S]*?\.legal-page::before\s*{[^}]*background:\s*url\("assets\/keja-logo\.png"\)[^}]*opacity:\s*0\.5;/s,
    );
  });
});
