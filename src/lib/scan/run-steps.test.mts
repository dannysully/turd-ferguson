import assert from "node:assert/strict";
import { test } from "node:test";

import { DONE_PCT, RUN_STEPS, STEP, STEP_INDEX, stepCaption, stepPct } from "./run-steps.ts";

/**
 * The step vocabulary, under test for the first time.
 *
 * Four structures keyed to the same three words lived in three files and
 * nothing reconciled them: the pipeline's three write sites, ScanFlow's
 * `STEP_INDEX`, HeroSequence's `RUN_STEPS` captions and its `STEP_PCT` bar. The
 * failure mode is silent - a renamed step makes `STEP_INDEX.get` return
 * undefined, `setProgress` is never called, and the bar freezes with the wrong
 * caption under it for the rest of the run while the scan completes normally.
 *
 * These tests are the reconciliation. They are cheap and they are the only
 * witness this board has: `HeroSequence`'s classes exist only during a live
 * scan, so nobody has ever watched it render.
 */

test("every step's word maps back to its own position", () => {
  RUN_STEPS.forEach((s, i) => {
    assert.equal(STEP_INDEX.get(s.key), i, `${s.key} must resolve to ${i}`);
  });
  assert.equal(STEP_INDEX.size, RUN_STEPS.length, "no word is left out and none is invented");
});

test("the writer's vocabulary is exactly the reader's", () => {
  // STEP is what pipeline.ts writes; STEP_INDEX is what ScanFlow.tsx reads.
  // These were two hand-typed lists in two files. They are now one.
  assert.deepEqual(Object.keys(STEP).sort(), [...STEP_INDEX.keys()].sort());
  for (const key of Object.keys(STEP)) {
    assert.equal(STEP[key as keyof typeof STEP], key, "each key must be its own literal");
  }
});

/**
 * The defect this module was extracted to remove.
 *
 * `HeroSequence` read `RUN_STEPS[Math.min(p.step, 2)]` - a typed ceiling -
 * directly under `STEP_PCT[Math.min(Math.max(p.step, 0), STEP_PCT.length - 1)]`,
 * which derived its own. A fourth step would have moved the bar and left the
 * words behind. Neither function may carry a number that the list does not.
 */
test("a step past the end takes the last caption rather than reading off the end", () => {
  assert.equal(stepCaption(RUN_STEPS.length), RUN_STEPS[RUN_STEPS.length - 1].caption);
  assert.equal(stepCaption(99), RUN_STEPS[RUN_STEPS.length - 1].caption);
});

test("a caption exists for every step the pipeline can report", () => {
  for (const [, i] of STEP_INDEX) {
    assert.equal(stepCaption(i), RUN_STEPS[i].caption);
    assert.ok(stepCaption(i).length > 0, "no step may render an empty caption");
  }
});

test("the bar reaches done past the last step, and never exceeds it", () => {
  assert.equal(stepPct(RUN_STEPS.length), DONE_PCT, "'3 done' is a value the prop's contract admits");
  assert.equal(stepPct(99), DONE_PCT);
  for (const s of RUN_STEPS) assert.ok(s.pct < DONE_PCT, `${s.key} must leave somewhere to go`);
});

test("the bar only ever moves forwards", () => {
  const pcts = RUN_STEPS.map((s) => s.pct);
  const climbing = pcts.every((v, i) => i === 0 || v > pcts[i - 1]);
  assert.ok(climbing, "a step that lowers the bar reads as the scan going backwards");
});

/**
 * `p.step` arrives from a JSON response by way of `STEP_INDEX.get`, so it is a
 * number today. Neither function may throw if that ever stops being true -
 * this renders on the screen a visitor watches for the whole minute a scan
 * takes, and a throw here unmounts it.
 */
test("nonsense input is clamped rather than thrown on", () => {
  for (const bad of [-1, -99, NaN, Infinity, -Infinity, 1.7]) {
    assert.doesNotThrow(() => stepCaption(bad), `stepCaption(${bad})`);
    assert.doesNotThrow(() => stepPct(bad), `stepPct(${bad})`);
    assert.ok(stepCaption(bad).length > 0, `stepCaption(${bad}) must still say something`);
  }
  assert.equal(stepCaption(-1), RUN_STEPS[0].caption, "before the first step is the first step");
  assert.equal(stepPct(-1), RUN_STEPS[0].pct);
  assert.equal(stepCaption(1.7), RUN_STEPS[1].caption, "a fractional step truncates rather than rounding up");
  assert.equal(stepCaption(NaN), RUN_STEPS[0].caption, "nonsense is the start, not the end");
  assert.equal(stepPct(NaN), RUN_STEPS[0].pct);
  // The infinities are out of range, not nonsense, and clamp to the ends. A
  // first cut treated all three as nonsense with `!Number.isFinite`, which sent
  // a step past the last one back to the start of the bar.
  assert.equal(stepPct(Infinity), DONE_PCT);
  assert.equal(stepCaption(Infinity), RUN_STEPS[RUN_STEPS.length - 1].caption);
  assert.equal(stepPct(-Infinity), RUN_STEPS[0].pct);
  assert.equal(stepCaption(-Infinity), RUN_STEPS[0].caption);
});

/**
 * The renders this refactor had to preserve exactly.
 *
 * `HeroSequence` is the one board on this site with no visual witness, so a
 * refactor of its progress bar has to be checkable as frame-for-frame identical
 * to what it replaced rather than merely reasonable. These are the values the
 * two arrays it replaced produced for every step the pipeline can report.
 */
test("the shipped values are unchanged for every step a scan actually reaches", () => {
  assert.deepEqual([0, 1, 2].map(stepPct), [15, 55, 85]);
  assert.deepEqual([0, 1, 2].map(stepCaption), [
    "Building the questions buyers ask",
    "Reading what the engines answered",
    "Finding the sources they cited",
  ]);
  // STEP_PCT's fourth entry was 100 and RUN_STEPS had no third index, so step 3
  // took the last caption. Both preserved.
  assert.equal(stepPct(3), 100);
  assert.equal(stepCaption(3), "Finding the sources they cited");
});
