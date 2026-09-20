import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { test } from "node:test";

import { sweptPages } from "./dynamic-render.mts";
import { OG_IMAGE } from "../config/og.ts";
import { ENGINE_SPECS, ENGINES } from "../lib/scan/engines.ts";
import { TIER_PLAIN } from "../lib/tier-text.ts";

/**
 * The share card: the one published surface on this site that is not text.
 *
 * Every copy sweep here reads a rendered page. `745832a` widened that to the
 * head, on the grounds that a meta description is the first sentence a buyer
 * meets and `pageText` drops it by construction. The card is one step further
 * out again and no widening reaches it: it is a PNG, drawn by
 * `opengraph-image.tsx`, and it is what a buyer sees in Slack, LinkedIn or
 * WhatsApp *before* they have loaded a page at all. `price-claims`,
 * `white-label-claims` and `copy.test.mts` are all correct about every page
 * they name, and not one of them can read a pixel.
 *
 * That denominator gap is not theoretical, and the measurement that shows it
 * is this: the card draws "Be the brand AI recommends", whose stated
 * provenance in `opengraph-image.tsx` is "verbatim from the root layout
 * title, so the card cannot assert anything the site does not already say".
 * The root layout title default is real - and it renders on exactly one page
 * in the build, `_not-found`, which is `noindex`. Counted off the built heads
 * on 20 Sep 2026: all 16 other prerendered pages set their own title and get
 * the `%s | alwayscited` template instead. So the sentence's only *indexed*
 * publisher is the card, and the surface it was said to be echoing reaches no
 * reader. Same shape as the root description already recorded in the queue.
 *
 * Nothing on the card is false today - it is positioning in the same register
 * as the title, not a claim about an engine or a result, so no `[VERIFY]` is
 * owed. What was missing is any join at all. These rules are that join: the
 * card may draw only what the site already publishes, and the four facts the
 * head states *about* the card must come from the card.
 *
 * The rules below name `opengraph-image.tsx` by hand and the last one derives
 * that set by walking `src/app`, so the hand-typed denominator is measured
 * rather than assumed - Next resolves these conventions per route segment, and
 * a card added under any other segment would otherwise be shipped on every
 * share of that page and read by nothing here.
 *
 * **What this cannot see, said plainly rather than implied: the pixels.** It
 * cannot tell you the type fits inside the frame, that the accent is the
 * brand purple, or that Satori found a font. Those need eyes, and on 20 Sep
 * 2026 they got some - the card was rendered from this build, fetched from
 * production, and compared to `docs/og-card-live.png`. All three are the same
 * 35,820-byte PNG, sha256 `7a3d873fb217b811...`, and `/twitter-image` returns
 * those identical bytes. That is a dated reading, not a gate: a sha pinned
 * here would fail on every legitimate copy change and could not be re-derived
 * without booting a server, which is not a 1.3s push gate.
 */

const ROOT = join(import.meta.dirname, "..", "..");
const CARD = "src/app/opengraph-image.tsx";
const TWITTER = "src/app/twitter-image.tsx";
const LAYOUT = "src/app/layout.tsx";

/**
 * Source with its prose removed.
 *
 * Non-negotiable in anything here that reads source, and paid for five times
 * in this repo - most recently `0a3aa9e`, where a component's doc comment
 * contained the very markup the check was looking for and satisfied it. This
 * file is the worst case of that: `opengraph-image.tsx` is four doc comments
 * to twenty lines of markup, and they discuss the lockup, the wording and the
 * engine row by name.
 *
 * Line-based, and it knows the three forms that appear in a .tsx here: `//`,
 * a `/**` block with `*` continuations, and `{/* ... *␑/}`. Block state is
 * tracked over an opening `{/*` or `/**` only and never over a bare `/*`, so
 * a `/*` inside a string cannot swallow the rest of the file - over-reporting
 * is recoverable and a silently truncated walk is not.
 */
