import assert from "node:assert/strict";
import { test } from "node:test";

import {
  type AnswerRow,
  type QuestionRow,
  buildCoverage,
  buildQuestions,
  buildSources,
  countNamed,
  summariseReading,
} from "./reading-figures.ts";
/**
 * The real filter, imported rather than retyped. A local copy of the engine
 * list would be the blind-tripwire shape this repo keeps finding - a test
 * validating an output against its own duplicate of the value that produced
 * it. The first draft of this file did exactly that and passed while naming
 * an engine (`google_ai`) that does not exist.
 */
import { isEngine, knownEngines } from "../scan/engines.ts";

/**
 * The campaign reading page's figures, executed.
 *
 * `reading.ts` is `server-only` and builds a Supabase client, so Node's runner
 * could not load it and none of this had ever run. `result-figures.ts` gave
 * the scan result screen this treatment and found four defects; this is the
 * campaign page's half.
 *
 * **The property under test is agreement, not arithmetic.** Each of these
 * counts is easy and none of them was wrong in isolation. What was wrong is
 * that the same reading was counted twice on one page - once as the headline,
 * once as the first row of the history strip - by two pieces of code under two
 * different rules, so the page could contradict itself and neither number
 * looked wrong on its own.
 */

const Q = (id: string, idx: number): QuestionRow => ({ id, idx, kind: "category", question: `q${idx}` });
const A = (question_id: string, engine: string, brand_named: boolean, answered = true): AnswerRow => ({
  question_id,
  engine,
  answered,
  brand_named,
});

/* ------------------------------------------------------------------ *
 * The grid
 * ------------------------------------------------------------------ */

test("every question carries one cell per frozen engine, in that order", () => {
  const grid = buildQuestions(
    [Q("a", 1), Q("b", 2)],
    [A("a", "chatgpt", true), A("b", "google_aio", false)],
    ["chatgpt", "google_aio"],
  );
  assert.equal(grid.length, 2);
  for (const row of grid) {
    assert.deepEqual(row.answers.map((x) => x.engine), ["chatgpt", "google_aio"]);
  }
});

test("an engine that stored no row keeps its place as a measured absence", () => {
  /**
   * The cell is the finding. Shortening the row would both lose the column
   * alignment the page depends on and drop the engine out of the denominator,
   * which is the whole defect this module was split out over.
   */
  const grid = buildQuestions([Q("a", 1)], [A("a", "chatgpt", true)], ["chatgpt", "google_aio"]);
  assert.deepEqual(grid[0].answers[1], { engine: "google_aio", answered: false, brandNamed: false });
  assert.equal(countNamed(grid).of, 2, "the silent engine stays in the denominator");
});

test("questions are ordered by idx, not by the order the rows arrived", () => {
  const grid = buildQuestions([Q("c", 3), Q("a", 1), Q("b", 2)], [], ["chatgpt"]);
  assert.deepEqual(grid.map((q) => q.idx), [1, 2, 3]);
});

test("a repeated engine on the row is one column, not two", () => {
  /**
   * Agreement is not enough on its own here. Dropping the dedupe from *both*
   * functions leaves them agreeing at *2 of 2* - the same wrong figure twice -
   * so the shape in the agreement list below cannot hold this by itself. The
   * absolute value is pinned here, against what the pass actually did: one
   * question, one engine asked once, one answer stored.
   */
  const grid = buildQuestions([Q("a", 1)], [A("a", "chatgpt", true)], ["chatgpt", "chatgpt"]);
  assert.deepEqual(grid[0].answers.map((x) => x.engine), ["chatgpt"]);
  assert.deepEqual(countNamed(grid), { count: 1, of: 1 });
});

test("the grid's columns are the same list the page counts beside the headline", () => {
  /**
   * The page renders `reading.engines.length` as *on N engines* in the same
   * sentence as *named in N of M*, and `reading.ts` builds that list with
   * `knownEngines`. If the grid were built from anything else the copy and the
   * fraction beside it would be counting two different things.
   */
  const stored = ["chatgpt", "chatgpt", "gemini_ultra_9", "google_aio"];
  const grid = buildQuestions([Q("a", 1)], [], stored);
  assert.deepEqual(grid[0].answers.map((x) => x.engine), knownEngines(stored));
});

