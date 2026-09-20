import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { questionPill } from "../../components/scan/result-figures.ts";
import { code, sourceFiles } from "../source-read.mts";

import {
  type EngineResult,
  engineVerdict,
  landingAnnouncement,
  parseEngineResults,
  readOrder,
  tallyEngine,
} from "./engine-results.ts";
import { ENGINE_SPECS, ENGINES } from "./engines.ts";

/**
 * The per-engine reveal - Danny, 20 September 2026, item 4.
 *
 * Three claims a visitor reads off the waiting screen are decided in
 * `engine-results.ts`, and none of the three files that act on them can be
 * executed: `pipeline.ts` imports `server-only`, `HeroSequence.tsx` is JSX, and
 * `status/route.ts` needs a database. So the decisions were put in a pure
 * module and this is the thing that runs them.
 *
 * The three:
 *
 * 1. **the order the reads are issued in**, which is what makes the engines
 *    land at different times at all;
 * 2. **what a landed engine's numbers are counted over**, which is a published
 *    measurement;
 * 3. **what the chip says**, which has to agree with the report that replaces
 *    the screen half a minute later.
 *
 * The first is the one worth being loudest about, because it is invisible to
 * every assertion about a number: flatten the order back to question-major and
 * every figure below is still right and the feature silently does nothing.
 */

const ROOT = new URL("../../../", import.meta.url).pathname;
const pipelineSource = () => code(readFileSync(join(ROOT, "src/lib/scan/pipeline.ts"), "utf8"));

/** The body of a named top-level function, by its own braces rather than by a line window. */
function bodyOf(src: string, name: string): string {
  const at = src.indexOf(`function ${name}(`);
  assert.notEqual(at, -1, `${name} is gone from pipeline.ts - this rule is reading a tree it does not know`);
  const open = src.indexOf("{", src.indexOf(")", at));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(open, i + 1);
  }
  assert.fail(`${name}'s braces do not close`);
}

/* ── 1. The order, which is the whole reveal ── */

test("every question reaches every engine exactly once", () => {
  const questions = ["a", "b", "c"];
  const engines = [ENGINES[0], ENGINES[1]];
  const jobs = readOrder(questions, engines);
  assert.equal(jobs.length, questions.length * engines.length);
  const pairs = new Set(jobs.map((j) => j.engine + "|" + j.q));
  assert.equal(pairs.size, jobs.length, "a pair is repeated, so one read is paid for twice");
});

/**
 * The property that makes the reveal real, stated as a distance rather than as
 * an order.
 *
 * Under the question-major order this replaced - `questions.flatMap(q =>
 * engines.map(...))` - every engine's LAST job sat in the final handful, one
 * index apart, so a pool of 28 workers finished all four engines within one
 * read of each other at the very end. There was nothing to reveal early.
 *
 * Engine-major, the gap between consecutive engines' last jobs is the whole
 * question count, which is what lets the pool start every one of the first
 * engine's reads at once and land it after one read's latency.
 *
 * Asserted as the gap and not as "engine 0 comes first", because the gap is the
 * thing the pool responds to and it fails on the order that shipped.
 */
test("each engine's last read is a whole question set away from the next one's", () => {
  const questions = ["a", "b", "c", "d"];
  const engines = [...ENGINES];
  const jobs = readOrder(questions, engines);

  const lastAt = engines.map((e) => jobs.map((j) => j.engine).lastIndexOf(e));
  for (let i = 1; i < lastAt.length; i++) {
    assert.equal(
      lastAt[i]! - lastAt[i - 1]!,
      questions.length,
      "the engines finish in lockstep, so nothing can be revealed before the whole scan is in",
    );
  }
});

test("an engine's reads are contiguous, so its last one ends its own block", () => {
  const jobs = readOrder(["a", "b", "c"], [ENGINES[0], ENGINES[1], ENGINES[2]]);
  const order = jobs.map((j) => j.engine);
  for (const engine of [ENGINES[0], ENGINES[1], ENGINES[2]]) {
    const first = order.indexOf(engine);
    const last = order.lastIndexOf(engine);
    assert.equal(last - first + 1, 3, `${engine}'s reads are interleaved with another engine's`);
  }
});

/* ── The reader walk. Written before the rules above were trusted ── */

