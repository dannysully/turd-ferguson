// "What lands each month" as tiles (Danny, 28 Sep 2026, R78). Every number on
// a tile is read from pricing.ts, the detail is rendered open until there is
// script to close it, and the collapse keeps the text in the DOM.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const page = read("./PackagePage.tsx");
const tiles = read("./DeliverableTiles.tsx");
const TIER_PAGES = ["alwaystracked", "alwaysmentioned", "alwayscited", "alwayseverywhere"];

test("the figure tiles read their numbers from pricing.ts, never a literal", () => {
  const fn = page.slice(page.indexOf("function tilesFor"), page.indexOf("export default function PackagePage"));
  assert.ok(fn.length > 200, "tilesFor was not found");
  // Clusters and prompts replaced the question tile on 29 Sep 2026 (R112/R115).
  assert.match(fn, /figure: String\(TRACKED_CLUSTERS\)/);
  assert.match(fn, /figure: String\(TRACKED_PROMPTS\)/);
  assert.match(fn, /figure: String\(TRACKED_KEYWORDS\)/);
  assert.match(fn, /enginesFor\(tier\.key\)\.length/);
  assert.match(fn, /<TierEngines tier=\{tier\.key\}/);
  assert.doesNotMatch(fn, /figure: "?\d/, "a tile figure is typed as a number");
});

test("every section on the four tier pages has a short word figure, never a number", () => {
  let n = 0;
  for (const t of TIER_PAGES) {
    const src = read(`../app/${t}/page.tsx`);
    const figures = [...src.matchAll(/figure: "([^"]*)"/g)].map((m) => m[1]);
    const headings = [...src.matchAll(/heading: "/g)].length;
    assert.equal(figures.length, headings, `${t}: every section needs a figure`);
    for (const f of figures) {
      assert.doesNotMatch(f, /\d/, `${t}: "${f}" types a number`);
      assert.ok(f.length <= 12, `${t}: "${f}" is too long for a tile at 390`);
      n++;
    }
  }
  assert.ok(n >= 17, `only ${n} section figures found - the walk stopped matching`);
});

test("the detail is open on the server and stays in the DOM when closed", () => {
  assert.match(tiles, /useState<Record<string, boolean> \| null>\(null\)/, "the first render is not the open one");
  assert.match(tiles, /open === null \|\|/, "a null state no longer reads as open");
  assert.match(tiles, /aria-expanded=\{open\}/);
  assert.doesNotMatch(tiles, /display: "none"|\{open \? <|open && </, "closing removes or hides the text instead of collapsing it");
});
