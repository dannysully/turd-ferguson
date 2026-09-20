import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { BUILD_DIR, sweptPages, type Page } from "./dynamic-render.mts";
import { disallowedPaths, noindexHeaderRules, pageRoutes, privateRoutes, probePath } from "./route-probes.mts";

/**
 * Every page that is meant to be found still can be.
 *
 * `route-closure.test.mts` proves a private route is shut three ways. That is
 * one direction, and it is the direction where the cost of being wrong is a
 * token page in an index. **Nothing proved the other one**: that a page meant
 * to be crawled has not been quietly shut. For a business that sells being
 * found, that is the more expensive failure of the two, and every mechanism
 * the closure test uses can cause it:
 *
 * - **A header rule matching more than it meant to.** The closure test asserts
 *   a private route IS matched by an `x-robots-tag: noindex` rule. It never
 *   asks what else the rule matches. A source of `/scan` instead of
 *   `/scan/:path+` deindexes nothing extra today, but the same slip on a
 *   shorter prefix would take public pages with it and every existing
 *   assertion would still pass.
 * - **A `Disallow` losing its trailing slash.** robots.txt disallows
 *   `/coverage-check/`, which blocks the token pages and leaves the public
 *   form at `/coverage-check` crawlable. Delete one character and the lead-gen
 *   page is gone from search with nothing failing - the closure test only
 *   cares that the token page IS covered, and a broader rule covers it harder.
 * - **A `robots: { index: false }` pasted onto the wrong page**, which is the
 *   cheapest mistake of the three to make.
 *
 * `page-head.test.mts` carries a floor of `indexable > 15`, which catches a
 * mass regression and not a single page. This names them.
 */

const NEEDS_BUILD = "no build to read - run `npm run build` then `npm run capture`";

/**
 * The routes that are allowed to be closed, and why.
 *
 * A written list rather than a count, for the reason `readiness-spec.ts` keeps
 * one: a count passes when the set changes by a swap. Adding a private route
 * means adding a line here, which is the point - it is a decision, not a
 * detail. Every entry is checked for staleness below, so the list cannot rot
 * into a blanket pass.
 */
const CLOSED_ON_PURPOSE: Record<string, string> = {
  "/admin/scans": "the ops page; 401s to everyone and has no public reader at all",
  "/scan": "the GET form target, noindex and deliberately headerless - see HEADERLESS_ON_PURPOSE",
  "/scan/[token]": "somebody's own scan result, reachable only by holding the token",
  "/coverage-check/[token]": "somebody's own campaign reading, reachable only by holding the token",
};

/**
 * Routes that are noindex and must still carry no `x-robots-tag`, with why.
 *
 * `/scan` is the one. It is a GET form target, so it must stay fetchable, and
 * `robots.ts` says the meta tag it already carries is enough - "a directive
 * about indexing, addressed to search engines". `next.config.ts` records that
 * this was wrong once: `/scan/:path*` matched bare `/scan` where `:path+` was
 * meant, and the page picked up a header it is not supposed to have.
 *
 * **That fix was held by nothing.** `route-closure.test.mts` proves the rule
 * matches `/scan/<token>`, and it `continue`s past `/scan` rather than
 * asserting anything about it; its one check that the rule does *not* match
 * bare `/scan` runs against an injected fixture, not against the manifest that
 * ships. So reverting `:path+` to `:path*` in the shipped config failed no
 * test. Found by injecting exactly that.
 */
const HEADERLESS_ON_PURPOSE: Record<string, string> = {
  "/scan": "a GET form target that must stay fetchable; its meta tag is the whole of what it needs",
};

const ROUTES = pageRoutes();
const PRIVATE = new Set(privateRoutes());
const PUBLIC = ROUTES.filter((r) => !PRIVATE.has(r));

/** A page is closed to a crawler if anything in its head says noindex. */
const headOf = (html: string) => /<head>[\s\S]*?<\/head>/.exec(html)?.[0] ?? "";

function routeOf(page: string): string {
  if (page.startsWith("/")) return page.split("?")[0];
  const path = page.replace(/\.html$/, "");
  return path === "index" ? "/" : "/" + path;
}

test("the route walk and the private set are both real, so nothing below is vacuous", () => {
  assert.ok(ROUTES.length > 15, "only " + ROUTES.length + " page routes found - the walk, not the app, is what changed");
  assert.ok(PRIVATE.size > 0, "no private route found - route-closure's probe has drifted and this file would pass over everything");
  assert.ok(PUBLIC.length > 15, "only " + PUBLIC.length + " public routes - the private set has swallowed the site");
});

test("only the routes named as closed on purpose are closed", () => {
  const unexpected = [...PRIVATE].filter((r) => !Object.hasOwn(CLOSED_ON_PURPOSE, r));
  assert.deepEqual(
    unexpected,
    [],
    "a page declares itself noindex and is not on the list in this file. If that is deliberate, add it with a reason; " +
      "if it is a paste, this is the page that has just left the index.",
  );
});

test("every route named as closed on purpose still exists and is still closed", () => {
  // An exemption outliving its route is a hole nobody can see, which is the
  // rule copy.test.mts and reads.test.mts already keep over their own lists.
  const stale = Object.keys(CLOSED_ON_PURPOSE).filter((r) => !ROUTES.includes(r));
  assert.deepEqual(stale, [], "this file exempts a route that no longer exists");

  const opened = Object.keys(CLOSED_ON_PURPOSE).filter((r) => !PRIVATE.has(r));
  assert.deepEqual(opened, [], "a route listed here as closed on purpose is no longer noindex");
});

