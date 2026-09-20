import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { code, sourceFiles } from "../source-read.mts";

import { OFFER_AFTER_MS, OFFER_COPY, OFFER_STEP, offerReady } from "./email-offer.ts";
import { RUN_STEPS, STEP, STEP_INDEX } from "./run-steps.ts";

/**
 * "Do not have time to wait? We will email it to you." - Danny's item 5.
 *
 * Two things here are load-bearing and neither is visible in `ScanFlow.tsx`,
 * which is JSX and cannot be executed: when the offer appears, and what it is
 * allowed to say.
 *
 * The second is the one worth a test. The gate's copy, on the same flow and
 * often within a minute, sells the placement list and the verbatim answers -
 * correctly, because an address unlocks those. This panel takes an address for
 * something free that is already on the visitor's screen, and a sentence
 * borrowed from the gate would be a promise the mail does not keep.
 *
 * **What the last rule in this file cannot see:** it matches the heading
 * exactly, so a near-copy differing by a comma passes. That is the limit of a
 * string compare and it is not worth a fuzzy match - the defect it is written
 * for is a copy-paste, which is exact by definition. Stated so the next run
 * does not read a green as "nothing anywhere repeats this copy".
 */

const ROOT = new URL("../../../", import.meta.url).pathname;

/* ── When it may appear ── */

/**
 * The fallback in `OFFER_STEP` is unreachable, and this is what says so.
 *
 * It reads `STEP_INDEX.get(STEP.reading) ?? 0`. If that `?? 0` ever went live
 * the offer would be available at step 0 - question generation - and would ask
 * for an address to email a report on a scan that has not put a question to a
 * single engine yet. Both sides derive from `RUN_STEPS`, so it cannot; asserted
 * rather than trusted, because the failure is silent and flattering.
 */
test("the reading step is a real rung, so the offer's floor is not a fallback", () => {
  assert.equal(STEP_INDEX.get(STEP.reading), OFFER_STEP);
  assert.ok(OFFER_STEP > 0, "the offer's floor has fallen back to step 0 - see OFFER_STEP");
  assert.equal(RUN_STEPS[OFFER_STEP].key, STEP.reading);
});

test("the offer never appears before the engine reads begin", () => {
  for (let step = 0; step < OFFER_STEP; step++) {
    assert.equal(
      offerReady(step, OFFER_AFTER_MS * 10),
      false,
      `step ${step} is before the reads - there is nothing to email yet`,
    );
  }
});

test("the offer waits out its delay even once the reads are running", () => {
  assert.equal(offerReady(OFFER_STEP, 0), false);
  assert.equal(offerReady(OFFER_STEP, OFFER_AFTER_MS - 1), false);
  assert.equal(offerReady(OFFER_STEP, OFFER_AFTER_MS), true, "the boundary is inclusive");
});

/**
 * It must stay offered for the rest of the run, not just during `reading`.
 *
 * The bar moves on to `sources`, `brands` and `ranking` while the model work
 * happens, and that is exactly the stretch somebody gives up in. A condition
 * written `step === OFFER_STEP` would have withdrawn the offer at the point it
 * is most useful.
 */
test("the offer stays up for every step after the reads", () => {
  for (let step = OFFER_STEP; step <= RUN_STEPS.length; step++) {
    assert.equal(offerReady(step, OFFER_AFTER_MS), true, `step ${step} must still offer`);
  }
});

/**
 * Nine seconds is a guess and says so in its own header. What must not drift is
 * the shape of the guess: an offer that fires in the first second reads as an
 * apology for a wait that has not happened, and one that waits a minute is
 * offered to somebody who has already gone.
 */
test("the delay is seconds, not an instant and not a minute", () => {
  assert.ok(OFFER_AFTER_MS >= 3_000, "an offer this early reads as an apology for no wait");
  assert.ok(OFFER_AFTER_MS <= 30_000, "past this the visitor it exists to rescue has left");
});

/* ── What it may say ── */