/**
 * A value rule over a helper proves nothing about a tree that does not call it.
 *
 * `readOrder` could be perfect and `pipeline.ts` could keep its own `flatMap`,
 * and every assertion above this line would pass on the tree that carries the
 * defect. That is this repo's own recorded way of testing a fix instead of the
 * tree, so the walk is here and the value rules are upstream of it.
 */
test("the pipeline builds its read queue through readOrder", () => {
  const src = pipelineSource();
  assert.match(src, /readOrder\(\s*questions\s*,\s*engines\s*\)/, "pipeline.ts no longer orders its reads here");
  assert.doesNotMatch(
    src,
    /questions\.flatMap\(/,
    "this is the question-major order the reveal cannot survive - see readOrder's header",
  );
});

test("the free pass publishes each engine as it lands", () => {
  assert.match(
    bodyOf(pipelineSource(), "runScan"),
    /onEngines\s*:/,
    "runScan passes no onEngines, so nothing writes a verdict and the reveal is dead markup",
  );
});

/**
 * And the gated pass does not, which is what keeps the column the free pass's
 * record.
 *
 * `engine_results` drives the free waiting screen, which has been replaced by
 * the report long before a gated pass runs. A gated pass writing its own
 * engines over it would replace a finished record with a partial one nobody is
 * watching - the same reason `runGatedScan` passes no `onStep`, which is stated
 * in that callback's contract and held by nothing until now.
 */
test("the gated pass leaves the landed engines alone", () => {
  assert.doesNotMatch(
    bodyOf(pipelineSource(), "runGatedScan"),
    /onEngines/,
    "the gated pass would overwrite the free pass's verdicts with its own engines",
  );
});

/**
 * Every `.update({ ... })` payload in a file, sliced out by its own braces.
 *
 * **A key in an object literal is not enough to tell a database write from a
 * JSON response, and both rules below were wrong about that in turn.** The
 * writer rule matched `engine_results\s*:` and reported the status route as a
 * second writer, because that route's *response* carries the column as a key.
 * The reader rule then inherited the same test as its write exemption - and
 * that was worse than wrong, it was a regression: a status route sending
 * `data.engine_results` raw still has the key, so it counted as a write and the
 * case that used to be CAUGHT came back MISSED. Found by re-running the harness
 * after widening the rule, which is the only reason it was found at all.
 *
 * Brace-matched rather than read off a line window, which is the standing rule
 * here: a window is a number somebody has to keep in step with the block, and
 * it fails flattering when a call drifts past it.
 */
function updatePayloads(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/\.update\(/g)) {
    const open = src.indexOf("{", m.index);
    if (open === -1) continue;
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}" && --depth === 0) {
        out.push(src.slice(open, i + 1));
        break;
      }
    }
  }
  return out;
}

/** Does this file write the column to the database, as opposed to naming it? */
function writesColumn(src: string): boolean {
  return updatePayloads(src).some((p) => /\bengine_results\b/.test(p));
}

test("exactly one file writes the column to the database", () => {
  const writers = sourceFiles(ROOT)
    .map((f) => ({ f, src: code(readFileSync(join(ROOT, f), "utf8")) }))
    .filter(({ src }) => writesColumn(src))
    .map(({ f }) => f);

  assert.deepEqual(
    writers,
    ["src/lib/scan/pipeline.ts"],
    "a second writer would overwrite the free pass's verdicts - see the migration and onEngines",
  );
});

/**
 * Every file that names the column either parses it or writes it.
 *
 * It matters because the value is JSON off a column keyed into a lookup, which
 * is exactly the shape `STEP_INDEX` was rewritten for. There it froze a
 * progress bar. Here it would draw a sentence about what an engine found.
 *
 * ## The hole this had when it was written, asked of it in the same run
 *
 * The first version matched `\.engine_results\b` - the property access - and
 * treated `engine_results: rows` as a write by construction. **A destructured
 * read has neither shape**: `const { engine_results } = data` names the column,
 * takes the JSON at its word, and matched nothing. The rule would have been
 * green on the idiom a reader is most likely to reach for.
 *
 * So the match is the bare identifier, and the write exemption is
 * `writesColumn` - a brace-matched `.update(` payload - rather than a key in
 * any object literal. See that helper's header for why: the cheap version of
 * this exemption made the rule *weaker* than the one it replaced.
 */
