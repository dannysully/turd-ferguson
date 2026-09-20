import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { BUILD_DIR, PRERENDER_DIR as PRERENDER, sweptPages } from "./dynamic-render.mts";

/**
 * The two files a crawler reads first, and the only two nothing here swept.
 *
 * Every sweep in this tree reads pages - the prerender plus the captured
 * dynamic states - and asks questions about their markup. `/sitemap.xml` and
 * `/robots.txt` are not pages. They carry no `<head>`, no `h1` and no `href`,
 * so the href sweep, the head sweep, the motion census and the tier-lockup
 * sweep all walk straight past them. They were the denominator again: 31 pages
 * read, and the two documents that tell a crawler which of them to fetch read
 * by nothing.
 *
 * That matters here more than on most sites, because `sitemap.ts` holds a
 * hand-written literal list of 21 routes. A hand-maintained list against a
 * route set that can grow is this repo's declared defect species, and the
 * failure is silent in the worst direction: a new page joins the site, nobody
 * adds it to `ENTRIES`, and the one file whose job is to announce it never
 * mentions it. Nothing goes red. The page is simply never offered.
 *
 * So the sitemap's URL set is derived and compared rather than trusted: it
 * must be exactly the set of canonical URLs the site declares indexable. Both
 * directions are checked, because each catches a different mistake - a page
 * the sitemap forgot, and a URL the sitemap still advertises after the route
 * went noindex or was deleted.
 *
 * Deliberately NOT checked here: `lastmod`. See the comment in `sitemap.ts`
 * for why the obvious derivation is wrong in both directions.
 */

const NEEDS_BUILD = "no build to read - run `npm run build` then `npm run capture`";

// ------------------------------------------------------------- the probes

const headOf = (html: string) => /<head>[\s\S]*?<\/head>/.exec(html)?.[0] ?? "";

/**
 * The canonical URL of every swept page that is not noindex.
 *
 * Keyed on the canonical rather than on the page label because several swept
 * pages are states of one route: `/blog`, `/blog?kind=Method`,
 * `/blog?kind=Findings` and `/blog?kind=nonsense` are four swept pages and one
 * URL a crawler should be offered. A sitemap listing the filtered states would
 * be advertising four copies of one page.
 */
export function indexableCanonicals(pages: { page: string; html: string }[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const { page, html } of pages) {
    const head = headOf(html);
    if (/noindex/.test(head)) continue;
    const canonical = /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/.exec(head)?.[1];
    // A page with no canonical at all is `_global-error`, which renders outside
    // the root layout. page-head.test.mts owns that exemption and earns it
    // there; here it simply is not a URL to offer.
    if (!canonical) continue;
    if (!out.has(canonical)) out.set(canonical, []);
    out.get(canonical)!.push(page);
  }
  return out;
}

/** Every `<loc>` in the shipped sitemap, in document order. */
export function locsOf(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
}

/** The paths robots.txt tells every agent not to fetch. */
export function disallowedPaths(robots: string): string[] {
  return [...robots.matchAll(/^Disallow:\s*(\S+)\s*$/gm)].map((m) => m[1]!);
}

// -------------------------------------------------------------- the guards

test("the sitemap probes fire on the three shapes that are wrong", () => {
  const page = (name: string, canonical: string | null, noindex = false) => ({
    page: name,
    html:
      "<head>" +
      (noindex ? '<meta name="robots" content="noindex, nofollow"/>' : "") +
      (canonical ? `<link rel="canonical" href="${canonical}"/>` : "") +
      "</head>",
  });

  const found = indexableCanonicals([
    page("index.html", "https://alwayscited.com"),
    page("blog.html", "https://alwayscited.com/blog"),
    page("/blog?kind=Method", "https://alwayscited.com/blog"),
    page("scan.html", "https://alwayscited.com/scan", true),
    page("_global-error.html", null),
  ]);

  assert.deepEqual(
    [...found.keys()].sort(),
    ["https://alwayscited.com", "https://alwayscited.com/blog"],
    "a noindex page and a page with no canonical are not URLs to offer",
  );
  assert.equal(found.get("https://alwayscited.com/blog")!.length, 2, "two states of one route are one URL");

  assert.deepEqual(
    locsOf("<url><loc>https://alwayscited.com/a</loc></url><url><loc>https://alwayscited.com/b</loc></url>"),
    ["https://alwayscited.com/a", "https://alwayscited.com/b"],
  );

  assert.deepEqual(
    disallowedPaths("User-Agent: *\nAllow: /\nDisallow: /scan/\nDisallow: /api/\n"),
    ["/scan/", "/api/"],
  );
});