test("an engine value the union does not know is dropped from the grid", () => {
  const grid = buildQuestions([Q("a", 1)], [A("a", "gemini_ultra_9", true)], ["chatgpt"]);
  assert.equal(grid[0].answers.length, 1);
  assert.equal(grid[0].answers[0].brandNamed, false, "the unknown engine did not leak into the cell");
});

/* ------------------------------------------------------------------ *
 * The headline
 * ------------------------------------------------------------------ */

test("the denominator is what was asked, not what came back", () => {
  const grid = buildQuestions(
    [Q("a", 1), Q("b", 2)],
    [A("a", "chatgpt", true), A("b", "chatgpt", false)],
    ["chatgpt", "google_aio"],
  );
  // Two questions x two engines, one of which answered nothing at all.
  assert.deepEqual(countNamed(grid), { count: 1, of: 4 });
});

test("a reading where every engine failed is 0 of the full grid, not 0 of 0", () => {
  const grid = buildQuestions([Q("a", 1), Q("b", 2)], [], ["chatgpt", "google_aio"]);
  assert.deepEqual(countNamed(grid), { count: 0, of: 4 });
});

/* ------------------------------------------------------------------ *
 * The invariant: the page cannot contradict itself
 * ------------------------------------------------------------------ */

test("the history row for a reading agrees with that reading's headline", () => {
  /**
   * The defect, pinned. The headline read off the padded grid and the history
   * read raw `scan_answers` rows, so a reading with a silent engine showed
   * "named in 1 of 4" at the top and "1 of 2" in the strip below.
   *
   * Driven over several shapes rather than one, because the two rules agree
   * on the easy case - every engine stored a row - and that is the case a
   * single fixture would have picked.
   */
  const shapes: { name: string; questions: QuestionRow[]; answers: AnswerRow[]; engines: string[] }[] = [
    {
      name: "every engine answered",
      questions: [Q("a", 1), Q("b", 2)],
      answers: [A("a", "chatgpt", true), A("a", "google_aio", false), A("b", "chatgpt", true), A("b", "google_aio", true)],
      engines: ["chatgpt", "google_aio"],
    },
    {
      name: "one engine stored nothing",
      questions: [Q("a", 1), Q("b", 2)],
      answers: [A("a", "chatgpt", true), A("b", "chatgpt", false)],
      engines: ["chatgpt", "google_aio"],
    },
    {
      name: "a reading still running, half its rows written",
      questions: [Q("a", 1), Q("b", 2), Q("c", 3)],
      answers: [A("a", "chatgpt", true)],
      engines: ["chatgpt", "google_aio"],
    },
    {
      name: "an engine value the union does not know is stored",
      questions: [Q("a", 1)],
      answers: [A("a", "chatgpt", true), A("a", "gemini_ultra_9", true)],
      engines: ["chatgpt", "gemini_ultra_9"],
    },
    {
      /**
       * The same case with room under the cap, and it is here because the
       * shape above could not see the defect it was written for.
       *
       * With one question the denominator is 1, so an unfiltered numerator of
       * 2 was clamped back to 1 by `Math.min` and the two counts agreed for
       * the wrong reason - two defects cancelling. Two questions give the
       * denominator room, so dropping the filter shows up as a real
       * disagreement rather than being absorbed. Found by the injection
       * harness reporting MISSED, not by reading the code.
       */
      name: "an unknown engine named the brand, with room under the cap",
      questions: [Q("a", 1), Q("b", 2)],
      answers: [A("a", "chatgpt", false), A("a", "gemini_ultra_9", true)],
      engines: ["chatgpt", "gemini_ultra_9"],
    },
    {
      /**
       * The row's engine list repeats a name, which is the shape the other six
       * could not see and the one that was live.
       *
       * `pipeline.ts` dedupes this column before it asks anything, saying it is
       * doing so "for rows already written" - so the pass asks chatgpt once and
       * stores one answer row. The page built a column per entry: the headline
       * counted that one answer in two cells and doubled its own denominator to
       * match, while the strip counted answer rows and did neither. *named in 2
       * of 2* above *named in 1 of 2*, for one reading.
       *
       * Two questions, and only one of them named, so the two halves of the
       * fraction cannot both be wrong and still agree by accident - the trap
       * the unknown-engine shape above fell into first time.
       */
      name: "the row's frozen engine list repeats a name",
      questions: [Q("a", 1), Q("b", 2)],
      answers: [A("a", "chatgpt", true), A("b", "chatgpt", false)],
      engines: ["chatgpt", "chatgpt"],
    },
    {
      name: "nothing was asked at all",
      questions: [],
      answers: [],
      engines: ["chatgpt"],
    },
  ];

  for (const s of shapes) {
    const headline = countNamed(buildQuestions(s.questions, s.answers, s.engines.filter(isEngine)));
    const row = summariseReading({
      id: "r1",
      status: "complete",
      takenAt: null,
      engines: s.engines,
      questionCount: s.questions.length,
      answers: s.answers.map((a) => ({ engine: a.engine, brand_named: a.brand_named })),
    });
    assert.deepEqual(
      { count: row.named, of: row.answers },
      headline,
      `${s.name}: the history strip and the headline disagree about the same reading`,
    );
  }
});

