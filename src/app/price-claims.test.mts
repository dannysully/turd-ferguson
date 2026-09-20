import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { headClaims, pageText, schemaClaims, sweptPages, type Page } from "./dynamic-render.mts";
import { isPriceLabel } from "../config/price-label.ts";
import { TIER_PLAIN, type TierKey } from "../lib/tier-text.ts";

/**
 * What the site says about which of its own prices are published.
 *
 * `price-surfaces.test.mts` holds that every price in `pricing.ts` REACHES the
 * pages that quote it. That is a check about the figures, and it was right
 * about every figure it named. What nothing looked at is the sentence a page
 * writes ABOUT the set of figures - and four of those were false at once:
 *
 * - `/how-it-works`: "Every price is published, from tracking alone up to
 *   alwayseverywhere" - naming, as the top of the published range, the one
 *   tier whose price label is "Book a call". It sat in a section headed "What
 *   we will not put on this page", whose whole subject is not publishing what
 *   we cannot stand behind.
 * - The closing CTA, on `/how-it-works` and `/what-is-aeo`: "Placement counts,
 *   what each tier includes and what it costs are all published. If you want
 *   to buy, you do not need to speak to us first." The tier you would have to
 *   speak to us about is the one it was describing.
 * - The 404's tier link: "Four tiers, every price published on the page."
 * - `/what-is-aeo`'s pricing FAQ: "Ours are published rather than quoted."
 *
 * The site already carried the correction, on the tier's own page:
 * `/alwayseverywhere` says the number of brands and markets changes the work
 * "so we quote it rather than post a figure we would have to renegotiate". A
 * buyer could read that and "every price is published" on the same visit.
 *
 * **Both sides of every assertion below are derived from `pricing.ts`.** None
 * of them holds a copy of the sentence it is checking - a test that retyped
 * the clause would pass while the page said something else, which is the blind
 * shape the email palette test had. The config decides which tiers are priced;
 * the page has to agree with it.
 *
 * **Proved against eight injections, 8/8, by `docs/inject-price-claims.mjs`**
 * - the four original sentences put back one at a time, both directions of a
 * `basePrice`/`priceLabel` disagreement, the exception clause tidied off every
 * surface at once, and one green-expected case. Three findings from that run
 * are written into the code below rather than summarised here, because each is
 * a way this file was green over a tree carrying the defect:
 *
 * - the sentence splitter (block boundaries collapse, so a whole page read as
 *   four enormous runs),
 * - `contentOf` (the footer names all four tiers, so the one rule that
 *   REQUIRES a disclosure was satisfied on all 31 pages and could never fire),
 * - `UNIVERSAL_PRICE` (the loose trigger fired on two true sentences, found by
 *   the green case rather than by reading).
 *
 * The green case is not decoration and neither is the eighth: the disclosure
 * rule caught nothing until a case was built for it, and a guard with no
 * reachable effect is one this repo deletes rather than keeps. It earns its
 * place on the one regression no sentence-level rule can see - every sentence
 * still true on its own, and the page as a whole no longer saying what it
 * leaves out.
 */

const PRICING = "src/config/pricing.ts";

type ParsedTier = {
  id: string;
  /** Resolved through TIER_PLAIN, because the file writes `TIER_PLAIN.cited`. */
  plainName: string;
  /** null when the tier has no numeric price. */
  basePrice: number | null;
  priceLabel: string;
};

/**
 * Every tier's id, name, base price and label, read off the source.
 *
 * A `.mts` test cannot import `pricing.ts` - it imports through the `@/` alias
 * and Node's runner resolves neither that nor an extensionless specifier - so
 * this parses it, exactly as `price-surfaces.test.mts` does. The four fields
 * are captured as one ordered tuple inside a single tier object rather than as
 * four independent scans, so a tier missing one of them shortens the result
 * instead of silently pairing one tier's price with another tier's name.
 */
