import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { code, sourceFiles } from "../source-read.mts";
import { normaliseTopicVariants } from "./topic-variants.ts";

/**
 * One normaliser for `topic_variants`, and every door onto the column uses it.
 *
 * ## The defect this closes
 *
 * Three doors write `scans.topic_variants` and each sanitised it differently:
 *
 * | door | trims + lowercases | bounds | caps | drops the topic | dedupes |
 * |---|---|---|---|---|---|
 * | `/api/scan/start` | no | no | no | no | no |
 * | `/api/scan/[token]/confirm` | yes | yes | yes | **no** | **no** |
 * | `/api/scan/[token]/questions` | yes | yes | yes | yes | **no** |
 *
 * The middle row is the species this queue has now paid for THIRTEEN times: a
 * check that is right about everything it names, looking one way down a two-way
 * street. `questions` carries a comment explaining exactly why a variant equal
 * to the topic has to go - "one chip too many on the screen... a dead control
 * on the first screen of the funnel" - and `confirm` is the route that writes
 * the value the comment calls "the trusted set from here". The fix landed on
 * the screen that renders the chips and never on the route that persists them.
 *
 * Nothing deduped at all, which no door had. `/questions` returns
 * `clusters: [topic, ...variants]` and `ConfirmScreen` renders `clusters.map`
 * with `key={c}`, so one repeated string is: two chips under **one React key**,
 * both wired to `toggle(c)` on the same cluster so they light and unlight
 * together, both showing the same count, while the footer's `keptClusters` is a
 * `Set` and says one cluster. Two controls that are one control.
 *
 * ## Why it is reachable without an edited payload
 *
 * `/api/scan/start` stores `read.topic_variants` raw - straight off the model,
 * which is handed `suggested_topic` and asked for "up to 5 ways buyers phrase
 * this category". A model returning the category itself as one of its own
 * variants, or the same phrase twice in different case, is the ordinary failure
 * that comment was written about. That row is then what `ScanFlow` posts back
 * to `/confirm`, so the raw list reaches the door that folds the least.
 *
 * ## Why the cap travels as an argument
 *
 * `TOPIC_VARIANT_COUNT` lives in `anthropic.ts`, which opens with
 * `import "server-only"` and so cannot be loaded by `node --test`. Splitting a
 * twelfth module for one number buys less than passing it, and the walk below
 * asserts every call site passes that same constant rather than a digit - which
 * is the half a behavioural test cannot see.
 *
 * ## What this walk cannot see, asked while the denominator is fresh
 *
 * - **A writer outside `src/app/api/`.** The walk is bounded to routes, which
 *   is the `spend-gates` weakness exactly: two `"use server"` actions bill a
 *   vendor and are not `route.ts`. There is no server action touching this
 *   column today, so widening it now would be decoration - but a door added
 *   as an action is invisible here, and that is the shape to check first.
 * - **A READER of the stored column.** `src/app/scan/[token]/page.tsx` selects
 *   `topic_variants` and hands it to `ScanFlow`, which posts it back to
 *   `/confirm`. It is deliberately not required to normalise: rows written
 *   before this commit carry the raw model list, and the two doors that render
 *   or persist them both clean now, so the old rows come good on the way
 *   through rather than needing a backfill. Nothing renders the column without
 *   passing it through `/questions` first.
 * - **Whether the CLEANING is right**, only that one function does it. That is
 *   the behavioural half above, and the two are deliberately separate rules.
 */

const ROOT = new URL("../../../", import.meta.url).pathname;
const LIMITS = { min: 2, max: 80, cap: 5 };

// ------------------------------------------------------------- the behaviour

test("a variant equal to the topic is dropped, whatever its case or padding", () => {
  // The defect `/questions` was fixed for and `/confirm` was not.
  const out = normaliseTopicVariants("B2B SEO agency", ["  B2B SEO Agency ", "seo for saas"], LIMITS);
  assert.deepEqual(out, ["seo for saas"]);
});

test("two variants that differ only by case collapse to one", () => {
  const out = normaliseTopicVariants("plumbing", ["Local Plumber", "local plumber"], LIMITS);
  assert.deepEqual(out, ["local plumber"]);
});

test("the first spelling wins and order is otherwise kept", () => {
  /**
   * Order is what the chip row renders in, so a normaliser that sorted would
   * reorder the screen the visitor is reading. First-wins is also what makes
   * the dedupe invisible when there is nothing to dedupe.
   */
  // Two characters minimum, per SCAN_LIMITS.topicVariant - a one-character
  // fixture is dropped by the bound and proves nothing about ordering.
  const out = normaliseTopicVariants("plumbing", ["bb", "aa", "bb", "cc"], LIMITS);
  assert.deepEqual(out, ["bb", "aa", "cc"]);
});