test("named can never exceed the denominator", () => {
  /**
   * `scan_answers` is unique on (question_id, engine) so a duplicate cannot be
   * stored today - `upsert-conflict.test.mts` is what holds that. The cap is
   * here because the headline is incapable of exceeding its denominator by
   * construction, and the history row must not be the one number on the page
   * that can.
   */
  const row = summariseReading({
    id: "r1",
    status: "complete",
    takenAt: null,
    engines: ["chatgpt"],
    questionCount: 1,
    answers: [
      { engine: "chatgpt", brand_named: true },
      { engine: "chatgpt", brand_named: true },
      { engine: "chatgpt", brand_named: true },
    ],
  });
  assert.deepEqual({ named: row.named, answers: row.answers }, { named: 1, answers: 1 });
});

test("a reading whose engine list is empty reports 0 of 0, not a division", () => {
  const row = summariseReading({
    id: "r1",
    status: "failed",
    takenAt: null,
    engines: [],
    questionCount: 5,
    answers: [],
  });
  assert.deepEqual({ named: row.named, answers: row.answers }, { named: 0, answers: 0 });
});

/* ------------------------------------------------------------------ *
 * Sources and coverage
 * ------------------------------------------------------------------ */

test("sources are most-cited first, ties broken by domain", () => {
  const out = buildSources(
    new Map([["b.com", 2], ["a.com", 5], ["c.com", 2]]),
    new Set(["a.com"]),
  );
  assert.deepEqual(out.map((s) => s.domain), ["a.com", "b.com", "c.com"]);
  assert.deepEqual(out.map((s) => s.placed), [true, false, false]);
});

test("cited and uncited partition the uploaded list", () => {
  /**
   * The two halves of one finding. A placed domain must appear in exactly one
   * of them, or the page tells a client their coverage is smaller or larger
   * than what they uploaded.
   */
  const placed = new Set(["a.com", "b.com", "c.com"]);
  const counts = new Map([["a.com", 3], ["z.com", 1]]);
  const cov = buildCoverage(placed, counts);
  assert.equal(cov.uploaded, 3);
  assert.equal(cov.cited, 1);
  assert.deepEqual(cov.uncited, ["b.com", "c.com"]);
  assert.equal(cov.cited + cov.uncited.length, cov.uploaded, "the halves must sum to the whole");
});

test("a cited domain nobody placed does not enter the coverage figures", () => {
  const cov = buildCoverage(new Set(), new Map([["z.com", 9]]));
  assert.deepEqual(cov, { uploaded: 0, cited: 0, uncited: [] });
});

test("uncited is sorted, so the list does not reshuffle between reads", () => {
  const cov = buildCoverage(new Set(["c.com", "a.com", "b.com"]), new Map());
  assert.deepEqual(cov.uncited, ["a.com", "b.com", "c.com"]);
});