function sourceOf(file: string): string {
  const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
  const out: string[] = [];
  let open = false;
  for (const line of lines) {
    const t = line.trim();
    if (open) {
      if (t.includes("*/")) open = false;
      continue;
    }
    if (t.startsWith("{/*") || t.startsWith("/*")) {
      if (!t.includes("*/")) open = true;
      continue;
    }
    if (t.startsWith("*") || t.startsWith("//")) continue;
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Just the markup the card returns, not the whole module.
 *
 * Scoped from `export default function Image()` to the end, because above it
 * are the style objects - and those hold strings like "image/png" and
 * "1px solid" that are not drawn on anything.
 */
function cardMarkup(): string {
  const src = sourceOf(CARD);
  const at = src.indexOf("export default function Image()");
  assert.ok(at !== -1, `${CARD} no longer has a default Image() export - this whole file is reading the wrong thing`);
  return src.slice(at);
}

/** Every literal run of text between two tags. `{engines}` is not one. */
function drawnLiterals(markup: string): string[] {
  return [...markup.matchAll(/>([^<>{}]+)</g)].map((m) => m[1]!.trim()).filter(Boolean);
}

/** The two spans of the wordmark, in order, so they can be joined back up. */
function lockupSpans(markup: string): string[] {
  const block = /<div style=\{lockup\}>([\s\S]*?)<\/div>/.exec(markup);
  assert.ok(block, "the lockup div is not in the card markup under the name `lockup`");
  return [...block[1]!.matchAll(/<span[^>]*>([^<]+)<\/span>/g)].map((m) => m[1]!);
}

/** The root layout's `title.default` - the string the card says it echoes. */
function layoutTitleDefault(): string {
  const m = /default:\s*"([^"]+)"/.exec(sourceOf(LAYOUT));
  assert.ok(m, `no title.default found in ${LAYOUT}`);
  return m[1]!;
}

/** A named `export const x = "..."` out of the card module. */
function exportedString(name: string): string {
  const m = new RegExp(`export const ${name}\\s*=\\s*"([^"]*)"`).exec(sourceOf(CARD));
  assert.ok(m, `${CARD} no longer exports a string called \`${name}\``);
  return m[1]!;
}

// ------------------------------------------------------------- what it draws

/**
 * The card's TierName problem, and no existing sweep can have it.
 *
 * `copy.test.mts` hunts miscased brand words in source. The lockup is
 * `<span>always</span><span>cited</span>` - two runs, neither of which is the
 * brand, so a card reading `<span>Always</span><span>Cited</span>` contains no
 * token that sweep looks for. It is the same split-lockup fact that made
 * `TierName` read as two words to a tag strip, arriving from the other
 * direction: there the split hid a real name, here it would hide a wrong one.
 *
 * Joined rather than checked span by span, and compared against `TIER_PLAIN`
 * rather than a typed "alwayscited", so the one thing asserted is that the
 * wordmark spells the brand.
 */
test("the lockup spells the brand and nothing else", () => {
  const spans = lockupSpans(cardMarkup());
  assert.equal(
    spans.join(""),
    TIER_PLAIN.cited,
    `the card's wordmark reads ${JSON.stringify(spans.join(""))}, not the brand`,
  );
});

/**
 * The rule that closes the denominator gap this file exists for.
 *
 * A sentence added to the card is published to every share of every page and
 * read by no sweep in this tree. Requiring it to already appear in the root
 * layout title does not make the card safe - it makes the card *unable to go
 * first*. Anything new has to be written somewhere a page sweep can see it
 * before it can be drawn here, and at that point `price-claims`,
 * `white-label-claims` and `copy.test.mts` all get a look at it.
 *
 * The lockup spans are excluded because the test above owns them: as bare
 * runs they are "always" and "cited", and a substring rule would accept those
 * in any casing the title happens to contain.
 */
test("every sentence the card draws is one the site already publishes", () => {
  const markup = cardMarkup();
  const spans = new Set(lockupSpans(markup));
  const title = layoutTitleDefault();

  const drawn = drawnLiterals(markup).filter((s) => !spans.has(s));
  assert.ok(drawn.length > 0, "no drawn text found in the card - the markup scan has stopped reading it");

  const unsourced = drawn.filter((s) => !title.includes(s));
  assert.deepEqual(
    unsourced,
    [],
    `the card draws text that appears nowhere a page sweep reads:\n` +
      unsourced.map((s) => `  ${JSON.stringify(s)}`).join("\n") +
      `\nthe root layout title is ${JSON.stringify(title)}`,
  );
});