test("every file naming the column either parses it or writes it", () => {
  const named = sourceFiles(ROOT)
    .filter((f) => !f.endsWith("src/lib/scan/engine-results.ts"))
    .map((f) => ({ f, src: code(readFileSync(join(ROOT, f), "utf8")) }))
    .filter(({ src }) => /\bengine_results\b/.test(src));

  assert.ok(named.length >= 3, `only ${named.length} file(s) name the column - this rule has gone blind`);

  const loose = named
    .filter(({ src }) => !/parseEngineResults\s*\(/.test(src) && !writesColumn(src))
    .map(({ f }) => f);
  assert.deepEqual(loose, [], "these name the column and neither parse it nor write it");
});

/* ── 2. What the numbers are counted over ── */

test("answered counts the reads that came back with an answer", () => {
  const r = tallyEngine(ENGINES[0], 4, [
    { answered: true, brandNamed: false },
    { answered: false, brandNamed: false },
    { answered: true, brandNamed: true },
  ]);
  assert.equal(r.answered, 2);
  assert.equal(r.asked, 4, "asked is what was put to the engine, not what came back");
});

/**
 * A read that did not answer cannot have named anybody.
 *
 * `namesBrand` is only consulted on an answer with prose, so the pipeline never
 * produces this pair - but the count is published beside `answered` as a
 * fraction of it, and a `named` larger than its own denominator is the one
 * shape that makes the chip read as nonsense.
 */
test("named never counts a read that did not answer", () => {
  const r = tallyEngine(ENGINES[0], 3, [
    { answered: false, brandNamed: true },
    { answered: true, brandNamed: true },
  ]);
  assert.equal(r.named, 1);
  assert.ok(r.named <= r.answered, "named must be a subset of answered");
});

/* ── The parse, which is a boundary and not a formality ── */

const ok: EngineResult = { engine: ENGINES[1], asked: 14, answered: 12, named: 3 };

test("a well-formed row survives the parse unchanged", () => {
  assert.deepEqual(parseEngineResults([ok]), [ok]);
});

test("anything that is not an array parses to nothing", () => {
  for (const v of [null, undefined, "", "chatgpt", 3, {}, { engine: ENGINES[0] }]) {
    assert.deepEqual(parseEngineResults(v), [], `${JSON.stringify(v) ?? "undefined"} must not produce a row`);
  }
});

test("a row naming an engine this build does not know is dropped", () => {
  assert.deepEqual(parseEngineResults([{ ...ok, engine: "google_ai" }]), []);
});

test("a row claiming more answers than questions is dropped", () => {
  assert.deepEqual(parseEngineResults([{ ...ok, asked: 5, answered: 6, named: 1 }]), []);
});

test("a row claiming the brand was named in more answers than it got is dropped", () => {
  assert.deepEqual(parseEngineResults([{ ...ok, answered: 3, named: 4 }]), []);
});

/**
 * Dropped rather than repaired, and that is the decision rather than an
 * omission. Clamping "named in 5 of 3" to "3 of 3" publishes a reading nothing
 * measured; dropped, the engine reads as one that has not landed, which is what
 * we honestly know about it.
 */
test("an impossible row leaves the engine unlanded rather than clamped", () => {
  const out = parseEngineResults([{ ...ok, answered: 3, named: 9 }, { ...ok, engine: ENGINES[2] }]);
  assert.deepEqual(
    out.map((r) => r.engine),
    [ENGINES[2]],
    "the bad row must vanish, never arrive with its numbers adjusted",
  );
});

test("a row with nothing asked of it is not a landed engine", () => {
  assert.deepEqual(parseEngineResults([{ engine: ENGINES[0], asked: 0, answered: 0, named: 0 }]), []);
});

test("a number that is not a whole count is dropped", () => {
  for (const bad of [{ asked: 1.5 }, { answered: -1 }, { named: Number.NaN }, { asked: "14" }]) {
    assert.deepEqual(parseEngineResults([{ ...ok, ...bad }]), [], `${JSON.stringify(bad)} must not produce a row`);
  }
});

/**
 * A repeat cannot happen - the column is written whole every time - and this
 * repo has already paid for believing that about a jsonb array of engine names.
 * `knownEngines` exists because the waiting screen rendered a chip per entry,
 * keyed on the engine, and showed a duplicate under one React key.
 */
test("one row per engine, whatever the column holds", () => {
  const out = parseEngineResults([ok, { ...ok, named: 9 }]);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.named, 3, "the first row wins, so a later one cannot rewrite a published figure");
});

