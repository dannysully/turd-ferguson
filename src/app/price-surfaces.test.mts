import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { bodyOf, pageText as text, sweptPages, type Page } from "./dynamic-render.mts";

/**
 * Every price this business charges reaches the two pages that quote it.
 *
 * `copy.test.mts` already refuses a price *typed* anywhere but `pricing.ts`.
 * That is one direction, and it is the direction that catches a second copy
 * going stale. Nothing caught the other one: a price that stops reaching a
 * page at all.
 *
 * It was reachable. The homepage packages grid was four hand-written cards
 * picking four fixed rungs by name off `TIERS`, which is a list that can grow
 * - so a fifth tier reached /compare, its own package page, its JSON-LD and
 * the tier journey, and silently did not appear on the one surface a buyer
 * lands on. The grid maps `TIERS` now and the copy table is keyed by `TierKey`,
 * so a missing tier is a compile error; this is the runtime half of the same
 * check, and it also covers the basis line and the package pages.
 *
 * The labels are PARSED OUT of `pricing.ts`, never retyped. A test holding its
 * own copy of the prices would pass while the site quoted different ones,
 * which is the blind-tripwire shape the email palette test had. The source is
 * one path to the number and the prerendered HTML is another.
 */

const PRICING = "src/config/pricing.ts";

type Quoted = { id: string; priceLabel: string; href: string };

/**
 * Every tier's id, price label and package page, read off the source.
 *
 * The three are matched as an ordered triple inside one tier object rather
 * than as three independent lists, so a tier missing a `priceLabel` shortens
 * the result instead of silently pairing one tier's price with another's page.
 */
function quotedTiers(source: string): Quoted[] {
  const re = /id:\s*"([^"]+)"[\s\S]*?priceLabel:\s*"([^"]+)"[\s\S]*?\n\s*href:\s*"([^"]+)"/g;
  return [...source.matchAll(re)].map((m) => ({ id: m[1], priceLabel: m[2], href: m[3] }));
}

/**
 * `bodyOf` and `text` moved to `dynamic-render.mts` when `price-claims` became
 * their second reader, with the reasoning that used to sit here - the strip is
 * subtle in three ways and a second copy of it is the shape this repo keeps
 * finding. Read the comment there before changing either.
 */

/**
 * The packages grid alone, which is the thing that quotes the prices.
 *
 * Scoped because the homepage says several of these words in several places -
 * the tier journey prints a basis-like line of its own - so a whole-page match
 * passes while the grid itself has stopped printing anything.
 */
function packagesGrid(html: string): string {
  const body = bodyOf(html);
  const from = body.indexOf('id="packages"');
  const to = body.indexOf('id="white-label"', from);
  assert.ok(from !== -1 && to > from, "the packages section is not on the homepage under the ids this reads");
  return text(body.slice(from, to));
}

/**
 * `sweptPages` names a prerendered page by its file and a captured one by its
 * route, so this reads `index.html` back to `/`. Re-stated here rather than
 * imported because `page-head.test.mts` keeps its `routeOf` private; if a
 * third reader ever needs it, export it there instead of writing a third copy.
 */
function routeOf(page: string): string {
  if (page.startsWith("/")) return page;
  const path = page.replace(/\.html$/, "");
  return path === "index" ? "/" : "/" + path;
}

const source = readFileSync(PRICING, "utf8");
const TIERS = quotedTiers(source);
const pages: Page[] = sweptPages();
const byRoute = new Map(pages.map((p) => [routeOf(p.page), p]));

test("the parse reads every tier the file declares, so it cannot go blind", () => {
  // If the regex stops matching, this file passes vacuously over an empty set
  // - which is exactly how four of this repo's tripwires passed while blind.
  const declared = (source.match(/^\s{4}priceLabel:/gm) ?? []).length;
  assert.ok(declared > 0, "no priceLabel found in " + PRICING + " - the parse, not the file, is what changed");
  assert.equal(TIERS.length, declared, "the parse found " + TIERS.length + " tiers where the file declares " + declared);
  assert.equal(new Set(TIERS.map((t) => t.id)).size, TIERS.length, "two tiers parsed with the same id");
});

test("the pages this checks against were actually built", () => {
  assert.ok(pages.length > 15, "no build to read - run `npm run build` then `npm run capture`");
  assert.ok(byRoute.has("/"), "the homepage is not in the swept set, so every assertion below is vacuous");
  for (const t of TIERS) {
    assert.ok(byRoute.has(t.href), t.id + " points at " + t.href + ", which is not a page that was built");
  }
});

test("every tier's price reaches the homepage packages grid", () => {
  const home = packagesGrid(byRoute.get("/")!.html);
  const missing = TIERS.filter((t) => !home.includes(t.priceLabel));
  assert.deepEqual(
    missing.map((t) => t.id + " (" + t.priceLabel + ")"),
    [],
    "a tier in pricing.ts does not reach the homepage - the grid quotes a shorter list than the product sells",
  );
});

test("every tier's price reaches its own package page, in full", () => {
  const missing: string[] = [];
  for (const t of TIERS) {
    const page = text(byRoute.get(t.href)!.html);
    if (!page.includes(t.priceLabel)) missing.push(t.id + " (" + t.priceLabel + " not on " + t.href + ")");
  }
  assert.deepEqual(missing, []);
});

test("a floor is never quoted as a flat price on any page", () => {
  /**
   * The one failure this whole area exists for, made twice already - `c2bf546`
   * in copy and the deleted `priceFor` in config. A label carrying "from" says
   * the price moves; the same figure without it is a number an agency quotes
   * their client before finding out that it does.
   */
  const floors = TIERS.filter((t) => /^from /i.test(t.priceLabel));
  assert.ok(floors.length > 0, "no tier quotes a floor, so this check is now vacuous - delete it or find the floor");

  for (const t of floors) {
    const figure = t.priceLabel.replace(/^from\s*/i, "");
    for (const p of pages) {
      const body = text(p.html);
      let at = body.indexOf(figure);
      while (at !== -1) {
        const before = body.slice(Math.max(0, at - 6), at);
        assert.ok(
          /from\s*$/i.test(before),
          p.page + " quotes " + figure + " without its 'from' - " + t.id + " is a floor, not a flat price",
        );
        at = body.indexOf(figure, at + figure.length);
      }
    }
  }
});

test("the basis travels with the price it qualifies, on every surface that prints the price", () => {
  /**
   * `priceBasis` is what the headline price actually buys, and the comment on
   * it says it travels with the number so an agency cannot quote $99 and then
   * find the price moves with prompt count. On the homepage it only travelled
   * for the one card that was handed it by hand - the grid reads it off the
   * tier now, and this holds that.
   *
   * Matched on a distinctive clause rather than the whole sentence, because
   * the basis is a template literal and rebuilding it here would be the second
   * copy the basis exists to avoid.
   */
  const basis = /priceBasis:\s*`([^`]*)`/.exec(source)?.[1];
  assert.ok(basis, "no priceBasis in " + PRICING + " - if it was removed, remove this check with it");
  const clause = basis!.split(".")[1]?.trim();
  assert.ok(clause && clause.length > 20, "the basis no longer has a second clause to match on: " + basis);

  const grid = packagesGrid(byRoute.get("/")!.html);
  assert.ok(
    grid.includes(clause!),
    "the homepage packages grid quotes a floor price without saying what moves it: " + clause,
  );
});