// --------------------------------------------------------- the real files

test("the sitemap offers exactly the pages the site declares indexable", (t) => {
  if (!existsSync(PRERENDER)) {
    t.skip(NEEDS_BUILD);
    return;
  }

  const xmlPath = join(BUILD_DIR, "server", "app", "sitemap.xml.body");
  assert.ok(existsSync(xmlPath), `no sitemap in the build at ${xmlPath}`);

  const pages = sweptPages();
  const declared = indexableCanonicals(pages);
  const shipped = locsOf(readFileSync(xmlPath, "utf8"));

  // Counter-guards, the `75ff8d6` lesson: an empty diff and a probe that has
  // stopped matching look identical. Both sides must be non-trivial for the
  // comparison below to mean anything.
  assert.ok(declared.size > 15, `only ${declared.size} indexable canonicals - the canonical probe has drifted`);
  assert.ok(shipped.length > 15, `only ${shipped.length} <loc> entries - the sitemap parser has drifted`);

  const inSitemap = new Set(shipped);
  const missing = [...declared.keys()].filter((u) => !inSitemap.has(u)).sort();
  const orphaned = shipped.filter((u) => !declared.has(u)).sort();

  t.diagnostic(`${declared.size} indexable canonicals over ${pages.length} swept pages, ${shipped.length} in the sitemap`);

  assert.deepEqual(
    missing,
    [],
    "These pages are indexable and the sitemap does not offer them. Add each to ENTRIES in " +
      "src/app/sitemap.ts with the date its copy last changed:\n" +
      missing.map((u) => `  ${u}   (rendered by ${declared.get(u)!.join(", ")})`).join("\n"),
  );

  assert.deepEqual(
    orphaned,
    [],
    "The sitemap offers these and no swept page declares them indexable under that canonical. " +
      "Either the route went noindex or was deleted and ENTRIES still names it, or its canonical " +
      "no longer matches the URL here:\n" + orphaned.map((u) => `  ${u}`).join("\n"),
  );

  assert.equal(new Set(shipped).size, shipped.length, "the sitemap lists a URL twice");
});

test("the sitemap never offers a URL robots.txt closes", (t) => {
  if (!existsSync(PRERENDER)) {
    t.skip(NEEDS_BUILD);
    return;
  }

  const dir = join(BUILD_DIR, "server", "app");
  const robots = readFileSync(join(dir, "robots.txt.body"), "utf8");
  const shipped = locsOf(readFileSync(join(dir, "sitemap.xml.body"), "utf8"));

  const closed = [...new Set(disallowedPaths(robots))];
  assert.ok(closed.length >= 3, `only ${closed.length} Disallow rules - robots.txt or this parser has changed`);

  // Telling a crawler to fetch a URL in the same breath as telling it not to
  // is the one contradiction these two files can hold between them, and
  // neither file can see the other.
  const contradictions = shipped.filter((u) => {
    const path = u.replace(/^https?:\/\/[^/]+/, "") || "/";
    return closed.some((c) => path.startsWith(c));
  });

  t.diagnostic(`${shipped.length} sitemap URLs against ${closed.length} Disallow rules: ${closed.join(" ")}`);
  assert.deepEqual(contradictions, [], contradictions.join("\n"));

  // robots.txt must point at the sitemap that was actually built, not at a
  // path that used to exist.
  assert.match(robots, /^Sitemap:\s*https:\/\/alwayscited\.com\/sitemap\.xml\s*$/m);
});
