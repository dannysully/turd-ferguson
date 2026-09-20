/**
 * What one engine found, published while the others are still reading.
 *
 * Danny, 20 Sep 12:30, item 4: reveal each engine's verdict as it arrives
 * rather than showing nothing until all 56 reads are in.
 *
 * ## Why this is a module and not four lines in the pipeline
 *
 * Three separate things have to agree about these rows and two of them are in
 * files no test can load - `pipeline.ts` imports `server-only`, and
 * `HeroSequence.tsx` is JSX that Node's runner will not parse. That is the same
 * obstacle `run-steps.ts`, `result-figures.ts` and `seq-stagger.ts` were split
 * out for, and the same answer: the decisions live here, where `node --test`
 * can execute them, and the three files derive.
 *
 * The decisions are: what order the reads are issued in, what a landed engine's
 * three numbers are counted over, and what the chip says. Every one of them is
 * a claim a visitor reads off the screen during the one minute they give this
 * product.
 *
 * No `server-only`: the pipeline writes these rows and a client component
 * renders them. Relative and extensionful, so the runner can load it.
 */

import { count } from "../plural.ts";
import { type Engine, ENGINE_SPECS, isEngine } from "./engines.ts";

/**
 * One engine's tally over the questions this pass asked it.
 *
 * The same three numbers as `scan_teaser`'s `by_engine`, deliberately: the chip
 * on the waiting screen and the per-engine strip on the report that replaces it
 * thirty seconds later are two surfaces describing one engine, and two files
 * disagreeing about the same fact is the cheapest defect this repo finds.
 *
 * - `asked` is every question put to this engine. It is the same for every
 *   engine on a pass and is carried anyway, because it is the only thing that
 *   separates a landed engine from an absent one on a row where nothing
 *   answered.
 * - `answered` is the reads that came back with prose.
 * - `named` is the answers that named the brand.
 */
export type EngineResult = {
  engine: Engine;
  asked: number;
  answered: number;
  named: number;
};

/**
 * Every (question, engine) read, ordered so that engines finish at different
 * times.
 *
 * **This is the half of item 4 that makes the other half worth building, and it
 * is invisible to every test that only reads the numbers.**
 *
 * The pipeline built its job list `questions.flatMap(q => engines.map(...))` -
 * question-major - and fed it to a pool of 28 workers. Under that order every
 * engine's *last* question sits in the final handful of jobs, so all four
 * engines finish within one read of each other, at the very end. There was
 * nothing to reveal early: "reads finish at different times" is true of the
 * individual reads and was false of the engines, because the queue paced them
 * in lockstep.
 *
 * Engine-major, the pool starts every one of the first engine's questions at
 * once, so that engine lands after one read's latency rather than after all of
 * them. On the live shape - 14 questions, 4 engines, 28 concurrent - the first
 * two engines land in the first wave and the last two in the second, which is
 * two reveals instead of none.
 *
 * It costs nothing: the same jobs, the same pool, the same count. Nothing
 * downstream reads `answers` positionally - every consumer filters or maps -
 * and `mapWithConcurrency` keeps each result at its own job's index either way.
 *
 * Worth saying plainly because it will read as a tidy-up to the next person:
 * flattening this back to question-major breaks the reveal and breaks no test
 * that asserts a number. `engine-results.test.mts` asserts the order itself.
 */
export function readOrder<Q>(questions: readonly Q[], engines: readonly Engine[]): { q: Q; engine: Engine }[] {
  return engines.flatMap((engine) => questions.map((q) => ({ q, engine })));
}

/**
 * The rows for a pass, given how many questions it asked and what came back.
 *
 * `answered` and `named` are counted here rather than at the call site so the
 * one place that decides what those words mean is the one place a test can
 * execute. `named` counts answers that named the brand, so it can never exceed
 * `answered` - which is what `parseEngineResults` refuses to believe of a row
 * coming back the other way.
 */
export function tallyEngine(
  engine: Engine,
  asked: number,
  reads: readonly { answered: boolean; brandNamed: boolean }[],
): EngineResult {
  return {
    engine,
    asked,
    answered: reads.filter((r) => r.answered).length,
    named: reads.filter((r) => r.answered && r.brandNamed).length,
  };
}