/**
 * `alt` is the card in words, and it is the only part of it any sweep reads.
 *
 * `headClaims` feeds `og:image:alt` and `twitter:image:alt` to the claim
 * prohibitions, so the alt string is already inside `price-claims` and
 * `white-label-claims`. That makes it the one place a wrong card can still be
 * caught - and only while it still says what the card says. Left unjoined,
 * the headline could change and the alt stay, which is both a false
 * description for a screen reader and a claim sweep guarding a card that no
 * longer exists.
 *
 * Case-insensitive on purpose: the card sets the headline sentence-cased and
 * the alt runs it on after a dash, so `alt` is deliberately not byte-verbatim.
 */
test("the alt text describes what the card actually draws", () => {
  const markup = cardMarkup();
  const spans = new Set(lockupSpans(markup));
  const alt = exportedString("alt");

  assert.ok(
    alt.includes(TIER_PLAIN.cited),
    `the alt text does not name the brand: ${JSON.stringify(alt)}`,
  );

  const missing = drawnLiterals(markup)
    .filter((s) => !spans.has(s))
    .filter((s) => !alt.toLowerCase().includes(s.toLowerCase()));
  assert.deepEqual(
    missing,
    [],
    `the card draws text the alt does not describe:\n` +
      missing.map((s) => `  ${JSON.stringify(s)}`).join("\n") +
      `\nalt is ${JSON.stringify(alt)}`,
  );
});

/**
 * The engine row, still derived.
 *
 * It reads `FREE_ENGINES` today and the file says why - a hardcoded count went
 * stale on the docs once. `typedEngines` in `copy.test.mts` deliberately
 * cannot report a typed engine NAME, only a count, because a names rule fires
 * on six legitimate lines elsewhere. Inside this one file there are no
 * legitimate lines, so the names rule is affordable here.
 *
 * Every label in `ENGINE_SPECS`, not just the free four: `Claude` is in the
 * table and deliberately out of the free scan, so a card naming it would be
 * the worst version of this - a false claim about what the free scan reads,
 * on the surface with the widest reach and the least oversight.
 */
test("the engine row is derived from config, never typed", () => {
  const markup = cardMarkup();
  const typed = ENGINES.map((e) => ENGINE_SPECS[e].label).filter((label) => markup.includes(label));
  assert.deepEqual(
    typed,
    [],
    `the card types engine labels instead of reading them from FREE_ENGINES: ${typed.join(", ")}`,
  );
});

// --------------------------------------------- what the head says about it

/**
 * Two literals, one card, four facts published to every crawler.
 *
 * `config/og.ts` exists because Open Graph metadata merges shallowly, so a
 * page that sets `openGraph` at all drops the file-convention image it
 * inherited. The fix was a value every page points at - and that value retypes
 * `alt`, `width`, `height` and `type` from the image route rather than reading
 * them. Both copies reach the same head on different pages: 16 prerendered
 * pages take `OG_IMAGE`'s, `_not-found` takes the route's own exports.
 *
 * Nothing joined them, and this is the two-copies species that actually pays
 * here - the date formatter, the honeypot, `brand-name.ts`. In each the
 * untested copy was the one that was wrong. A card resized to 1600x900 keeps
 * publishing `1200x630` on 16 pages and the right numbers on one, and every
 * existing check passes: `page-head` asks only that an og:image is present,
 * `structured-data` only that its URL is a route the build serves.
 */
