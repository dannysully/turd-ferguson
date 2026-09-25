import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { code } from "../source-read.mts";
import { RUN_STEPS } from "./run-steps.ts";

/**
 * The two changes Danny asked for on 20 September 2026 (item 3), held as
 * properties rather than as a diff.
 *
 * `pipeline.ts` opens with `import "server-only"`, so node's runner cannot load
 * it and nothing here can execute a pass. That is the constraint, not an
 * excuse: every rule below is a fact about the source that a behavioural test
 * could not reach anyway, because what is being asserted is *where* a call
 * sits, and where a call sits is invisible to every assertion on a return
 * value - the same thing `retry-policy.test.mts` records about a counter.
 *
 * ## The defect that was found by hand while making this change
 *
 * Moving `classifySources` into `readAndStore` - so it overlaps the brand chain
 * instead of queueing behind it - left the gated pass calling it a second time,
 * four hundred lines away in a different function. Not a wrong label: a
 * duplicate paid model call on the pass `spend.ts` calls the biggest single
 * spender in the system, swallowed by a never-fatal catch and visible only as a
 * number on a day ceiling. Nothing in the tree could have told you.
 *
 * Rule 1 is that defect. It is written against the call count rather than
 * against either call site, because naming a site is naming the one you already
 * know about.
 */

const SRC = new URL("../..", import.meta.url).pathname;
const PIPELINE = "lib/scan/pipeline.ts";

/**
 * Comments stripped before anything is matched, and load-bearing here rather
 * than by habit: every rule below describes work this file's own doc comments
 * discuss by name, and `pipeline.ts` now carries a paragraph explaining that
 * the duplicate `classifySources` call was removed. A sweep that read prose
 * would count the record of the fix as the fix's absence.
 */
function pipeline(): string {
  return code(readFileSync(join(SRC, PIPELINE), "utf8"));
}

/**
 * The floor every source sweep in this tree keeps. A strip that ate the file
 * turns each rule below into a match against an empty string, which passes, and
 * reads exactly like a pipeline with none of these defects.
 */
test("the pipeline source is actually being read", () => {
  const src = pipeline();
  assert.ok(src.length > 20_000, `pipeline.ts read back as ${src.length} chars - the comment strip ate it`);
  assert.match(src, /export async function runScan/, "runScan is not in what was read");
  assert.match(src, /export async function runGatedScan/, "runGatedScan is not in what was read");
});

/**
 * One classification per pass, not two.
 *
 * `classifySources` is started inside `readAndStore`, which both passes call,
 * so a second call anywhere in this file is that work run twice over the same
 * rows. Counted rather than pattern-matched against a known-bad line: the
 * import is excluded by requiring an opening paren, and a definition is not a
 * call - `pipeline.ts` does not declare it, but the rule says so anyway,
 * because that is the distinction `engine-list-readers` had to learn.
 */
