/**
 * /app wiring census (R131, Danny, 30 Sep 2026, danny.md 120). Walks every
 * page under src/app/app/[client]/ and fails if
 *  (a) a built static route has no nav item pointing at it,
 *  (b) a nav or tab item is neither a link to a built route nor explicitly
 *      SOON (drawn disabled, "Coming soon"), or the sidebar draws an item
 *      some other way than those two,
 *  (c) an in-page link to /app/<client>/... in the dashboard's code points at
 *      a route that does not exist.
 * Dynamic detail routes ([cluster]) need no nav item; they are reached from
 * their list page, which (c) holds.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { CLUSTER_NAV, CLUSTER_TABS, NAV, NAV_TARGET, SOON, TABS } from "./nav.ts";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const CLIENT = join(ROOT, "src", "app", "app", "[client]");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Routes under /app/[client], as suffixes with dynamic segments as "[]": "", "/clusters", "/clusters/[]". */
const ROUTES = walk(CLIENT)
  .filter((f) => /[\\/]page\.tsx$/.test(f))
  .map((f) => relative(CLIENT, f).split(sep).slice(0, -1))
  .map((segs) => segs.map((s) => (/^\[.+\]$/.test(s) ? "[]" : s)))
  .map((segs) => (segs.length ? "/" + segs.join("/") : ""));
const STATIC = ROUTES.filter((r) => !r.includes("[]"));

/** Floors, 30 Sep 2026: 3 routes (overview, clusters, one cluster), 8 distinct nav and tab items (the 7 nav plus the phone's Keywords). */
const ROUTE_FLOOR = 3;
const ITEM_FLOOR = 8;

const ITEMS = [...new Set<string>([...NAV, ...TABS, ...CLUSTER_NAV, ...CLUSTER_TABS])];

test("census floor: the walk still finds the routes and the items", () => {
  assert.ok(ROUTES.length >= ROUTE_FLOOR, `${ROUTES.length} routes walked, floor ${ROUTE_FLOOR}`);
  assert.ok(ITEMS.length >= ITEM_FLOOR, `${ITEMS.length} items, floor ${ITEM_FLOOR}`);
});

test("(a) every built static route under /app/[client] has a nav item", () => {
  const targeted = new Set(Object.values(NAV_TARGET).filter((t): t is string => typeof t === "string"));
  const orphans = STATIC.filter((r) => !targeted.has(r));
  assert.deepEqual(orphans, [], `built routes with no nav item: ${orphans.join(", ")}`);
});

test("(b) every nav and tab item is a link to a built route or explicitly Coming soon", () => {
  const bad = ITEMS.filter((item) => {
    const t = NAV_TARGET[item];
    if (t === SOON && Object.hasOwn(NAV_TARGET, item)) return false;
    return typeof t !== "string" || !ROUTES.includes(t);
  });
  assert.deepEqual(bad, [], `items neither linked nor disabled: ${bad.join(", ")}`);
});

test("(b) the sidebar draws an item only as a link or as a disabled Coming soon", () => {
  const src = readFileSync(join(ROOT, "src", "components", "app", "Sidebar.tsx"), "utf8");
  assert.doesNotMatch(src, /href \? "a" : "span"/, "the old plain-text fallback is back");
  assert.match(src, /navHref\(/, "hrefs come from nav.ts");
  assert.match(src, /aria-disabled/, "an unbuilt item is marked disabled");
  assert.match(src, /Coming soon/);
});

/** In-page /app links in the dashboard's code, as route suffixes. */
function inPageLinks(): { file: string; route: string }[] {
  const dirs = [join(ROOT, "src", "components", "app"), join(ROOT, "src", "app", "app")];
  const out: { file: string; route: string }[] = [];
  for (const f of dirs.flatMap(walk).filter((f) => /\.tsx?$/.test(f))) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/`\/app\/\$\{[^}]+\}((?:\/(?:[a-z-]+|\$\{[^}]+\}))*)/g)) {
      const route = m[1].replace(/\$\{[^}]+\}/g, "[]");
      out.push({ file: relative(ROOT, f), route });
    }
  }
  return out;
}

test("(c) every in-page /app/<client>/... link points at a built route", () => {
  const links = inPageLinks();
  assert.ok(links.length >= 4, `${links.length} in-page links found; the matcher has drifted`);
  const dead = links.filter((l) => !ROUTES.includes(l.route)).map((l) => `${l.file}: /app/[client]${l.route}`);
  assert.deepEqual(dead, [], `links to routes that do not exist:\n${dead.join("\n")}`);
});

test("census probe: an orphan route, a plain item and a dead link each fire", () => {
  assert.ok(!Object.hasOwn(NAV_TARGET, "Nowhere"), "an item with no entry is neither linked nor disabled");
  assert.ok(!ROUTES.includes("/reports"), "a link to an unbuilt page is dead");
  assert.ok(STATIC.includes("/clusters"));
});
