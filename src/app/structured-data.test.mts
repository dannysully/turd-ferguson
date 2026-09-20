import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { BUILD_DIR, PRERENDER_DIR as PRERENDER, sweptPages, type Page } from "./dynamic-render.mts";

/**
 * The structured data, read by something in this tree at last.
 *
 * Same species as `sitemap.test.mts`: a machine-readable document served to
 * every crawler that no sweep here could see. 48 `ld+json` blocks across 30 of
 * the 31 swept pages, and until this file nothing had ever parsed one. The
 * existing head sweep checks that a description, a canonical and an og:image
 * are *present*; it has never once looked at what any of them say. Presence and
 * value are different questions and only the first was being asked.
 *
 * That gap matters more here than on most sites. We sell being the entity an
 * answer engine recognises. A dangling `@id`, a block that does not parse, or
 * an FAQ answer that has drifted from the copy under it are all invisible to a
 * reader, invisible to `next build`, and are exactly what the thing we sell is
 * measured on.
 *
 * Three sweeps, each with a guard above it that fires the probe at an injected
 * defect first. A clean list is also what a probe that stopped matching
 * returns.
 */

const NEEDS_BUILD = "no build to read - run `npm run build` then `npm run capture`";

/** `_global-error` renders outside the root layout, so it carries no siteGraph. */
const NO_LAYOUT = "_global-error.html";

// ------------------------------------------------------------- the probes

const LD = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

/**
 * Every JSON-LD block on a page, as raw text.
 *
 * The RSC flight payload appended to every prerender holds a serialised copy of
 * the same script elements, which is how `.next/server/app/*.html` has fooled a
 * probe here before. It cannot fool this one: in flight the element is a
 * `["$","script",null,{...}]` tuple, so the literal opening tag this matches on
 * never appears in it. The block count below is the evidence - 48, not 96.
 */
export function ldBlocks(html: string): string[] {
  LD.lastIndex = 0;
  return [...html.matchAll(LD)].map((m) => m[1]!);
}

/**
 * Inline elements, which contribute no whitespace when they are stripped.
 *
 * This is the whole difficulty of comparing schema text to rendered text, and
 * it cost a false positive before it was understood. `TierName` renders a tier
 * as two coloured spans - `<span>always</span><span>mentioned</span>` - with no
 * whitespace between them, because the accent half is coloured separately. A
 * reader sees `alwaysmentioned`; a tag-strip that turns every element into a
 * space sees `always mentioned` and reports the FAQ answer as drifted when it
 * is word-for-word correct.
 *
 * So inline elements strip to nothing and block elements strip to a space.
 * `<br>` is inline but is a line break, so it is a space too.
 */
const INLINE =
  /^<\/?(?:a|abbr|b|bdi|bdo|cite|code|data|dfn|em|i|kbd|mark|q|rp|rt|ruby|s|samp|small|span|strong|sub|sup|time|u|var|wbr)[\s/>]/i;

/** What a reader actually sees on the page. */
export function visibleText(html: string): string {
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? html;
  return body
    // Takes the flight payload and the JSON-LD with it, so schema text can
    // never satisfy the drift check by matching its own script tag.
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, (tag) => (INLINE.test(tag) ? "" : " "))
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Curly quotes are a rendering choice, not a difference in the words. */
export const norm = (s: string) =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

type Node = Record<string, unknown>;

/** Every object in a parsed block, however deeply nested or arrayed. */
export function nodesOf(parsed: unknown, out: Node[] = []): Node[] {
  if (Array.isArray(parsed)) {
    for (const n of parsed) nodesOf(n, out);
    return out;
  }
  if (!parsed || typeof parsed !== "object") return out;
  const o = parsed as Node;
  out.push(o);
  for (const v of Object.values(o)) nodesOf(v, out);
  return out;
}

/**
 * The `@id`s a page defines, and the ones it only points at.
 *
 * A node carrying `@id` and nothing else is a reference - that is the shape
 * `ORG_REF` and `SITE_REF` in `config/schema.ts` emit. Anything with a second
 * key is a definition. The distinction is the entire point of that file: the
 * organisation is declared once in the root layout and every author, publisher
 * and provider on the site resolves to it. If the definition ever stopped being
 * emitted, every page would still look fine and would be describing an entity
 * that nothing on the page defines.
 */
