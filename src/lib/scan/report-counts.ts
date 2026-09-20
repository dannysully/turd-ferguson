/**
 * The five numbers the report email leads on, counted once.
 *
 * They were thirty lines inside `completeUnlock`'s `after()` callback, which is
 * a `server-only` module inside a deferred closure - so the only numbers this
 * product puts in front of a lead in writing could not be executed by anything.
 * `20 Sep`'s item 5 needed the identical five for a second sender, and a second
 * copy of a counting rule is the species this repo keeps paying for: the date
 * formatter existed twice and the untested copy was the one missing a guard.
 *
 * So they are here, where `node --test` can run them, and both senders derive.
 *
 * No `server-only` and no imports beyond the type, so the runner loads it.
 * Relative and extensionful for the same reason as `scan-shape.ts`.
 */

import type { ReportCounts } from "./email-render.ts";

/** A `scan_answers` row, as much of it as counting needs. */
export type CountableAnswer = { question_id: string; answered: boolean; brand_named: boolean };

/**
 * Both measures, because the message sends both and they are not the same
 * number.
 *
 * The subject is counted over **answers** - one engine's reply to one question -
 * because that is the figure the report's own h1 leads on. The body is counted
 * over **questions**, where a miss means every engine that replied left the
 * brand out. Until `completeUnlock` was fixed only the question pair was
 * computed and the subject printed it under the word "answers", so a
 * four-engine scan told a buyer "9 of 14 AI answers" about a set of 56.
 *
 * ## The rule every one of these five keeps
 *
 * **A question no engine answered is a silence, not a miss.** It is outside both
 * halves of the question pair, which is the measurement rule /about publishes
 * about us: "Unmeasured is excluded, never zero. Scoring it as a miss
 * understates a position." `askedQuestions` is the only figure here that counts
 * it, and it is only ever rendered as "we put N questions to the engines" -
 * a statement about what we did, not about what was found.
 *
 * `brand_named` is only ever set on a row that answered - `readAndStore` writes
 * `read.answered && namesBrand(...)` - so `missedAnswers` cannot go negative.
 * Asserted rather than assumed in `report-counts.test.mts`, because this
 * function is handed rows off a table and not the pipeline's own objects.
 */
export function reportCounts(
  questions: readonly { id: string }[],
  answers: readonly CountableAnswer[],
): ReportCounts {
  const totalAnswers = answers.filter((a) => a.answered).length;
  // Bounded by `answered` here rather than trusted off the row. The pipeline
  // cannot write a named row that did not answer; a hand-edited row can, and
  // this is the subtraction that would go negative and print "-2 of 9".
  const namedAnswers = answers.filter((a) => a.answered && a.brand_named).length;

  const byQuestion = questions.map((q) => answers.filter((a) => a.question_id === q.id));

  return {
    missedAnswers: totalAnswers - namedAnswers,
    totalAnswers,
    missedQuestions: byQuestion.filter(
      (rs) => rs.some((a) => a.answered) && !rs.some((a) => a.answered && a.brand_named),
    ).length,
    answeredQuestions: byQuestion.filter((rs) => rs.some((a) => a.answered)).length,
    askedQuestions: questions.length,
  };
}