/* ── 3. What the chip says ── */

test("an engine that answered nothing is not scored as a miss", () => {
  assert.equal(engineVerdict({ engine: ENGINES[0], asked: 14, answered: 0, named: 0 }), "no answer");
});

/**
 * /about publishes this as the first of its four measurement rules, on the page
 * whose own doc comment calls them the point of the page: "Unmeasured is
 * excluded, never zero. An engine that returns no answer is dropped from the
 * denominator. Scoring it as a miss understates a position; averaging it in
 * flatters one."
 *
 * So the fraction is over `answered`. An engine that answered 9 of 14 and named
 * the brand in 3 is "named in 3 of 9", and writing 14 there would publish a
 * worse figure than the scan measured - on our own site, against our own
 * published rule.
 */
test("the fraction is over the answers given, never the questions asked", () => {
  const v = engineVerdict({ engine: ENGINES[0], asked: 14, answered: 9, named: 3 });
  assert.equal(v, "named in 3 of 9");
  assert.doesNotMatch(v, /14/, "the questions asked is not this fraction's denominator");
});

test("an engine that answered and never named the brand says so", () => {
  assert.equal(engineVerdict({ engine: ENGINES[0], asked: 14, answered: 14, named: 0 }), "not named");
});

/**
 * The join this file exists to make, rather than a second copy of three
 * strings.
 *
 * The chip and the report's question pill are two surfaces describing one scan
 * thirty seconds apart, on different axes - the pill is one question across
 * every engine, the chip is one engine across every question. Two files
 * disagreeing about one fact is the cheapest defect this repo finds, so the
 * three findings are asserted to be the same three findings in the same words,
 * against `questionPill` itself rather than against a literal typed here.
 */
test("the chip's three findings are the report's three findings", () => {
  const q = (answered: number, named: number) => ({
    idx: 0,
    question: "q",
    kind: "k",
    answered,
    named,
    google_rank: null,
  });

  assert.equal(questionPill(q(0, 0)), "no answer");
  assert.equal(engineVerdict({ engine: ENGINES[0], asked: 4, answered: 0, named: 0 }), "no answer");

  assert.equal(questionPill(q(3, 0)), "not named");
  assert.equal(engineVerdict({ engine: ENGINES[0], asked: 4, answered: 3, named: 0 }), "not named");

  assert.equal(questionPill(q(3, 2)), "2 of 3");
  assert.equal(
    engineVerdict({ engine: ENGINES[0], asked: 4, answered: 3, named: 2 }),
    "named in 2 of 3",
    "the chip has no column header, so it names the finding - but the fraction is the pill's",
  );
});

/* ── What a screen reader is told ── */

/**
 * The reveal is a figure appearing beside a label, which is nothing at all
 * without an announcement - and the announcement is a published measurement
 * like the chip, so it is decided here rather than assembled in the component.
 */
test("every landing announcement names the engine and its figures", () => {
  for (const engine of ENGINES) {
    const said = landingAnnouncement({ engine, asked: 14, answered: 9, named: 3 });
    assert.match(said, /named you in 3 of 9 answers/);
    assert.ok(
      said.startsWith(ENGINE_SPECS[engine].label),
      `${engine} must be named by its label, not its key`,
    );
  }
});

test("the announcement counts one answer in the singular", () => {
  assert.match(landingAnnouncement({ engine: ENGINES[0], asked: 1, answered: 1, named: 1 }), /1 of 1 answer it gave/);
  assert.match(
    landingAnnouncement({ engine: ENGINES[0], asked: 1, answered: 0, named: 0 }),
    /none of the 1 question\b/,
  );
});

test("an announcement exists for each of the three findings", () => {
  const e = ENGINES[0];
  const said = [
    landingAnnouncement({ engine: e, asked: 4, answered: 0, named: 0 }),
    landingAnnouncement({ engine: e, asked: 4, answered: 3, named: 0 }),
    landingAnnouncement({ engine: e, asked: 4, answered: 3, named: 2 }),
  ];
  assert.equal(new Set(said).size, 3, "two findings are announced identically");
  for (const s of said) assert.ok(s.endsWith("."), "each announcement is a sentence");
});