export function ids(parsed: unknown): { defined: Set<string>; referenced: Set<string> } {
  const defined = new Set<string>();
  const referenced = new Set<string>();
  for (const o of nodesOf(parsed)) {
    const id = o["@id"];
    if (typeof id !== "string") continue;
    const keys = Object.keys(o).filter((k) => k !== "@context");
    (keys.length === 1 ? referenced : defined).add(id);
  }
  return { defined, referenced };
}

/** Every string value that is a URL on our own domain. */
export function ownUrls(parsed: unknown): string[] {
  const out: string[] = [];
  for (const o of nodesOf(parsed)) {
    for (const v of Object.values(o)) {
      if (typeof v === "string" && v.startsWith("https://alwayscited.com")) out.push(v);
    }
  }
  return out;
}

/** Every Question name and Answer text, which are claims about the page's own copy. */
export function faqStrings(parsed: unknown): { kind: string; text: string }[] {
  const out: { kind: string; text: string }[] = [];
  for (const o of nodesOf(parsed)) {
    if (o["@type"] === "Question" && typeof o.name === "string") out.push({ kind: "Question.name", text: o.name });
    if (o["@type"] === "Answer" && typeof o.text === "string") out.push({ kind: "Answer.text", text: o.text });
  }
  return out;
}

/** `/legal/` and `/legal` are one route, and a JSON-LD fragment is not part of it. */
function routeOf(url: string): string {
  const path = url.replace(/^https:\/\/alwayscited\.com/, "").split("#")[0]!.split("?")[0]!;
  return path.replace(/(.)\/$/, "$1") || "/";
}

// -------------------------------------------------------------- the guards

test("the probes fire on an injected defect, and not on the shapes that are fine", () => {
  // A reference with no definition anywhere on the page.
  const dangling = ids({ "@type": "Article", author: { "@id": "https://alwayscited.com/#organization" } });
  assert.deepEqual([...dangling.referenced], ["https://alwayscited.com/#organization"]);
  assert.equal(dangling.defined.size, 0, "a bare @id must read as a reference, not a definition");

  // The same id, defined.
  const defined = ids({ "@graph": [{ "@type": "Organization", "@id": "x", name: "alwayscited" }] });
  assert.deepEqual([...defined.defined], ["x"], "an @id with a sibling key must read as a definition");
  assert.equal(defined.referenced.size, 0);

  // `@context` alone must not promote a reference to a definition - every block
  // on this site carries one, so getting this wrong would clear the whole sweep.
  const contexted = ids({ "@context": "https://schema.org", "@id": "y" });
  assert.deepEqual([...contexted.referenced], ["y"], "@context does not make a reference a definition");

  // The TierName shape: two adjacent spans are one word, not two.
  assert.equal(
    visibleText("<body><p>under <span>always</span><span>mentioned</span> today</p></body>"),
    "under alwaysmentioned today",
    "adjacent inline elements must not gain a space between them",
  );
  assert.equal(
    visibleText("<body><p>one</p><p>two</p></body>"),
    "one two",
    "block elements must keep the words either side of them apart",
  );
  assert.equal(
    visibleText('<body><p>real</p><script type="application/ld+json">{"text":"schema only"}</script></body>'),
    "real",
    "schema text must not be able to satisfy the drift check by matching its own script tag",
  );

  // The extractors.
  assert.deepEqual(ldBlocks('<script type="application/ld+json">{"a":1}</script>'), ['{"a":1}']);
  assert.deepEqual(faqStrings({ "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer", text: "A." } }), [
    { kind: "Question.name", text: "Q?" },
    { kind: "Answer.text", text: "A." },
  ]);
  assert.deepEqual(ownUrls({ url: "https://alwayscited.com/blog", other: "https://example.com/x" }), [
    "https://alwayscited.com/blog",
  ]);
  assert.equal(routeOf("https://alwayscited.com"), "/");
  assert.equal(routeOf("https://alwayscited.com/#organization"), "/");
  assert.equal(routeOf("https://alwayscited.com/alwayscited#service"), "/alwayscited");
  assert.equal(routeOf("https://alwayscited.com/blog/"), "/blog");
});