function parseTiers(source: string): ParsedTier[] {
  const re =
    /id:\s*"([^"]+)"[\s\S]*?plainName:\s*TIER_PLAIN\.(\w+)[\s\S]*?basePrice:\s*(null|\d+)[\s\S]*?priceLabel:\s*"([^"]+)"/g;
  return [...source.matchAll(re)].map((m) => ({
    id: m[1],
    plainName: TIER_PLAIN[m[2] as TierKey],
    basePrice: m[3] === "null" ? null : Number(m[3]),
    priceLabel: m[4],
  }));
}

const source = readFileSync(PRICING, "utf8");
const TIERS = parseTiers(source);
const PRICED = TIERS.filter((t) => t.basePrice !== null);
const QUOTED = TIERS.filter((t) => t.basePrice === null);
const DEAREST_PRICED = PRICED[PRICED.length - 1];
const pages: Page[] = sweptPages();

/**
 * Sentences, off the rendered page.
 *
 * The claims this file is about are made one sentence at a time - "Every price
 * is published, from tracking alone up to alwayseverywhere" is false inside its
 * own full stop - and a whole-page match would let a correct sentence elsewhere
 * answer for a wrong one here.
 *
 * **The second alternative is the whole reason this works.** `pageText` strips
 * tags to nothing rather than to a space, which it has to - a price is three
 * inline spans and a tier name is two, so spacing elements apart breaks both.
 * The cost is that BLOCK boundaries collapse too: two adjacent paragraphs
 * arrive as "...on the page.How it works..." with no whitespace at the join.
 * Splitting on `\s+` alone therefore returns four "sentences" for the whole 404
 * page, each an enormous run - and a run that long contains the footer
 * wordmark, so it satisfies any rule asking whether a sentence names a tier.
 * The 404's "Four tiers, every price published on the page" was MISSED exactly
 * that way on the first pass of the injection harness, and it was MISSED in the
 * flattering direction: the sweep was green over a page carrying the defect.
 *
 * **The head is in here too, added 20 Sep.** `pageText` strips whole tags, so a
 * meta description - which lives in an attribute - was outside every rule in
 * this file. Measured rather than assumed: a description carrying "Every price
 * is published, from tracking alone up to alwayseverywhere", the exact sentence
 * this file was written for, was injected into `compare.html`'s head and every
 * assertion here passed over it. Three of the three tier pages with a numeric
 * price put that price in their description as well, so it is the surface a
 * buyer reads first and it was the one surface nothing checked.
 *
 * **And the structured data, added the same day, one surface further out.**
 * `pageText` opens by dropping every `<script>` whole, so the `ld+json` blocks
 * were outside this file for exactly the reason the head was: not by a
 * judgement anybody made, but by the shape of the strip. On a product that
 * sells being read by answer engines, that is the worst surface of the three
 * to be blind to. See `schemaClaims` for why it is prohibitions only and why
 * the script strip itself must stay.
 *
 * The prohibitions take the head and the schema. `contentOf` below, which
 * serves the single rule that REQUIRES a disclosure, deliberately takes
 * neither - a description holds at most one price label, so it can never carry
 * "the whole priced list", and widening a requirement is how that rule became
 * unfireable the first time.
 */
function sentencesOf(page: Page): string[] {
  return [
    ...splitSentences(pageText(page.html)),
    ...headClaims(page.html).flatMap(splitSentences),
    ...schemaClaims(page.html).flatMap(splitSentences),
  ];
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!])\s+|(?<=[.?!])(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The page without its site chrome.
 *
 * Used by the one rule below that REQUIRES something to be said, and by no
 * other. The distinction is the point and it cost a blind check to find:
 *
 * **A prohibition should read the whole page; a requirement must read only the
 * page's own content.** Chrome appears on every page, so anything in it
 * satisfies a requirement everywhere at once - the footer lists all four tier
 * names as plan links, which meant "this page must mention the quoted tier"
 * was true on all 31 pages before a word of copy was written. That rule could
 * never have fired. The other direction is safe and wider is better there: a
 * false claim in the footer is still a false claim, so the prohibitions keep
 * the chrome in their denominator.
 *
 * There is exactly one `<header>` and one `<footer>` in the shipped markup;
 * `<main>` is not usable for this because it occurs twice on some pages.
 */
function contentOf(page: Page): string {
  return pageText(
    page.html.replace(/<header[\s\S]*?<\/header>/gi, "").replace(/<footer[\s\S]*?<\/footer>/gi, ""),
  ).replace(/\s+/g, " ");
}

/** Whether the cut above found anything to cut. Asserted over the SET rather
 *  than per page: `_global-error.html` renders its own minimal document with
 *  no chrome at all, and that is correct rather than a moved footer. */
function hasChrome(page: Page): boolean {
  return /<footer[\s>]/i.test(page.html) || /<header[\s>]/i.test(page.html);
}

/** A sentence claiming something is published. Deliberately not "posted": the
 *  one true sentence on this subject says we "post a figure" in the negative. */
const PUBLISHES = /\bpublished\b|\bpublishes\b|\bpublish\b/i;

/**
 * A universal quantifier that actually governs the PRICES.
 *
 * The loose version of this - a quantifier anywhere in the sentence and a price
 * word anywhere else - was written first and it fired on two sentences that are
 * true. "What each tier includes is published either way, and buying a
 * published price does not need a call" quantifies over what a tier *includes*,
 * not over the prices; and the 404's link label merges into the sentence after
 * it, so "What each tier costs" supplied a quantifier to "3 prices published on
 * the page", which is the opposite of a universal claim. Both were found by the
 * green-expected case in the injection harness rather than by reading, which is
 * what that case is for: a prohibition nobody can satisfy is as useless as one
 * nothing trips, and only a case expected to stay green can tell you which you
 * have written.
 *
 * So the quantifier has to be adjacent to the noun it quantifies. All four of
 * the sentences this file was written for still match.
 */
const UNIVERSAL_PRICE =
  /\b(?:every|each)\s+price\b|\ball\s+(?:the\s+)?prices\b|\b(?:prices|costs)\s+are\s+all\b/i;

/** Looser, for the placement-count rule, which is already narrowed by its noun. */
const UNIVERSAL = /\bevery\b|\ball\b|\beach\b/i;

test("the parse reads every tier the file declares, so this file cannot go blind", () => {
  const declared = (source.match(/^\s{4}priceLabel:/gm) ?? []).length;
  assert.ok(declared > 0, "no priceLabel in " + PRICING + " - the parse, not the file, is what changed");
  assert.equal(TIERS.length, declared, "the parse found " + TIERS.length + " tiers where the file declares " + declared);
  assert.equal(new Set(TIERS.map((t) => t.id)).size, TIERS.length, "two tiers parsed with the same id");
  for (const t of TIERS) {
    assert.ok(t.plainName, t.id + " has no plainName - TIER_PLAIN does not carry the key the file names");
  }
});

test("the pages this checks against were actually built", () => {
  assert.ok(pages.length > 15, "no build to read - run `npm run build` then `npm run capture`");
});

test("the chrome cut still finds chrome, so the disclosure rule is not reading whole pages", () => {
  /**
   * The floor under `contentOf`. If `<header>` and `<footer>` ever stop being
   * the markup the layout emits, the cut silently becomes a no-op and the one
   * rule that requires a disclosure goes back to being satisfied by the footer
   * on every page at once - which is how it was written, and it could never
   * have fired. Asserted over the set because one page legitimately has no
   * chrome: `_global-error.html` renders its own minimal document.
   */
  const withChrome = pages.filter(hasChrome);
  assert.ok(
    withChrome.length > pages.length - 3,
    "only " + withChrome.length + " of " + pages.length + " pages carry a <header> or <footer> - the chrome has moved",
  );
  const cut = withChrome.filter((p) => contentOf(p).length < pageText(p.html).replace(/\s+/g, " ").length);
  assert.equal(cut.length, withChrome.length, "the chrome cut removed nothing from a page that has chrome");
});

test("the two readers of 'has a price' agree with each other", () => {
  /**
   * `basePrice === null` is what `priceProse` and `PackagePage`'s
   * `serviceSchema` branch on; `isPriceLabel` is what decides the type size on
   * the card, and it tests for a currency mark rather than a digit. Nothing
   * held them in agreement, and they can disagree in both directions: a tier
   * given a `basePrice` while its label still reads "Book a call" renders an
   * Offer node for a price the card does not show, and a tier whose label
   * gains a figure while `basePrice` stays null publishes a price that the
   * clauses below still describe as quoted.
   */
  const disagree = TIERS.filter((t) => (t.basePrice !== null) !== isPriceLabel(t.priceLabel));
  assert.deepEqual(
    disagree.map((t) => t.id + " (basePrice " + t.basePrice + ", label " + JSON.stringify(t.priceLabel) + ")"),
    [],
    "basePrice and isPriceLabel disagree about whether this tier has a price",
  );
});

test("this check is not vacuous - the tiers split into priced and quoted", () => {
  /**
   * Every assertion below is about the boundary between the two sets. If one
   * set empties, the interesting cases stop existing and this file would pass
   * over a site that says anything at all. It is a green-expected case in the
   * sense the inbox means: it proves the filter is load-bearing rather than
   * proving the copy is right.
   */
  assert.ok(PRICED.length > 0, "no tier has a numeric price, so no page may claim a published one at all");
  assert.ok(DEAREST_PRICED, "no dearest priced tier, so the range claim below has no boundary to name");
});

test("a universal claim about published prices names the tier the range stops at", () => {
  /**
   * The defect exactly. "Every price is published, from tracking alone up to
   * alwayseverywhere" is a universal claim whose stated boundary is a tier
   * with no price. The boundary is derived - it is the last entry of the
   * priced set, which `pricing.ts` documents as ascending - so this cannot be
   * satisfied by retyping a name here.
   *
   * When nothing is quoted the claim needs no boundary and the rule steps
   * aside, which is the two-way half: give `alwayseverywhere` a figure and the
   * site is free to say "every price" flat again.
   */
  if (QUOTED.length === 0) return;

  const bad: string[] = [];
  for (const p of pages) {
    for (const s of sentencesOf(p)) {
      if (!PUBLISHES.test(s) || !UNIVERSAL_PRICE.test(s)) continue;
      if (!s.includes(DEAREST_PRICED!.plainName)) bad.push(p.page + ": " + s);
    }
  }
  assert.deepEqual(
    bad,
    [],
    "a sentence claims every price is published without naming " +
      DEAREST_PRICED!.plainName +
      ", which is where the published range actually stops",
  );
});

test("no sentence puts a quoted tier inside a claim that prices are published", () => {
  /**
   * The same defect read the other way, and the sharper direction: the
   * original sentence did not merely omit the boundary, it named the quoted
   * tier AS the boundary. Kept separate from the assertion above because two
   * properties under one `test()` destroy the only column that matters - the
   * harness reports which named subtest fired, and a case landing in the wrong
   * branch would otherwise be indistinguishable from one landing in the right
   * one.
   */
  const bad: string[] = [];
  for (const p of pages) {
    for (const s of sentencesOf(p)) {
      if (!PUBLISHES.test(s)) continue;
      for (const q of QUOTED) {
        if (s.includes(q.plainName)) bad.push(p.page + " [" + q.id + "]: " + s);
      }
    }
  }
  assert.deepEqual(bad, [], "a quoted tier is named in a sentence about prices being published");
});

test("a page that quotes the whole priced list says which tier is not in it", () => {
  /**
   * The one the two rules above cannot see. `/what-is-aeo`'s pricing FAQ
   * opened "Ours are published rather than quoted." - no universal quantifier,
   * no price word, no tier name, and false. What makes it findable is not the
   * sentence but the page: that answer recites every priced label the business
   * has, so it is presenting itself as the whole price list, and a whole price
   * list that never mentions the tier it omits is the overclaim however the
   * sentence around it is phrased.
   *
   * The trigger is derived - it fires on a page carrying every priced tier's
   * label - so a page quoting one price is not asked to disclose anything, and
   * a fifth priced tier raises the bar on its own.
   */
  if (QUOTED.length === 0) return;
  assert.ok(PRICED.length > 1, "one priced tier makes 'the whole list' meaningless - this rule needs at least two");

  const checked: string[] = [];
  const bad: string[] = [];
  for (const p of pages) {
    const body = contentOf(p);
    if (!PRICED.every((t) => body.includes(t.priceLabel))) continue;
    checked.push(p.page);
    const undisclosed = QUOTED.filter((q) => !body.includes(q.plainName));
    for (const q of undisclosed) bad.push(p.page + " omits " + q.plainName);
  }
  assert.ok(checked.length > 0, "no page carries the whole priced list, so this rule is vacuous - find the list or delete it");
  assert.deepEqual(bad, [], "a page quoting every published price does not mention the tier whose price is a call");
});

test("a sentence contrasting published with quoted names the tier that is quoted", () => {
  /**
   * The shape the three rules above cannot see, and the one the pricing FAQ
   * actually used: "Ours are published rather than quoted." No quantifier, no
   * price word, no tier name - and false. Its subject is the question it
   * answers ("What does it cost?"), which lives in a different element, so
   * nothing inside the sentence says what it is about.
   *
   * What it does carry is the contrast itself. A sentence that mentions both
   * publishing and quoting is setting one against the other, and on this site
   * the answer is "both, and here is the line between them" - so it has to say
   * which tier falls on the quoted side. The required half is derived from
   * `pricing.ts`; only the two verbs are typed, and they are the two verbs the
   * claim is made of.
   *
   * It deliberately does NOT fire on a sentence that only says we quote:
   * `/alwayseverywhere` explains that the work "costs" vary "so we quote it
   * rather than post a figure", with the tier named by the page rather than by
   * the sentence. That is true, it is the sentence this whole file vindicates,
   * and a rule that failed it would be a rule against saying the right thing.
   */
  if (QUOTED.length === 0) return;

  const bad: string[] = [];
  for (const p of pages) {
    for (const s of sentencesOf(p)) {
      if (!PUBLISHES.test(s) || !/\bquote[ds]?\b|\bquoting\b/i.test(s)) continue;
      if (!QUOTED.some((q) => s.includes(q.plainName))) bad.push(p.page + ": " + s);
    }
  }
  assert.deepEqual(
    bad,
    [],
    "a sentence sets published against quoted without saying which tier is quoted - name " +
      QUOTED.map((q) => q.plainName).join(", "),
  );
});

test("no page claims the placement counts are all published", () => {
  /**
   * The other half of the closing CTA's sentence, and the one with no config
   * to derive from. A placement count is a line inside a tier's `includes`
   * array, not a field - one tier of four states one, and `pricing.ts`'s own
   * header records the alwayscited figure as outstanding on D1, "omitted
   * rather than guessed". So this is a typed negative, which is what belongs
   * in a test rather than in prose: the claim cannot be true until that
   * decision lands, and the sentence that made it is the kind that comes back.
   *
   * Narrow on purpose. It fires on a universal claim about placement counts
   * being published, not on `/alwaysmentioned` stating its own three.
   */
  const bad: string[] = [];
  for (const p of pages) {
    for (const s of sentencesOf(p)) {
      if (!PUBLISHES.test(s) || !UNIVERSAL.test(s)) continue;
      if (/placement counts?/i.test(s)) bad.push(p.page + ": " + s);
    }
  }
  assert.deepEqual(bad, [], "a page claims the placement counts are published; one tier of four states one");
});
