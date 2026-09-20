import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { BUILD_DIR, PRERENDER_DIR as PRERENDER, sweptPages, type Page } from "./dynamic-render.mts";

/**
 * The head and the links, checked rather than remembered.
 *
 * These sweeps existed only as sentences in `docs/inbox.md` - "every internal
 * href on all 22 prerendered pages resolves to a real route; 133 #fragment
 * links resolve, 0 broken; all 22 carry exactly one h1, a title, a
 * description, a canonical and an og:image". Every word of that was true when
 * it was written and all of it was taken over 22 pages. The site is 31. A
 * clearance written in prose cannot tell you which denominator it used, and
 * this one had already gone stale by the time anybody re-read it.
 *
 * So it lives here now, over `sweptPages()`, which is the prerender plus the
 * dynamic routes `dynamic-render.mts` captures. Widen that set and these
 * widen with it.
 */

const NEEDS_BUILD = "no build to read - run `npm run build` then `npm run capture`";

/**
 * `_global-error` renders outside the root layout, so it has no metadata at
 * all - no description, no canonical, no og:image. That is correct and it is
 * the only page on the site it is true of.
 *
 * The exemption is asserted rather than trusted: the test below proves this
 * page really is the layout-less one, by the same marker every other sweep
 * here uses for it - it does not carry the motion script. An exemption that
 * stops being earned is a hole with a comment over it.
 */
const NO_LAYOUT = "_global-error.html";

// ------------------------------------------------------------- the probes

const headOf = (html: string) => /<head>[\s\S]*?<\/head>/.exec(html)?.[0] ?? "";
const idsOf = (html: string) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

/** `/legal/` and `/legal` are one route; a query string is not part of it. */
function routeOf(path: string): string {
  return path.split("?")[0]!.replace(/(.)\/$/, "$1") || "/";
}

export type LinkIssue = { page: string; href: string; why: string };

/**
 * Every internal link that goes nowhere.
 *
 * Two things this had to be taught, both found by it reporting 44 failures
 * that were not failures:
 *
 *  - **`/_next/static/*` is a build asset, not a route.** Every page carries
 *    several, so an untaught version fails on all 31 at once, which at least
 *    fails loudly. The quieter half is the next one.
 *  - **A fragment belongs to the page the href points AT.** `/#scan` on
 *    `/blog` means `#scan` on the home page. Resolving it against the ids of
 *    the page carrying the link marks every cross-page anchor on the site
 *    broken - and the obvious "fix", dropping cross-page fragments, would
 *    have made the sweep blind to the only kind this site actually uses.
 */
export function linkIssues(pages: Page[], routes: Set<string>): LinkIssue[] {
  const byRoute = new Map<string, string>();
  for (const p of pages) {
    // A captured page is labelled by URL (`/blog?kind=Method`); its route is
    // the part before the query. A prerendered one is labelled by file.
    const route = p.page.startsWith("/")
      ? routeOf(p.page)
      : "/" + p.page.replace(/\.html$/, "").replace(/^index$/, "");
    if (!byRoute.has(route)) byRoute.set(route, p.html);
  }

  const issues: LinkIssue[] = [];
  for (const { page, html } of pages) {
    const here = p0(page);
    for (const [, href] of html.matchAll(/href="([^"]*)"/g)) {
      if (!href.startsWith("/") && !href.startsWith("#")) continue; // external
      if (href.startsWith("/_next/")) continue; // a build asset, not a route

      const hash = href.indexOf("#");
      const path = hash === -1 ? href : href.slice(0, hash);
      const frag = hash === -1 ? "" : href.slice(hash + 1);

      const target = path ? routeOf(path) : here;
      if (path && !routes.has(target)) {
        issues.push({ page, href, why: `${target} is not a route in the build` });
        continue;
      }

      if (!frag) continue;
      const targetHtml = byRoute.get(target);
      if (!targetHtml) {
        // Not a failure of the page - the target is real, it is just outside
        // the swept set. Say so, so it cannot read as a clean resolve.
        issues.push({ page, href, why: `${target} is a real route but is not in the swept set` });
        continue;
      }
      if (!idsOf(targetHtml).has(frag)) {
        issues.push({ page, href, why: `no #${frag} on ${target}` });
      }
    }
  }
  return issues;
}

/** The route a page label refers to. */
function p0(page: string): string {
  return page.startsWith("/") ? routeOf(page) : "/" + page.replace(/\.html$/, "").replace(/^index$/, "");
}

// -------------------------------------------------------------- the guards