test("config/og.ts agrees with the card's own exports", () => {
  const src = sourceOf(CARD);
  const size = /export const size\s*=\s*\{\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/.exec(src);
  assert.ok(size, `${CARD} no longer exports a { width, height } size`);

  assert.deepEqual(
    { alt: OG_IMAGE.alt, width: OG_IMAGE.width, height: OG_IMAGE.height, type: OG_IMAGE.type },
    {
      alt: exportedString("alt"),
      width: Number(size[1]),
      height: Number(size[2]),
      type: exportedString("contentType"),
    },
    "OG_IMAGE in config/og.ts has drifted from what src/app/opengraph-image.tsx exports",
  );
});

/**
 * And the same four facts as the build actually wrote them.
 *
 * The two assertions above compare source to source, which would both be
 * wrong together if a page hand-typed its own `images:` block instead of
 * pointing at `OG_IMAGE` - exactly the mistake `config/og.ts` was written to
 * stop, and one that shows up only in built HTML. So this end is read from
 * the prerender and the capture rather than from any literal in the tree.
 *
 * Pages with no og:image at all are not a failure: the `noindex` pages carry
 * no head metadata by design and `page-head.test.mts` owns that. The floor is
 * what stops this narrowing to nothing the day the extraction breaks.
 */
test("every head states the card's own four facts", () => {
  const pages = sweptPages();
  if (!pages.length) return; // no build; the other sweeps report the skip

  const src = sourceOf(CARD);
  const size = /export const size\s*=\s*\{\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/.exec(src)!;
  const want = {
    "og:image:alt": exportedString("alt"),
    "og:image:width": size[1]!,
    "og:image:height": size[2]!,
    "og:image:type": exportedString("contentType"),
    "twitter:image:alt": exportedString("alt"),
  };

  const bad: string[] = [];
  let checked = 0;
  for (const { page, html } of pages) {
    const head = /<head>[\s\S]*?<\/head>/.exec(html)?.[0] ?? "";
    if (!/<meta property="og:image" content=/.test(head)) continue;
    checked++;
    for (const [key, value] of Object.entries(want)) {
      const m = new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`).exec(head);
      if (!m) bad.push(`${page}: no ${key}`);
      else if (m[1] !== value) bad.push(`${page}: ${key} is ${JSON.stringify(m[1])}, the card says ${JSON.stringify(value)}`);
    }
  }

  assert.ok(checked > 10, `only ${checked} of ${pages.length} swept pages carry an og:image - the sweep has narrowed`);
  assert.deepEqual(bad, [], bad.join("\n"));
});

/**
 * One design in one file, still.
 *
 * X reads `twitter:image` and does not fall back to `og:image`, so the card is
 * served twice. `twitter-image.tsx` re-exports the Open Graph module rather
 * than repeating it, and its own header claims that means "the two can never
 * drift" - which is true of the re-export and says nothing about a future file
 * that redefines the card instead. Measured on 20 Sep 2026: both routes return
 * the same 35,820 bytes.
 *
 * Asserted on the import rather than on the exported names, because a module
 * that re-exported the names while defining its own default is the shape that
 * would pass a names check and serve a different picture.
 */
/**
 * Asked of this file the moment it went green, which is when its denominator
 * is still in your head and before it reads like a reasonable sweep with a
 * reason beside it.
 *
 * Everything above names `src/app/opengraph-image.tsx` by hand, while the
 * header claims to cover "the one published surface that is not text". Those
 * are not the same set. Next resolves the image conventions per route segment:
 * `src/app/blog/opengraph-image.tsx` would be a second card, shipped on every
 * share of the writing index, drawn by a file none of the rules above opens.
 * The claim would still read as true and the walk would never have gone near
 * it - `spend-gates` all over again, one tree down.
 *
 * So the denominator is derived rather than assumed. There is one card and one
 * re-export today; a third file means this file has to grow to meet it, and
 * the failure says so rather than leaving the new card unread. The rules above
 * are not looped over the set on purpose - they parse this card's own lockup
 * and headline, and a second card would have its own markup and want its own
 * assertions, not these ones pointed at a shape they were not written for.
 */
test("the root card is the only card, so the denominator above is the whole set", () => {
  const found: string[] = [];
  (function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (/^(opengraph|twitter)-image\.[jt]sx?$/.test(entry.name)) {
        found.push(relative(ROOT, child).split(sep).join("/"));
      }
    }
  })(join(ROOT, "src", "app"));

  assert.deepEqual(
    found.sort(),
    [CARD, TWITTER].sort(),
    "a share card exists that nothing in this file reads - widen the rules above to cover it, " +
      "or say here why it needs none",
  );
});

test("twitter-image re-exports the card rather than redefining it", () => {
  const src = sourceOf(TWITTER);
  assert.match(
    src,
    /import Image[^;]*from "\.\/opengraph-image"/,
    "twitter-image.tsx no longer imports the Open Graph card - the two can now drift",
  );
  assert.match(src, /export default Image/, "twitter-image.tsx no longer serves the Open Graph card as its default");
  assert.ok(
    !/ImageResponse/.test(src),
    "twitter-image.tsx draws its own card - there are now two designs where the header promises one",
  );
});
