// Relative and extensionful, not `@/`, which Node's runner does not resolve -
// the same reason `scan-shape.ts` and `worked-example.ts` import this module
// this way. Do not tidy it back.
import { type Engine, isEngine, knownEngines } from "../scan/engines.ts";

/**
 * Every figure on the campaign reading page, counted from rows.
 *
 * Split out of `reading.ts` for the reason `citation-count.ts` and
 * `reading-state.ts` were before it: that module opens with
 * `import "server-only"` and builds a Supabase client, so nothing under
 * `node --test` can load it, and the counting living inside it could not be
 * executed. Rows in, figures out, no database and no network.
 *
 * Same move `result-figures.ts` made for the scan result screen. This is the
 * campaign page's half, and it had never had it.
 *
 * ## The invariant this module exists to hold
 *
 * The page shows the current reading twice: once as the headline, *named in N
 * of M answers*, and once as the first row of the history strip. Those were
 * counted by two different pieces of code under two different rules, and the
 * rules disagreed:
 *
 * - the headline counted off the rendered grid - questions times the engines
 *   the reading froze, padding every engine that stored no row, and dropping
 *   any engine value the `Engine` union does not know;
 * - the history counted raw `scan_answers` rows per scan, unpadded and
 *   unfiltered.
 *
 * So a reading where one engine stored no row read *named in 6 of 20* at the
 * top of the page and *6 of 15* in the strip below it, for the same reading,
 * with nothing saying which was right. That is precisely the hazard the
 * headline's own comment names - two counts of the same rows under two
 * different rules - fixed there and left standing twelve lines further down.
 *
 * `countNamed` and `summariseReading` are the only two places either number is
 * produced - two rather than one because the strip cannot afford a grid per
 * reading - and the agreement test drives both over a list of shapes so they
 * cannot drift again. **Two implementations pinned to agree is what this is,
 * not one implementation**: a property the shape list holds, so a shape it does
 * not contain is a way they can still disagree. That is how the repeated-engine
 * case below was found.
 *
 * ## Both of them take the engine list through `knownEngines`
 *
 * Which lives in `scan/engines.ts`, because it is a fact about the column
 * rather than about this page - the waiting screen had the same defect and now
 * goes through the same door. Its header carries the argument. What it means
 * here: a row whose list repeats a name used to reach the grid as two columns,
 * so one answer was counted twice in the headline's numerator *and* its
 * denominator, while the strip - which counts answer rows - counted it once.
 * The page said *named in 2 of 2* at the top and *1 of 2* twelve lines below,
 * for one reading, which is exactly the contradiction this module exists to
 * stop.
 *
 * It matters beyond one page being self-consistent: the history strip is the
 * only place the product's actual promise - the same questions again,
 * compared - is visible. A denominator that shrinks whenever an engine fails
 * makes a worse reading look like a better one, because the failures leave
 * the denominator and the successes do not.
 */

export type ReadingAnswer = {
  engine: Engine;
  /** Did this engine answer at all. A false is a measured absence. */
  answered: boolean;
  /** Did the answer name the brand. Only meaningful when `answered`. */
  brandNamed: boolean;
};

export type ReadingQuestion = {
  idx: number;
  kind: string;
  question: string;
  /** In the order the reading's engines were frozen, so the columns line up. */
  answers: ReadingAnswer[];
};

export type ReadingSource = {
  domain: string;
  /** How many answers cited it, across every question and engine. */
  citations: number;
  /** True when this domain is in the coverage list uploaded for the campaign. */
  placed: boolean;
};

/** One reading, as a row in the campaign's history. */
export type ReadingSummary = {
  id: string;
  status: string;
  takenAt: string | null;
  named: number;
  answers: number;
};

export type QuestionRow = { id: string; idx: number; kind: string; question: string };
export type AnswerRow = {
  question_id: string;
  engine: string;
  answered: boolean;
  brand_named: boolean;
};

/**
 * The grid the page renders: one row per question, one cell per frozen engine.
 *
 * Ordered by the reading's engine list rather than by what came back, so every
 * row has the same columns in the same order - including the cells where an
 * engine returned nothing, which is a finding and has to keep its place rather
 * than shortening the row.
 *
 * An answer row whose engine the `Engine` union does not know is dropped.
 * **That drop cannot change any figure this function returns**, and the
 * injection harness is what established it rather than a reading of the code:
 * removing the filter caught nothing, because the cells are built by walking
 * `engines` - which the caller has already filtered - and a row for an engine
 * not on that list is never looked up. It stays because it is what makes
 * `a.engine` assignable to `Engine` without a cast, which is a real effect on
 * the types and none on the values. Do not add an assertion for it; there is
 * no output that differs.
 *
 * The filtering that does change a figure happens in `summariseReading`, where
 * the answer rows are counted directly instead of through a grid.
 */