/**
 * A row read back off the column, or nothing.
 *
 * The value arrives as JSON - off `scans.engine_results` through the status
 * poll - so every field is unknown until it is checked, and a string keying a
 * lookup is the shape `STEP_INDEX` was rewritten for. What that one cost was a
 * frozen progress bar; what this one would cost is a sentence about an engine,
 * on the screen this feature exists to put a fact on.
 *
 * A row whose numbers cannot all be true of one engine is **dropped, not
 * clamped**. Clamping invents a reading: "named in 5 of 3" repaired to "3 of 3"
 * publishes a measurement nothing measured. Dropped, the engine reads as one
 * that has not landed, which is what we honestly know about it.
 */
function parseRow(v: unknown): EngineResult | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (!isEngine(r.engine)) return null;

  const nums = [r.asked, r.answered, r.named];
  if (!nums.every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0)) return null;

  const asked = r.asked as number;
  const answered = r.answered as number;
  const named = r.named as number;
  // A pass cannot answer more questions than it asked, nor name a brand in
  // more answers than it got. Either one means this is not a row we wrote.
  if (answered > asked || named > answered) return null;
  // An engine with nothing asked of it has not landed, whatever else the row
  // says. Reporting it would draw a chip claiming a verdict over no questions.
  if (asked === 0) return null;

  return { engine: r.engine, asked, answered, named };
}

/**
 * The landed engines, in the order the column holds them - which is the order
 * they landed in.
 *
 * Deduped on the engine, keeping the first. The column is written whole on
 * every landing so a repeat should be impossible, and `knownEngines` records
 * what this repo has already paid for believing that about a jsonb array of
 * engine names: two identical chips under one React key, telling a visitor
 * their scan reads more engines than it does.
 */
export function parseEngineResults(v: unknown): EngineResult[] {
  if (!Array.isArray(v)) return [];
  const out: EngineResult[] = [];
  const seen = new Set<Engine>();
  for (const row of v) {
    const parsed = parseRow(row);
    if (!parsed || seen.has(parsed.engine)) continue;
    seen.add(parsed.engine);
    out.push(parsed);
  }
  return out;
}

/**
 * What the chip says once an engine has landed.
 *
 * The three branches are `questionPill`'s three branches, over the other axis:
 * that one is one question across every engine, this one is one engine across
 * every question. They are deliberately the same three findings in the same
 * three words, because a visitor reads this chip and then reads that pill about
 * the same scan half a minute later.
 *
 * **The denominator is `answered`, never `asked`**, which is the rule /about
 * publishes as the first of its measurement rules: "Unmeasured is excluded,
 * never zero. An engine that returns no answer is dropped from the denominator.
 * Scoring it as a miss understates a position." An engine that answered 9 of 14
 * and named the brand in 3 is "named in 3 of 9", not 3 of 14.
 *
 * "No answer" for an engine that returned nothing is the same sentence
 * `questionPill` already gives that case, and it carries the same open question
 * - a read that errored and an engine that genuinely said nothing arrive here
 * identically. That is blocked.md 12 and it is Danny's; this says no more than
 * the report it precedes.
 */
export function engineVerdict(r: EngineResult): string {
  if (r.answered === 0) return "no answer";
  if (r.named > 0) return "named in " + r.named + " of " + r.answered;
  return "not named";
}

/**
 * The line read out to a screen reader when an engine lands.
 *
 * The chips are a visual reveal - a row of labels one of which gains a figure -
 * and that is nothing at all on a screen reader unless it is announced. Named
 * in full here rather than assembled in the component, because the component
 * cannot be executed by a test and this sentence is a claim about a measurement
 * like any other.
 */
export function landingAnnouncement(r: EngineResult): string {
  const label = ENGINE_SPECS[r.engine].label;
  if (r.answered === 0) return label + " answered none of the " + count(r.asked, "question") + ".";
  if (r.named > 0) {
    return label + " named you in " + r.named + " of " + count(r.answered, "answer") + " it gave.";
  }
  return label + " gave " + count(r.answered, "answer") + " and named you in none.";
}