test("the link probe fires on a dead link, and not on the four shapes that are fine", () => {
  const routes = new Set(["/", "/blog"]);
  const pages: Page[] = [
    { page: "index.html", html: '<h1 id="top">home</h1><div id="scan"></div>' },
    { page: "blog.html", html: "<p>writing</p>" },
  ];

  const probe = (html: string) => linkIssues([{ page: "blog.html", html }, ...pages], routes);

  assert.equal(probe('<a href="/nope">x</a>').length, 1, "a link to a route that does not exist must fail");
  assert.equal(probe('<a href="/#nope">x</a>').length, 1, "a fragment the target does not have must fail");

  assert.deepEqual(probe('<a href="/_next/static/a.css">x</a>'), [], "a build asset is not a route");
  assert.deepEqual(probe('<a href="https://example.com/nope">x</a>'), [], "an external link is not ours to resolve");
  assert.deepEqual(probe('<a href="/#scan">x</a>'), [], "a cross-page fragment resolves against the page it points at");
  assert.deepEqual(probe('<a href="/blog?kind=Method">x</a>'), [], "a query string is not part of the route");
  assert.deepEqual(probe('<a href="/blog/">x</a>'), [], "a trailing slash is the same route");
});

// --------------------------------------------------------- the real pages

test("every swept page has exactly one h1 and a title", (t) => {
  if (!existsSync(PRERENDER)) {
    t.skip(NEEDS_BUILD);
    return;
  }

  const pages = sweptPages();
  const bad = pages.flatMap(({ page, html }) => {
    const h1s = [...html.matchAll(/<h1[\s>]/g)].length;
    const titles = [...headOf(html).matchAll(/<title[\s>]/g)].length;
    const out: string[] = [];
    if (h1s !== 1) out.push(`${page}: ${h1s} h1 elements`);
    if (titles !== 1) out.push(`${page}: ${titles} title tags`);
    return out;
  });

  t.diagnostic(`${pages.length} pages checked`);
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("every indexable page carries a description, a canonical and an og:image", (t) => {
  if (!existsSync(PRERENDER)) {
    t.skip(NEEDS_BUILD);
    return;
  }

  const pages = sweptPages();

  // Earn the one exemption before using it.
  const globalError = pages.find((p) => p.page === NO_LAYOUT);
  assert.ok(globalError, `${NO_LAYOUT} is not in the swept set - the exemption below is unearned`);
  assert.ok(
    !/data-ac-seen|ac-row/.test(globalError.html),
    `${NO_LAYOUT} now carries the motion script, so it is inside the root layout and no longer ` +
      `has a reason to be missing its metadata. Drop the exemption and give it a head.`,
  );

  let indexable = 0;
  const bad: string[] = [];
  for (const { page, html } of pages) {
    if (page === NO_LAYOUT) continue;
    const head = headOf(html);

    // `/scan` and `_not-found` are deliberately noindex - `/scan` says so in
    // its own source: "a state, not a page". A noindex page needs no canonical,
    // and asserting one would be asserting a bug.
    const noindex = /noindex/.test(head);
    if (!/name="description"/.test(head)) bad.push(`${page}: no meta description`);
    if (!/property="og:image"/.test(head)) bad.push(`${page}: no og:image`);
    if (!noindex) {
      indexable++;
      if (!/rel="canonical"/.test(head)) bad.push(`${page}: indexable but has no canonical`);
    }
  }

  // The counterpart guard: if nothing were indexable the canonical rule would
  // pass while checking nothing at all.
  assert.ok(indexable > 15, `only ${indexable} indexable pages - the noindex detector has drifted`);
  t.diagnostic(`${pages.length} pages, ${indexable} indexable`);
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("every internal href and every fragment resolves", (t) => {
  if (!existsSync(PRERENDER)) {
    t.skip(NEEDS_BUILD);
    return;
  }

  const routes = new Set<string>(
    Object.values(
      JSON.parse(readFileSync(join(BUILD_DIR, "app-path-routes-manifest.json"), "utf8")) as Record<string, string>,
    ),
  );

  const pages = sweptPages();
  const issues = linkIssues(pages, routes);

  // A clean list is also what a probe that stopped matching returns, and the
  // guard above proves it can still see a dead link against synthetic input.
  // This is the same thing against real input: the site must actually contain
  // internal links and fragments for the empty result to mean anything.
  const counted = pages.reduce(
    (n, { html }) => n + [...html.matchAll(/href="[/#][^"]*"/g)].filter((m) => !m[0].includes("/_next/")).length,
    0,
  );
  assert.ok(counted > 100, `only ${counted} internal links found across ${pages.length} pages`);

  t.diagnostic(`${counted} internal links over ${pages.length} pages, ${issues.length} unresolved`);
  assert.deepEqual(
    issues,
    [],
    issues.map((i) => `  ${i.page}  ->  ${i.href}  (${i.why})`).join("\n"),
  );
});