export function buildQuestions(
  questionRows: QuestionRow[],
  answerRows: AnswerRow[],
  engines: readonly string[],
): ReadingQuestion[] {
  // Through `knownEngines` rather than trusting the caller: the grid's width is
  // the headline's denominator, so a repeated name here is a doubled figure on
  // the page. See the header.
  const columns = knownEngines(engines);
  const byQuestion = new Map<string, ReadingAnswer[]>();
  for (const a of answerRows) {
    if (!isEngine(a.engine)) continue;
    const list = byQuestion.get(a.question_id) ?? [];
    list.push({ engine: a.engine, answered: a.answered, brandNamed: a.brand_named });
    byQuestion.set(a.question_id, list);
  }

  return [...questionRows]
    .sort((a, b) => a.idx - b.idx)
    .map((q) => {
      const found = byQuestion.get(q.id) ?? [];
      const answers = columns.map(
        (engine) => found.find((f) => f.engine === engine) ?? { engine, answered: false, brandNamed: false },
      );
      return { idx: q.idx, kind: q.kind, question: q.question, answers };
    });
}

/**
 * Named in N of M, counted over a grid.
 *
 * The denominator is what was **asked** - questions times engines - not what
 * came back. An engine that answered nothing stays in the denominator, or a
 * reading where half the engines failed would report a better score than one
 * where they all answered.
 */
export function countNamed(questions: ReadingQuestion[]): { count: number; of: number } {
  const asked = questions.flatMap((q) => q.answers);
  return { count: asked.filter((a) => a.brandNamed).length, of: asked.length };
}

/**
 * The same count for a reading we are not rendering a grid for.
 *
 * The history strip covers every reading of the campaign, and building a full
 * grid for each would mean reading every question and answer of every past
 * reading. The numbers have to come out identical to `countNamed` all the
 * same, so this reproduces its arithmetic rather than a cheaper version of it:
 * the denominator is `questions x engines` over the same `knownEngines` list
 * the grid's columns are built from - filtered to the union and deduplicated -
 * and the numerator drops any engine the union does not know, exactly as
 * `buildQuestions` does.
 *
 * `named` is capped at `of`. A brand named twice for one question and engine
 * would otherwise report *named in 21 of 20*; `scan_answers` is unique on
 * `(question_id, engine)` so that cannot happen today, but the headline is
 * incapable of exceeding its denominator by construction and this must not be
 * the one number on the page that can.
 */
export function summariseReading(input: {
  id: string;
  status: string;
  takenAt: string | null;
  engines: string[];
  questionCount: number;
  answers: { engine: string; brand_named: boolean }[];
}): ReadingSummary {
  const engines = knownEngines(input.engines);
  const of = input.questionCount * engines.length;
  const named = input.answers.filter((a) => isEngine(a.engine) && a.brand_named).length;
  return {
    id: input.id,
    status: input.status,
    takenAt: input.takenAt,
    named: Math.min(named, of),
    answers: of,
  };
}

/** Cited sources, most-cited first, with the placed flag the page reads. */
export function buildSources(counts: Map<string, number>, placed: Set<string>): ReadingSource[] {
  return [...counts.entries()]
    .map(([domain, citations]) => ({ domain, citations, placed: placed.has(domain) }))
    .sort((a, b) => b.citations - a.citations || a.domain.localeCompare(b.domain));
}

/**
 * How much of the uploaded coverage list any engine cited.
 *
 * `uploaded` is distinct placed *domains*, not the placement count, which is
 * larger whenever a campaign put two pieces on one title. `cited` and
 * `uncited` partition it, which is the property worth holding: the two halves
 * of one finding must always sum to the whole.
 */
export function buildCoverage(
  placed: Set<string>,
  counts: Map<string, number>,
): { uploaded: number; cited: number; uncited: string[] } {
  return {
    uploaded: placed.size,
    cited: [...placed].filter((d) => counts.has(d)).length,
    uncited: [...placed].filter((d) => !counts.has(d)).sort(),
  };
}