// --------------------------------------------------------- the real pages

test("every JSON-LD block on the site parses, and the escape that lets it is real", (t) => {
  if (!existsSync(PRERENDER)) {
    t.skip(NEEDS_BUILD);
    return;
  }

  const pages = sweptPages();
  const bad: string[] = [];
  let blocks = 0;
  let withLd = 0;

  for (const { page, html } of pages) {
    const raw = ldBlocks(html);
    if (raw.length) withLd++;
    blocks += raw.length;
    for (const r of raw) {
      try {
        JSON.parse(r);
      } catch (e) {
        bad.push(`${page}: ${(e as Error).message}\n    ${r.slice(0, 160)}`);
      }
    }
    // `ld()` escapes `<` so a string value can never close the script tag
    // early. An unescaped one would be an injection point and would usually
    // also break the parse above - but not always, which is why this is checked
    // on its own rather than left to JSON.parse to notice.
    for (const r of raw) {
      if (r.includes("<")) bad.push(`${page}: a raw "<" survived into a JSON-LD block - ld() was bypassed`);
    }
  }

  assert.ok(blocks > 30, `only ${blocks} JSON-LD blocks found - the extractor has stopped matching`);
  assert.equal(
    withLd,
    pages.length - 1,
    `${pages.length - withLd} pages carry no structured data. Exactly one should: ${NO_LAYOUT}, ` +
      `which renders outside the root layout and so never receives the site graph.`,
  );

  t.diagnostic(`${blocks} JSON-LD blocks over ${withLd} of ${pages.length} pages, ${bad.length} malformed`);
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("every @id a page points at is defined on that page", (t) => {
  if (!existsSync(PRERENDER)) {
    t.skip(NEEDS_BUILD);
    return;
  }

  const pages = sweptPages();

  // Earn the exemption before using it: the one page with no structured data
  // must be the layout-less one, proved by the marker every other sweep here
  // uses for it.
  const globalError = pages.find((p) => p.page === NO_LAYOUT);
  assert.ok(globalError, `${NO_LAYOUT} is not in the swept set - the exemption below is unearned`);
  assert.equal(ldBlocks(globalError.html).length, 0, `${NO_LAYOUT} now carries structured data`);

  const bad: string[] = [];
  let refs = 0;

  for (const { page, html } of pages) {
    const defined = new Set<string>();
    const referenced = new Set<string>();
    for (const raw of ldBlocks(html)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue; // the parse sweep above owns this
      }
      const seen = ids(parsed);
      for (const d of seen.defined) defined.add(d);
      for (const r of seen.referenced) referenced.add(r);
    }
    refs += referenced.size;
    for (const r of referenced) {
      if (!defined.has(r)) {
        bad.push(`${page}: points at ${r}, which nothing on the page defines (defined here: ${[...defined].join(", ") || "nothing"})`);
      }
    }
  }

  // The counterpart guard. Every page but one references the organisation, so
  // a near-zero count means the reference detector has drifted, not that the
  // site stopped using @id.
  assert.ok(refs > 20, `only ${refs} @id references found across ${pages.length} pages`);

  t.diagnostic(`${refs} @id references over ${pages.length} pages, ${bad.length} dangling`);
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("every FAQ question and answer in the schema is on the page it is published from", (t) => {
  if (!existsSync(PRERENDER)) {
    t.skip(NEEDS_BUILD);
    return;
  }

  const pages = sweptPages();
  const bad: string[] = [];
  let claims = 0;

  for (const { page, html } of pages) {
    const text = norm(visibleText(html));
    for (const raw of ldBlocks(html)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      for (const c of faqStrings(parsed)) {
        claims++;
        if (!text.includes(norm(c.text))) {
          bad.push(`${page} ${c.kind}: not in the rendered copy\n      ${c.text.slice(0, 180)}`);
        }
      }
    }
  }

  // Both FAQPage blocks on the site are generated from the same array their
  // page renders, so this cannot drift while that stays true. It is checked
  // because the next one may be hand-written, and because Google treats FAQ
  // markup that is not on the page as a violation rather than a warning.
  assert.ok(claims > 15, `only ${claims} FAQ strings found - the extractor has stopped matching`);

  t.diagnostic(`${claims} FAQ strings checked against the rendered copy, ${bad.length} adrift`);
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("every own-domain URL in the structured data is a real route", (t) => {
  if (!existsSync(PRERENDER)) {
    t.skip(NEEDS_BUILD);
    return;
  }

  const routes = new Set<string>(
    Object.values(
      JSON.parse(readFileSync(join(BUILD_DIR, "app-path-routes-manifest.json"), "utf8")) as Record<string, string>,
    ),
  );

  const pages: Page[] = sweptPages();
  const bad: string[] = [];
  const checked = new Set<string>();

  for (const { page, html } of pages) {
    for (const raw of ldBlocks(html)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      for (const url of ownUrls(parsed)) {
        checked.add(url);
        // Deliberately not checking that a `#fragment` here matches an element
        // id. In JSON-LD a fragment is a node identifier - `/#organization`
        // names the Organization node, not an anchor on the home page - so
        // resolving it the way `page-head.test.mts` resolves an href would fail
        // on every correct `@id` on the site.
        const route = routeOf(url);
        if (!routes.has(route)) bad.push(`${page}: ${url} -> ${route} is not a route in the build`);
      }
    }
  }

  assert.ok(checked.size > 15, `only ${checked.size} own-domain URLs found in the structured data`);

  t.diagnostic(`${checked.size} distinct own-domain URLs in JSON-LD, ${bad.length} unresolved`);
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("every image the head points at is a route the build actually serves", (t) => {
  if (!existsSync(PRERENDER)) {
    t.skip(NEEDS_BUILD);
    return;
  }

  const routes = new Set<string>(
    Object.values(
      JSON.parse(readFileSync(join(BUILD_DIR, "app-path-routes-manifest.json"), "utf8")) as Record<string, string>,
    ),
  );

  /**
   * There is no `public/` directory. Every image on this site is a generated
   * route - `opengraph-image.tsx`, `icon.svg`, `favicon.ico` - so an og:image
   * that goes nowhere is a route that stopped existing, not a file that got
   * deleted, and nothing else here would notice.
   *
   * Two URL shapes are in the built heads and both must resolve. The 24 pages
   * that set `openGraph` themselves point at a bare `/opengraph-image`, from
   * `OG_IMAGE` in `config/og.ts`; the 6 that do not get Next's file-convention
   * URL with a cache-busting hash on the end. The hash is not part of the
   * route. Verified by fetch on 20 Sep 2026 against this build: all five
   * distinct URLs answered 200 with real image bytes - the two og URLs and the
   * twitter one returning the same 35,820-byte PNG.
   */
  const pages = sweptPages();
  const bad: string[] = [];
  const checked = new Set<string>();

  for (const { page, html } of pages) {
    const head = /<head>[\s\S]*?<\/head>/.exec(html)?.[0] ?? "";
    const urls = [
      ...[...head.matchAll(/<meta property="og:image" content="([^"]+)"/g)].map((m) => m[1]!),
      ...[...head.matchAll(/<meta name="twitter:image" content="([^"]+)"/g)].map((m) => m[1]!),
      ...[...head.matchAll(/<link rel="(?:icon|shortcut icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)].map((m) => m[1]!),
    ];
    for (const url of urls) {
      checked.add(url);
      const route = routeOf(url);
      if (!routes.has(route)) bad.push(`${page}: ${url} -> ${route} is not a route in the build`);
    }
  }

  assert.ok(checked.size >= 4, `only ${checked.size} image URLs found across ${pages.length} heads`);

  t.diagnostic(`${checked.size} distinct image URLs in the heads, ${bad.length} unresolved`);
  assert.deepEqual(bad, [], bad.join("\n"));
});
