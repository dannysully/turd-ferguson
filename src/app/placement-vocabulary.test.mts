import assert from "node:assert/strict";
import { test } from "node:test";

import { bodyOf, sweptPages } from "./dynamic-render.mts";

/**
 * No "editorial" and no "listicle" anywhere a reader or a crawler can see
 * (Danny, 28 Sep 2026, docs/danny.md line 63, R62).
 *
 * What we deliver is "placements". When copy describes the third-party pages
 * themselves it says "best-of lists, comparisons and round-ups". The words
 * were in 23 files at 41914aa, written one surface at a time, so this reads the
 * built output rather than trusting the sweep that took them out.
 *
 * Read: the whole prerendered and captured HTML before the flight payload -
 * visible text, title and meta, alt and aria text, ids and the JSON-LD - since
 * a meta description or an anchor id is as public as a paragraph. Not read:
 * source comments (never rendered), and src/lib/scan/source-kind-prompt.ts,
 * which is model input and never reaches a page. Stored rows that still carry
 * the old not-listed sentence are mapped on read by `currentBasis`.
 *
 * Floor: 20 pages, the same floor the other swept-page censuses hold, so a
 * tree that was never built (or never captured) fails here instead of
 * reporting a clean sweep of nothing.
 */

const BANNED = /\beditorial(?:ly)?\b|\blisticles?\b/gi;

test("no page says 'editorial' or 'listicle'", () => {
  const pages = sweptPages();
  assert.ok(pages.length >= 20, `expected 20+ swept pages, got ${pages.length} - run the build and capture`);
  const hits: string[] = [];
  for (const { page, html } of pages) {
    const body = bodyOf(html);
    for (const m of body.matchAll(BANNED)) {
      const at = m.index ?? 0;
      hits.push(`${page}: ...${body.slice(Math.max(0, at - 50), at + 40).replace(/\s+/g, " ")}...`);
    }
  }
  assert.deepEqual(hits, [], "say 'placements', or 'best-of lists, comparisons and round-ups' for the pages themselves");
});
