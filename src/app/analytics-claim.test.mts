import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

/**
 * The privacy policy makes a claim about this code, and this is the code.
 *
 * `/legal` tells anyone who reads it: "This site sets no cookies of its own and
 * runs no analytics - there is no Google Analytics, no tag manager, and no
 * advertising pixel." AGENTS.md is explicit that a statement about what we do
 * is not covered by "ship it rough", and the page's own header lists that
 * sentence among the facts "I checked in the code rather than one the board
 * asserted". It was checked once, by reading, in the way this queue keeps
 * recording as the thing that rots: true when typed, unfalsifiable afterwards.
 *
 * ## What is actually load-bearing, which is not the absence of code
 *
 * Two components call `track()`, which pushes to `window.dataLayer` - the
 * Google Tag Manager data layer. The claim survives that because the push is
 * guarded on a container that already exists: with no GTM snippet on the page,
 * `window.dataLayer` is undefined, the guard is false, and nothing is recorded
 * or queued. So the sentence is true by one `Array.isArray` and a missing
 * script tag, and neither was held by anything.
 *
 * Three ways it could quietly stop being true, and this file is each of them:
 *
 *   1. somebody loads an analytics or tag-manager script. `route-closure`
 *      would make them add the origin to the CSP and then pass - it asks
 *      whether an origin is *allowed*, never whether it should be there;
 *   2. somebody "tidies" the guard to `(w.dataLayer ||= []).push(...)`, the
 *      ordinary idiom, which buffers events for a container that has not
 *      arrived. That turns a no-op into a recording;
 *   3. somebody writes a third `track` somewhere else without the guard - and
 *      there were two byte-identical copies of it until 20 September 2026.
 *
 * ## What this does NOT decide
 *
 * Whether shipping dormant tag-manager instrumentation at all is compatible
 * with the sentence is a judgement about published copy, which is Danny's.
 * This file only holds the state as it is: if the answer is "take it out", the
 * `DATALAYER_WRITERS` list goes empty and these tests still pass.
 */

const HERE = fileURLToPath(import.meta.url);
const ROOT = join(HERE, "..", "..", "..");
const SRC = join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) walk(child, out);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) out.push(child);
  }
  return out;
}

const posix = (f: string) => relative(ROOT, f).split(sep).join("/");

/** Comments stripped, the way every sweep in this tree does it. */
const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Comments *and* string contents stripped, for the rules that ask whether the
 * code does something rather than whether a URL appears in it.
 *
 * Load-bearing and measured: the first draft matched `\bdataLayer\b` over
 * stripped comments only and reported `TierJourney.tsx` as a data layer writer.
 * It is a services list - "Tracking and analytics: GA4 and dataLayer, set up
 * properly" - which is the agency selling the thing this site does not do to
 * itself. A rule that cannot tell a sales line from a write would have been
 * "fixed" by exempting the file, and the exemption would have covered any real
 * write added to it later.
 */
const bare = (src: string) => code(src).replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');

const FILES = walk(SRC).map((f) => ({ file: posix(f), source: readFileSync(f, "utf8") }));

const LEGAL = join(SRC, "app/legal/page.tsx");

/**
 * The sentence, as a set of phrases rather than one string, so reflowing the
 * JSX does not fail this and rewording it does.
 */
const CLAIM = ["runs no analytics", "no tag manager", "no advertising pixel"];

test("the claim this file exists to hold is still on the page", () => {
  const legal = readFileSync(LEGAL, "utf8").replace(/\s+/g, " ");
  for (const phrase of CLAIM) {
    assert.ok(
      legal.includes(phrase),
      `/legal no longer says "${phrase}". If the claim was deliberately changed, change the rules below to match it - do not delete them, because the code they guard has not moved.`,
    );
  }
});

test("the file walk read the tree, so a zero below cannot pass as a clean sweep", () => {
  assert.ok(FILES.length >= 100, `the walk found only ${FILES.length} source files`);
  assert.ok(
    FILES.some((f) => f.file === "src/lib/analytics.ts"),
    "the walk cannot see lib/analytics.ts, which is the file every rule below is about",
  );
});

/**
 * Vendors whose script on the page would make the sentence false. Matched as
 * hostnames against off-origin URLs, not as bare words, so a page that
 * *mentions* Google Analytics in copy - `/legal` does, and TierJourney sells
 * GA4 setup as a service - is not a hit. That distinction is the whole reason
 * this is a URL check and not a grep.
 */
