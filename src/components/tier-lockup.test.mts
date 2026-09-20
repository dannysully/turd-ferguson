import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { splitTierNames } from "../lib/tier-text.ts";

/**
 * A tier name that reaches the page as a plain word rather than as the lockup.
 *
 * ## Why the existing sweep could not see this
 *
 * `copy.test.mts` checks that a tier name is spelled correctly - lowercase,
 * unbroken, never `AlwaysCited`. Every instance this test was written for
 * passed that check, because they were all spelled perfectly. What none of them
 * did was render through `TierName`, and spelling is not the rule AGENTS.md
 * states: "Render them with the `TierName` component, which colours the accent
 * half in `--brand-purple` to match the logo lockup."
 *
 * That is the failure this repo keeps finding one level up - a check that
 * passes for a reason next to the one it claims. A grep for the word says the
 * copy is right. It cannot say the word was rendered.
 *
 * ## Why it reads the prerender rather than the source
 *
 * Because the source cannot answer it. `PackagePage` takes four prose props
 * and puts three of them through `TierText`; a string handed to the fourth is
 * a bare word on the page and an identical string literal in the file. The
 * only place the two are distinguishable is the rendered output, where a
 * lockup is two spans and a bare name is text.
 *
 * It is also what caught the live ones: five in the three blog posts and one
 * attribution on the homepage, none of which a source sweep would have ranked
 * above the dozens of legitimate mentions in comments and metadata.
 *
 * ## What is deliberately not a hit
 *
 * The matcher is `splitTierNames`, the same function `TierText` uses to decide
 * what to convert. That is the point rather than a shortcut: the question this
 * test asks is "would the component have made a lockup out of this text", and
 * there is exactly one correct answer to it. Asking it with a second,
 * hand-written regex is how the test and the component come to disagree about
 * `alwayscited.com`.
 *
 * The narrowing that buys is real and is already proved in `tier-text.test.mts`
 * rather than here: a name preceded by a slash, a dot or a word character is a
 * URL or a slug, and one followed by `.` plus a letter is the company's domain.
 * `hello@alwayscited.com` in the footer of all 22 pages is excluded by the
 * second of those, not by an exemption list someone has to maintain.
 *
 * Two things are stripped before the text is read, and both are contexts
 * AGENTS.md names as taking `TIER_PLAIN`:
 *
 *  - `<head>`, `<script>` and every tag's attributes. Title tags, meta
 *    descriptions, OG values, canonicals, `alt`, `aria-label`, `href` and
 *    JSON-LD all live there, and every one of them strips colour.
 *  - anything inside `.sr-only`. It is read aloud, never painted, so a lockup
 *    in it would be markup no one can perceive. `TierJourney` has one and it
 *    correctly uses `TIER_PLAIN.everywhere`. This is the same false positive
 *    the design review hit from the other direction on 20 Sep, where an
 *    `.sr-only` paragraph was flagged for contrast.
 */

const HERE = join(fileURLToPath(import.meta.url), "..");
const PRERENDER = join(HERE, "..", "..", ".next", "server", "app");

/** The lockup as `TierName` renders it: a stem and an accent span inside one span. */
const LOCKUP = /<span class="tier-name">[\s\S]*?<\/span><\/span>/g;
const SR_ONLY = /<(\w+)[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>[\s\S]*?<\/\1>/g;
const HEAD = /<head>[\s\S]*?<\/head>/g;
const SCRIPT = /<script[\s\S]*?<\/script>/g;

/**
 * The text a reader actually sees, with every plain-text context removed.
 *
 * Tags collapse to a space rather than to nothing, so two words either side of
 * a stripped element cannot be joined into a name that was never written.
 */
export function visibleText(html: string): string {
  return html
    .replace(HEAD, " ")
    .replace(SCRIPT, " ")
    .replace(LOCKUP, " ")
    .replace(SR_ONLY, " ")
    .replace(/<[^>]*>/g, " ");
}

/** Every tier name left in that text, which should be none. */
export function bareTierNames(html: string): string[] {
  return splitTierNames(visibleText(html))
    .flatMap((seg) => ("tier" in seg ? [seg.tier] : []));
}

function prerenderedPages(): { page: string; html: string }[] {
  const out: { page: string; html: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) {
        out.push({ page: relative(PRERENDER, full).split(sep).join("/"), html: readFileSync(full, "utf8") });
      }
    }
  };
  walk(PRERENDER);
  return out;
}

/**
 * The guard the sweeps in this tree learned the hard way, at `75ff8d6`.
 *
 * A clean build makes the list below empty and so does a detector that has
 * stopped matching - which is the state every digit-only question-count sweep
 * was in with respect to the word "fourteen". So the detector is shown finding
 * a bare name, and shown *not* finding the three shapes that are allowed,
 * before an empty result from it is believed.
 */
test("the lockup sweep can still see a bare tier name, and still ignores the legal ones", () => {
  assert.deepEqual(
    bareTierNames("<p>This is why alwayscited operates on retainer.</p>"),
    ["cited"],
    "the detector no longer sees a bare tier name in body copy",
  );

  assert.deepEqual(
    bareTierNames('<span class="tier-name">always<span class="tier-name__accent">cited</span></span>'),
    [],
    "a rendered lockup must not read as a bare name",
  );

  assert.deepEqual(
    bareTierNames("<p>Email hello@alwayscited.com for a reply.</p>"),
    [],
    "the company domain is a URL context and is not a lockup",
  );

  assert.deepEqual(
    bareTierNames('<p class="sr-only">alwayseverywhere covers every channel listed above.</p>'),
    [],
    "sr-only text is never painted, so a lockup in it would be imperceptible",
  );

  // A qualifier stays plain text after the word, which is what TierName's own
  // `qualifier` prop does with it - so "pro" here must not make this a miss.
  assert.deepEqual(
    bareTierNames("<p>The alwaystracked pro plan.</p>"),
    ["tracked"],
    "a qualifier must not hide the name in front of it",
  );
});

test("no shipped page renders a tier name as a plain word", (t) => {
  if (!existsSync(PRERENDER)) {
    // Skipped rather than passed. `npm run build` runs before the tests on
    // every push, so this is live there; a clean checkout with no build must
    // not fail, and must not quietly report success either.
    t.skip("no prerendered build to read - run `npm run build` first");
    return;
  }

  const pages = prerenderedPages();
  assert.ok(pages.length >= 20, `expected the whole site prerendered, walked ${pages.length} pages`);

  const hits = pages.flatMap(({ page, html }) =>
    bareTierNames(html).map((tier) => ({ page, tier })),
  );

  // The counterpart to the guard above, on real input rather than on text
  // written here: a build in which no page renders a lockup at all would make
  // the assertion below pass while proving the opposite of what it claims.
  const lockups = pages.reduce((n, { html }) => n + [...html.matchAll(LOCKUP)].length, 0);
  assert.ok(lockups > 0, "no tier lockup anywhere in the build - TierName's markup has moved");

  t.diagnostic(`${pages.length} pages, ${lockups} lockups rendered, ${hits.length} bare`);

  assert.deepEqual(
    hits,
    [],
    "a tier name reached the page as a plain word - render it through TierName, or if the " +
      "context strips colour use TIER_PLAIN:\n" +
      hits.map((h) => `  ${h.page}: always${h.tier}`).join("\n"),
  );
});