test("deduping happens before the cap, not after", () => {
  /**
   * The ordering is the whole value of doing this in one place. Capping first
   * lets three duplicates eat three of the five slots and silently narrows the
   * spread the visitor confirmed - the same "confirms seven chips and the scan
   * runs five" failure `/confirm` already carries a comment about, arriving
   * from the other end.
   */
  const out = normaliseTopicVariants("tt", ["aa", "aa", "aa", "bb", "cc", "dd", "ee"], LIMITS);
  assert.deepEqual(out, ["aa", "bb", "cc", "dd", "ee"]);
});

test("anything that is not a usable string is dropped", () => {
  const out = normaliseTopicVariants("t", ["ok", 7, null, undefined, "", "   ", "x", "y".repeat(81)], LIMITS);
  assert.deepEqual(out, ["ok"]);
});

test("a supplied value that is not an array is nothing, not a throw", () => {
  // Both routes take this straight off a JSON body, so every shape arrives.
  assert.deepEqual(normaliseTopicVariants("t", undefined, LIMITS), []);
  assert.deepEqual(normaliseTopicVariants("t", "a,b", LIMITS), []);
  assert.deepEqual(normaliseTopicVariants("t", null, LIMITS), []);
});

test("a null topic folds nothing but still dedupes", () => {
  /**
   * `/api/scan/start` stores a null topic when the model's confidence is low,
   * and the visitor types their own. Dropping a variant for matching a topic
   * that is not on the row would lose a real one, so the fold is conditional
   * and the dedupe is not.
   */
  assert.deepEqual(normaliseTopicVariants(null, ["aa", "AA", "bb"], LIMITS), ["aa", "bb"]);
});

// ------------------------------------------------------------ the reader walk

/**
 * Every file that reads or writes the column, derived off source.
 *
 * Written before the fix and run against the tree that carried it, per the
 * `1ff1336` rule: a value rule over a helper you have just written passes on
 * the defective tree because that tree never called it. This one failed on all
 * three doors first.
 */
function doorsOnto(field: string): string[] {
  return sourceFiles(ROOT).filter((f) => {
    if (!f.startsWith("src/app/api/")) return false;
    return new RegExp(`\\b${field}\\b`).test(code(readFileSync(ROOT + f, "utf8")));
  });
}

const DOORS = doorsOnto("topic_variants");

test("the walk can see the doors it is written about", () => {
  // A rename that empties this makes every rule below it pass on nothing.
  assert.ok(DOORS.length >= 3, `expected at least 3 API doors onto topic_variants, found ${DOORS.length}`);
});

test("every API door onto topic_variants normalises through the one function", () => {
  /**
   * The rule that would have caught this. Not "the routes agree with each
   * other" - they cannot be compared without re-implementing both - but that
   * each reaches the single place the decision lives, which is the only form
   * that survives a fourth door being added.
   */
  const bare: string[] = [];
  for (const file of DOORS) {
    const body = code(readFileSync(ROOT + file, "utf8"));
    if (!/normaliseTopicVariants\s*\(/.test(body)) bare.push(file);
  }
  assert.deepEqual(
    bare,
    [],
    "an API door reads or writes topic_variants without going through normaliseTopicVariants.\n" +
      "Each door sanitising the column its own way is what left `confirm` storing a variant\n" +
      "identical to the topic, and left every door storing duplicates of each other.",
  );
});

test("every call site passes the shared cap rather than a number", () => {
  /**
   * `TOPIC_VARIANT_COUNT` is also what the model is *asked* for, so a door that
   * types its own digit goes on silently dropping everything past the fifth the
   * day somebody widens the spread - which is the failure `/confirm`'s own
   * header already describes. Behaviourally invisible; readable here.
   */
  for (const file of DOORS) {
    const body = code(readFileSync(ROOT + file, "utf8"));
    const call = /normaliseTopicVariants\s*\(([\s\S]*?)\)\s*;/.exec(body);
    assert.ok(call, `${file}: normaliseTopicVariants is referenced but not called`);
    assert.match(
      call[1]!,
      /TOPIC_VARIANT_COUNT/,
      `${file}: the variant cap is typed rather than read from TOPIC_VARIANT_COUNT`,
    );
    assert.match(
      call[1]!,
      /SCAN_LIMITS\.topicVariant/,
      `${file}: the length bounds are typed rather than read from SCAN_LIMITS.topicVariant`,
    );
  }
});