test("no noindex header rule reaches a public route", (t) => {
  let manifest: string;
  try {
    manifest = readFileSync(join(BUILD_DIR, "routes-manifest.json"), "utf8");
  } catch {
    return t.skip(NEEDS_BUILD);
  }
  const rules = noindexHeaderRules(manifest);
  assert.ok(rules.length > 0, "no x-robots-tag rule in the build - the probe has drifted, not the config");

  const hit: string[] = [];
  for (const route of PUBLIC) {
    const path = probePath(route);
    for (const rule of rules) {
      if (rule.regex.test(path)) hit.push(route + " is deindexed by the header rule for " + rule.source);
    }
  }
  assert.deepEqual(
    hit,
    [],
    "a header rule written for a private route matches a public one. The page still renders and still says it is " +
      "indexable; the header a crawler reads first says it is not.",
  );
  t.diagnostic(rules.length + " noindex header rules, " + PUBLIC.length + " public routes, 0 collisions");
});

test("no noindex header rule reaches a route that must stay headerless", (t) => {
  let manifest: string;
  try {
    manifest = readFileSync(join(BUILD_DIR, "routes-manifest.json"), "utf8");
  } catch {
    return t.skip(NEEDS_BUILD);
  }
  const rules = noindexHeaderRules(manifest);
  assert.ok(rules.length > 0, "no x-robots-tag rule in the build - the probe has drifted, not the config");

  const stale = Object.keys(HEADERLESS_ON_PURPOSE).filter((r) => !ROUTES.includes(r));
  assert.deepEqual(stale, [], "this file names a headerless route that no longer exists");

  const hit: string[] = [];
  for (const [route, why] of Object.entries(HEADERLESS_ON_PURPOSE)) {
    for (const rule of rules) {
      if (rule.regex.test(probePath(route))) hit.push(route + " picks up the rule for " + rule.source + " - " + why);
    }
  }
  assert.deepEqual(
    hit,
    [],
    "This is the `:path*` where `:path+` was meant, which next.config.ts records having been made once. " +
      "The route is noindex either way; what it loses is being fetchable by an agent that reads the header " +
      "and never the page.",
  );
  t.diagnostic(Object.keys(HEADERLESS_ON_PURPOSE).length + " headerless routes against " + rules.length + " rules, 0 collisions");
});

test("no robots.txt Disallow reaches a public route", (t) => {
  let body: string;
  try {
    body = readFileSync(join(BUILD_DIR, "server", "app", "robots.txt.body"), "utf8");
  } catch {
    return t.skip(NEEDS_BUILD);
  }
  const disallowed = [...new Set(disallowedPaths(body))];
  assert.ok(disallowed.length > 0, "robots.txt disallows nothing - the parse, not the file, is what changed");

  /**
   * A Disallow is a prefix match, which is the whole hazard. `/coverage-check/`
   * blocks the token pages and leaves the public form at `/coverage-check`
   * crawlable; `/coverage-check` without the slash blocks both, and the page
   * that goes is the one the business is trying to get found.
   */
  const hit: string[] = [];
  for (const route of PUBLIC) {
    for (const rule of disallowed) {
      if (probePath(route).startsWith(rule)) hit.push(route + " is blocked by Disallow: " + rule);
    }
  }
  assert.deepEqual(
    hit,
    [],
    "robots.txt blocks a page that is meant to be found. Check the trailing slash: a rule for a private subtree " +
      "needs one, or it takes the public page above it as well.",
  );
  t.diagnostic(disallowed.length + " Disallow rules, " + PUBLIC.length + " public routes, 0 collisions");
});

test("the Disallow probe fires on the shape that is wrong", () => {
  // Proving the prefix match is really a prefix match, on this file's own
  // worked example rather than on the shipped values.
  assert.ok("/coverage-check".startsWith("/coverage-check"), "a rule without its slash must take the public page");
  assert.ok(!"/coverage-check".startsWith("/coverage-check/"), "a rule with its slash must leave the public page alone");
  assert.ok(probePath("/coverage-check/[token]").startsWith("/coverage-check/"), "the token page must still be covered");
});

test("no page that is meant to be found renders a noindex", (t) => {
  const pages: Page[] = sweptPages();
  if (pages.length < 15) return t.skip(NEEDS_BUILD);

  /**
   * The rendered half, which catches what source cannot: a noindex arriving
   * from a layout, from `robots.ts`, or from anywhere other than the page's
   * own `metadata`. `privateRoutes()` reads source by design, because three of
   * the four cannot be rendered on this machine at all.
   */
  const publicRoutes = new Set(PUBLIC);
  const closed: string[] = [];
  let checked = 0;
  for (const p of pages) {
    const route = routeOf(p.page);
    if (!publicRoutes.has(route)) continue;
    checked++;
    if (/noindex/.test(headOf(p.html))) closed.push(route);
  }
  assert.ok(checked > 15, "only " + checked + " public pages matched a swept page - the route mapping has drifted");
  assert.deepEqual(closed, [], "this page is meant to be found and its own head tells a crawler not to index it");
  t.diagnostic(checked + " public pages rendered, 0 carrying noindex");
});