test("classifySources is called exactly once in the pipeline", () => {
  const calls = [...pipeline().matchAll(/\bclassifySources\s*\(/g)];
  assert.equal(
    calls.length,
    1,
    `classifySources is called ${calls.length} times. It runs inside readAndStore, which both the free ` +
      `pass and the gated pass go through, so a second call is the same paid model work run twice over ` +
      `the same citation rows - absorbed by a never-fatal catch and visible only on a day ceiling`,
  );
});

/**
 * And that the one call is the un-chained one.
 *
 * The point of the move is that it starts when the rows it reads are stored and
 * is awaited later, so it overlaps `extractBrands` and `classifyBrands` instead
 * of following them. `await classifySources(...)` would put it back in the line
 * while leaving rule 1 perfectly green - the count is right and the concurrency
 * is gone. That is the shape this rule exists for.
 *
 * Moved 25 Sep 2026 (N9): its reads still overlap the brand chain, but its
 * model call now waits on a `leaderboard` promise that is resolved once
 * `classifyBrands` has ruled. Without the judged competitors the classifier
 * put vendors' own blogs on the placement list. Still started, not awaited in
 * line - `source-kind-prompt.test.mts` holds the hand-off.
 */
test("the source classification is started, not awaited in line", () => {
  const src = pipeline();
  assert.ok(
    !/\bawait\s+classifySources\s*\(/.test(src),
    "classifySources is awaited where it is called, which puts it back behind the brand chain. " +
      "It should be started when the citations are stored and awaited at the end of readAndStore",
  );
  assert.match(
    src,
    /classifySources\s*\([^)]*\)\s*\.then\(/,
    "the classifySources promise has no handler attached where it is created. An unawaited promise " +
      "that rejects before anything awaits it is an unhandled rejection, which can take the process " +
      "with it - the never-fatal wrapper has to be on the promise, not on the await further down",
  );
});

/**
 * Every exit of the free pass writes the timings.
 *
 * `billSpend` already keeps "one rule for every exit": a pass records what it
 * billed whether it returned or threw. Time is the same fact one column over,
 * and the failed exit is the one that matters more - a scan that died is
 * exactly the one where you want to know which phase it was in.
 *
 * The denominator is derived: every status write in the file is found by
 * matching the status literal, and each is required to carry `step_ms`. A typed
 * list of two would not notice a third exit being added, which is the failure
 * mode this repo has recorded more times than any other.
 *
 * **Word-bounded, and the first draft was not.** `gated_status` ends in
 * `status`, so a bare match pulled in the gated pass's three exits and reported
 * all five as bare. That is the third time in one sitting - `started_at` inside
 * `gated_started_at`, `search_volume` inside `ai_search_volume`, and now this.
 * The bound is the rule; the lesson is that this schema names its gated columns
 * by prefixing the free ones, so *every* column check in this file needs one.
 *
 * The gated exits are outside this on purpose rather than by accident of the
 * regex: one `scans` row would otherwise carry two passes' phases under one set
 * of keys and the second would overwrite the first. The gated pass logs its
 * timings instead, which rule 6's key check still covers.
 */
test("every status write on the free pass carries step_ms", () => {
  const src = pipeline();
  const exits = [...src.matchAll(/\.update\(\{[^}]*(?<![\w])status:\s*"(complete|failed)"[\s\S]{0,400}?\}\)/g)];
  assert.ok(exits.length >= 2, `only ${exits.length} free-pass status writes found - this rule has gone blind`);
  const bare = exits.filter((m) => !/step_ms/.test(m[0])).map((m) => m[1]);
  assert.deepEqual(
    bare,
    [],
    `these exits write a final status without step_ms, so a scan that took this path says nothing about ` +
      `where its time went. The failed exit is the one that matters most`,
  );
});

/**
 * `total` is wall clock, and it is not the sum of the phases.
 *
 * The phases deliberately do not tile the run - the database reads and writes
 * between them are untimed, and since this change `sources` *overlaps*
 * `extract` and `classify` rather than following them, so the parts can add up
 * to more than the whole. An operator comparing the two is reading exactly the
 * thing worth reading, and a `total` computed by summing would hide both facts
 * while looking more correct.
 *
 * Asserted on the shape because there is no return value to assert on: what is
 * being held is that `total` comes from a clock, never from a reduce over the
 * map it is being added to.
 */
test("the total is measured from a clock, never summed from the phases", () => {
  const src = pipeline();
  const seal = /function sealTimings\([\s\S]*?\n\}/.exec(src);
  assert.ok(seal, "sealTimings is gone - the timings reach the column some other way now");
  assert.match(
    seal[0],
    /total:\s*Date\.now\(\)\s*-\s*startedAt/,
    "sealTimings no longer takes `total` from the clock",
  );
  assert.ok(
    !/reduce|Object\.values/.test(seal[0]),
    "sealTimings sums the phases into `total`. They overlap and they do not tile the run, so the sum " +
      "is not the elapsed time and the gap between the two is the only reason to record both",
  );
});

/**
 * The phases are recorded through one helper, so a phase that throws still
 * records what it cost.
 *
 * A hand-written `const at = Date.now()` ... `t.x = Date.now() - at` pair around
 * a call records nothing when that call throws, which is precisely the run
 * worth looking at. `timed()` puts the write in a `finally`. This asserts the
 * helper still does that, and that the phases go through it rather than round
 * it - a bare `Date.now()` pair reintroduced beside one call would leave every
 * rule above green.
 */
test("every phase is timed through the helper, and the helper records on a throw", () => {
  const src = pipeline();
  const helper = /async function timed<T>\([\s\S]*?\n\}/.exec(src);
  assert.ok(helper, "the timed() helper is gone");
  assert.match(helper[0], /\}\s*finally\s*\{/, "timed() no longer records in a finally, so a phase that throws records nothing");

  const keys = [...src.matchAll(/\btimed\(\s*timings,\s*"([a-z]+)"/g)].map((m) => m[1]!);
  // questions, reading, extract, classify, sources - the five phases behind the
  // three captions the progress bar shows.
  assert.ok(keys.length >= 5, `only ${keys.length} timed phases (${keys.join(", ")}) - a phase stopped being measured`);
  assert.equal(new Set(keys).size, keys.length, `two phases share a name: ${keys.join(", ")}`);
  assert.ok(!keys.includes("total"), "a phase is called `total`, which is the key sealTimings adds for the wall clock");
});

/* ── The progress bar's rungs, and whether the pipeline reaches them ── */

/**
 * Every rung in `RUN_STEPS` is a caption the visitor can actually be shown.
 *
 * `run-steps.ts` makes a typo at a write site a compile error - `STEP.questinos`
 * does not exist - so the direction TypeScript already covers is a word the
 * reader has never heard of. The direction it cannot cover is the other one: a
 * rung added to the ladder that the pipeline never writes. That is a caption
 * nobody sees and, worse, a percentage the bar skips over, which looks exactly
 * like the freeze this whole module was built to end.
 *
 * Not hypothetical. Danny's item 3 added two rungs on 20 September 2026, and
 * the writes for them go in a different file from the array - `brands` and
 * `ranking` are written from inside `readAndStore`, while `sources` is written
 * by its caller. Three writers across two functions, and nothing joined the
 * list to any of them.
 *
 * Derived on both sides: the keys come from the module and the writes are read
 * out of the source, so adding a sixth rung fails until something writes it.
 */
test("every rung of the progress bar is a step the pipeline actually writes", () => {
  const src = pipeline();
  const unwritten = RUN_STEPS.map((s) => s.key).filter(
    (key) => !new RegExp(`STEP\\.${key}\\b`).test(src),
  );
  assert.deepEqual(
    unwritten,
    [],
    "these captions are in RUN_STEPS and the pipeline never writes them, so the bar jumps over their " +
      "percentage and the visitor never sees the words. Either write the step where that phase begins, " +
      "or take the rung out of the ladder",
  );
});

/**
 * And that the steps are written through the caller's hook rather than by
 * `readAndStore` reaching for the database itself.
 *
 * The gated pass calls the same function and must NOT write `scans.step`: it
 * runs after the visitor already has a result on screen, so a step word from it
 * rewinds a bar nobody is watching and leaves a stale value in a column the
 * free pass has finished with. `onStep` being optional is what makes that
 * true - a direct `.update({ step })` inside `readAndStore` would apply to both
 * callers and nothing else in the tree would notice.
 */
test("readAndStore reports steps through its caller, never by writing the column itself", () => {
  const src = pipeline();
  /**
   * `\n\}\n` and not `\n\}`, and the difference is the whole span.
   *
   * `readAndStore` takes one big object parameter whose type literal closes
   * with a `}` at column 0 - `}): Promise<{` - so a non-greedy walk to the
   * first newline-then-brace stops at the end of the SIGNATURE and reads none
   * of the body. Both assertions below then pass over an empty string: no
   * `.update({ step` in it, and zero `onStep` calls reported as zero. The
   * count is what caught it; a bare "does not contain" rule would have been
   * green and blind.
   *
   * Requiring a newline after the brace picks the function's own closing brace,
   * because a `}` at column 0 followed by a newline is a top-level declaration
   * ending and nothing else in this file is one.
   */
  const readAndStore = /async function readAndStore\([\s\S]*?\n\}\n/.exec(src);
  assert.ok(readAndStore, "readAndStore is gone or no longer a top-level function");
  assert.ok(
    readAndStore[0].length > 8_000,
    `the readAndStore span read back as ${readAndStore[0].length} chars, which is its signature and not ` +
      `its body - the two assertions below would pass over almost nothing`,
  );
  assert.ok(
    !/\.update\(\{\s*step[,:\s}]/.test(readAndStore[0]),
    "readAndStore writes scans.step directly. It is called by the gated pass too, which must not move " +
      "the free progress bar - the step writes belong behind the optional onStep hook",
  );
  const hooked = [...readAndStore[0].matchAll(/onStep\?\.\(/g)];
  assert.ok(
    hooked.length >= 3,
    `readAndStore reports ${hooked.length} steps through onStep and the ladder has ${RUN_STEPS.length} ` +
      `rungs - the phases inside the reading half should each announce themselves`,
  );
});