const ANALYTICS_HOSTS = [
  "googletagmanager.com",
  "google-analytics.com",
  "analytics.google.com",
  "connect.facebook.net",
  "static.ads-twitter.com",
  "snap.licdn.com",
  "plausible.io",
  "cdn.segment.com",
  "cdn.amplitude.com",
  "static.hotjar.com",
  "posthog.com",
  "matomo.cloud",
  "cdn.mxpnl.com",
];

test("no file loads an analytics, tag manager or pixel script", () => {
  const hits: string[] = [];
  for (const { file, source } of FILES) {
    for (const m of code(source).matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
      const host = m[1].toLowerCase();
      if (ANALYTICS_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) hits.push(`${file}  ${host}`);
    }
  }
  assert.deepEqual(
    hits,
    [],
    'these load a script /legal says this site does not load: "runs no analytics - there is no Google Analytics, no tag manager, and no advertising pixel". Adding the origin to the CSP satisfies route-closure and does not satisfy the privacy policy.',
  );
});

/**
 * The one module allowed to touch the data layer. A list rather than a single
 * name because the honest shape of this rule is "these, and argue for a
 * fourth" - and because it has to be able to go empty if the instrumentation
 * comes out.
 */
const DATALAYER_WRITERS = ["src/lib/analytics.ts"];

test("only one module touches the data layer", () => {
  const writers = FILES.filter(({ source }) => /\bdataLayer\b/.test(bare(source))).map((f) => f.file);
  assert.deepEqual(
    writers.sort(),
    [...DATALAYER_WRITERS].sort(),
    "a dataLayer write outside lib/analytics.ts. That module's guard is what makes the privacy policy true; a second copy without it is a site that starts collecting. There were two identical copies of it before 20 September 2026.",
  );
});

/**
 * The guard itself, read out of the source.
 *
 * Structural rather than behavioural on purpose, and the reason is the one
 * `constant-time.test.mts` records: the property is "nothing is buffered", and
 * a function that buffers returns exactly what a function that does not
 * returns - `undefined`, both times, with no container present. There is no
 * value to assert on. What differs is whether a global was created, and that
 * is visible in the source and nowhere else.
 */
test("the data layer is written only when a container already made it", () => {
  const source = code(readFileSync(join(SRC, "lib/analytics.ts"), "utf8"));
  assert.ok(
    /if\s*\(\s*Array\.isArray\(\s*w\.dataLayer\s*\)\s*\)\s*w\.dataLayer\.push\(/.test(source),
    "track() no longer pushes only into a dataLayer that already exists",
  );
  // The tidy-up that would break it, named so it fails loudly rather than as a
  // missing pattern: `||=`, `??=`, or a plain assignment that creates the array.
  assert.ok(
    !/w\.dataLayer\s*(?:\|\|=|\?\?=|=\s*(?:w\.dataLayer\s*\|\||\[))/.test(source),
    "track() creates the dataLayer if it is missing, which buffers a record of the visit for a container that has not loaded. /legal says this site runs no analytics; that version makes it false.",
  );
});

test("the rules can still tell the thing they forbid from the thing they allow", () => {
  // Proven in both directions against written instances, because four of this
  // repo's tripwires have passed by being blind.
  const host = (src: string) =>
    [...code(src).matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].some((m) =>
      ANALYTICS_HOSTS.some((h) => m[1].toLowerCase() === h || m[1].toLowerCase().endsWith(`.${h}`)),
    );
  assert.equal(host('const S = "https://www.googletagmanager.com/gtm.js?id=X";'), true);
  assert.equal(host('<p>there is no Google Analytics, no tag manager</p>'), false, "prose naming a vendor is not a script");
  assert.equal(host('note: "GA4 and dataLayer, set up properly"'), false, "a service we sell is not a script we load");
  assert.equal(host('const T = "https://challenges.cloudflare.com/turnstile/v0/api.js";'), false);
  // And that the comment strip does not excuse a real one.
  assert.equal(host('// https://www.google-analytics.com/analytics.js'), false, "a commented-out script is not loaded");

  // The data layer rule, both ways. The false case is the live one:
  // TierJourney sells GA4 setup and named `dataLayer` in a services list.
  const writes = (src: string) => /\bdataLayer\b/.test(bare(src));
  assert.equal(writes("if (Array.isArray(w.dataLayer)) w.dataLayer.push(x);"), true);
  assert.equal(writes('{ name: "Tracking and analytics", note: "GA4 and dataLayer, set up properly" }'), false);
  assert.equal(writes("/** pushes to window.dataLayer when a container exists */"), false, "prose about it is not a write");
});