/**
 * One assertion per word, each with the reason it is forbidden.
 *
 * This list lived in `email-offer.ts` for about an hour and
 * `verbatim-claims.test.mts` failed on it at once: it contains the literal
 * "word for word", so the prohibition read as one more shipping surface
 * publishing the claim it exists to forbid. The obvious fix was a file-keyed
 * exemption in that sweep, which is the wrong one - an exemption keyed to a
 * file excuses whatever lands in it next.
 *
 * So it is here, where the walk cannot see it, as a set with an assertion per
 * member. That is also the truer description: these are a reviewer's words, not
 * something the product says.
 */
const GATED: Array<[string, string]> = [
  ["placement", "the placement list is what an address unlocks; this mail carries the free result"],
  ["word for word", "the verbatim answers are behind the gate"],
  ["verbatim", "same claim, the word the rest of the site uses for it"],
  ["full report", "what arrives is the free result, which is not the full report"],
  ["unlock", "nothing is unlocked by this - it is a copy of a page already on screen"],
];

test("the offer promises nothing the gate withholds", () => {
  const said = Object.values(OFFER_COPY).join(" ").toLowerCase();
  for (const [word, why] of GATED) {
    assert.ok(!said.includes(word), `the offer says "${word}": ${why}`);
  }
});

test("every string in the offer is real copy, so the rule above reads all of it", () => {
  const values = Object.values(OFFER_COPY);
  assert.ok(values.length >= 6, `only ${values.length} strings - the prohibition has gone blind`);
  for (const [key, value] of Object.entries(OFFER_COPY)) {
    assert.equal(typeof value, "string", `${key} must be a string for the prohibition to read it`);
    assert.ok(value.trim().length > 0, `${key} is empty`);
  }
});

/**
 * The one promise it does have to make, and it has to make it twice.
 *
 * "Leaving must not cancel the pass" is the requirement, and the visitor cannot
 * know it unless they are told. **The two places are not interchangeable**, and
 * asserting them together was a real weakness rather than a tidier test: an
 * injected case that took the sentence out of the body came back MISSED,
 * because the confirmation still carried it - and the confirmation is read
 * *after* somebody has already decided to submit. The sentence in the body is
 * the one doing the persuading.
 */
test("the offer itself tells the visitor they may close the tab", () => {
  assert.match(
    OFFER_COPY.body.toLowerCase(),
    /close this tab/,
    "this is the sentence that persuades somebody to leave their address rather than their visit",
  );
});

test("and the confirmation says it again, which is when they act on it", () => {
  assert.match(OFFER_COPY.queued.toLowerCase(), /close this tab/);
});

/* ── The reader walk ── */

/**
 * The copy and the trigger could both be perfect and the component could hold
 * its own. A value rule over a module nothing calls is a test of the fix rather
 * than of the tree.
 */
test("the running screen takes its offer copy and its trigger from here", () => {
  const src = code(readFileSync(join(ROOT, "src/components/scan/ScanFlow.tsx"), "utf8"));
  assert.match(src, /from "@\/lib\/scan\/email-offer"/, "ScanFlow no longer reads this module");
  assert.match(src, /offerReady\(/, "the trigger has been reimplemented in the component");
  assert.match(src, /OFFER_COPY\./, "the copy has been retyped in the component");
});

/**
 * And nothing else types the offer's wording.
 *
 * The denominator is derived - every shipped file - because the surface that
 * repeats this copy next is the one this rule needs to cover and it does not
 * exist yet. `OFFER_COPY.heading` is the sentence a second copy would start
 * from.
 */
test("no shipped file retypes the offer's heading", () => {
  const offenders = sourceFiles(ROOT).filter(
    (f) =>
      !f.endsWith("email-offer.ts") &&
      code(readFileSync(join(ROOT, f), "utf8")).includes(OFFER_COPY.heading),
  );
  assert.deepEqual(offenders, [], "these carry a second copy of the offer's heading");
});
