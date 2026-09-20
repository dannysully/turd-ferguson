import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { code, sourceFiles } from "../source-read.mts";

import { type CountableAnswer, reportCounts } from "./report-counts.ts";

/**
 * The five numbers this product puts in front of a lead in writing.
 *
 * They were thirty lines inside `completeUnlock`'s `after()` callback - a
 * `server-only` module inside a deferred closure - so nothing could execute
 * them, and the recorded defect on that path is exactly the kind an executor
 * catches: both database errors were discarded, so a read that did not answer
 * became an empty list and the message told a lead "We put 0 buying-intent
 * questions to the engines your buyers use" about a scan that had asked
 * fourteen and charged us for every one.
 *
 * Item 5 needed the identical five for a second sender, and a second copy of a
 * counting rule is the species this repo keeps paying for. One function, two
 * senders, and this is the thing that runs it.
 */

const ROOT = new URL("../../../", import.meta.url).pathname;

const answer = (question_id: string, answered: boolean, brand_named: boolean): CountableAnswer => ({
  question_id,
  answered,
  brand_named,
});

/* ── The two axes, which are not the same number ── */

/**
 * The subject line counts answers and the body counts questions, and printing
 * one under the other's word is a recorded defect: a four-engine scan told a
 * buyer "9 of 14 AI answers" about a set of 56.
 */
test("answers and questions are counted separately over the same rows", () => {
  const c = reportCounts(
    [{ id: "q1" }, { id: "q2" }],
    [
      answer("q1", true, true),
      answer("q1", true, false),
      answer("q2", true, false),
      answer("q2", true, false),
    ],
  );
  assert.equal(c.totalAnswers, 4, "four engine replies");
  assert.equal(c.missedAnswers, 3, "three of them left the brand out");
  assert.equal(c.answeredQuestions, 2);
  assert.equal(c.missedQuestions, 1, "only q2 was answered by somebody and named by nobody");
});

/**
 * /about publishes this as the first of its four measurement rules:
 * "Unmeasured is excluded, never zero. An engine that returns no answer is
 * dropped from the denominator. Scoring it as a miss understates a position."
 *
 * So a question nothing answered is a silence, and it is outside both halves of
 * the question pair. Counting it as a miss would publish a worse number than
 * the scan measured, in a message to a lead, against our own published rule.
 */
test("a question no engine answered is a silence, not a miss", () => {
  const c = reportCounts(
    [{ id: "q1" }, { id: "q2" }],
    [answer("q1", true, true), answer("q2", false, false)],
  );
  assert.equal(c.answeredQuestions, 1, "q2 is out of the denominator");
  assert.equal(c.missedQuestions, 0, "and out of the numerator - it is not a miss");
  assert.equal(c.askedQuestions, 2, "but it was still asked, and that figure counts it");
});

test("a question every engine answered and none named is the miss this product sells", () => {
  const c = reportCounts([{ id: "q1" }], [answer("q1", true, false), answer("q1", true, false)]);
  assert.equal(c.missedQuestions, 1);
  assert.equal(c.answeredQuestions, 1);
  assert.equal(c.missedAnswers, 2);
});

/* ── The subtraction that must not go negative ── */

/**
 * `brand_named` can only be true on a row that answered - `readAndStore` writes
 * `read.answered && namesBrand(...)`. But this function is handed rows off a
 * table rather than the pipeline's own objects, and `missedAnswers` is a
 * subtraction: one row saying otherwise prints "-1 of 3 AI answers did not name
 * you" in a subject line.
 */
test("a row that did not answer cannot count as having named the brand", () => {
  const c = reportCounts([{ id: "q1" }], [answer("q1", false, true)]);
  assert.equal(c.totalAnswers, 0);
  assert.equal(c.missedAnswers, 0, "the subtraction must not go negative");
  assert.equal(c.missedQuestions, 0, "nor may it make a silence into a naming");
});

test("missedAnswers is never more than totalAnswers, over every shape", () => {
  const shapes: CountableAnswer[][] = [
    [],
    [answer("q1", true, true)],
    [answer("q1", true, false)],
    [answer("q1", false, false)],
    [answer("q1", false, true)],
    [answer("q1", true, true), answer("q1", false, true)],
  ];
  for (const rows of shapes) {
    const c = reportCounts([{ id: "q1" }], rows);
    assert.ok(c.missedAnswers >= 0, `negative missedAnswers on ${JSON.stringify(rows)}`);
    assert.ok(c.missedAnswers <= c.totalAnswers, `missedAnswers exceeds the total on ${JSON.stringify(rows)}`);
  }
});

/* ── The empty case, which is the one that shipped a wrong number ── */

/**
 * Not an error and not fixed here. A scan with no rows counts to zero
 * truthfully; what must never happen is that reaching the senders, because
 * `reportHeadline`'s else branch then says "We put 0 buying-intent questions to
 * the engines your buyers use".
 *
 * Both callers refuse to send when either read failed, which is where that
 * belongs - the distinction is between "counted zero" and "could not count",
 * and only the caller knows which it has. Asserted here so the zero is honest,
 * and in the reader walk below so the refusal exists.
 */
test("no rows counts to zero rather than throwing", () => {
  const c = reportCounts([], []);
  assert.deepEqual(c, {
    missedAnswers: 0,
    totalAnswers: 0,
    missedQuestions: 0,
    answeredQuestions: 0,
    askedQuestions: 0,
  });
});

test("an answer row for a question that is not in the set is counted as an answer and in no question", () => {
  // Reachable on a scan whose questions were re-written between passes. The
  // answer is real and paid for, so it counts; it belongs to no question here,
  // so it moves neither question figure.
  const c = reportCounts([{ id: "q1" }], [answer("gone", true, false)]);
  assert.equal(c.totalAnswers, 1);
  assert.equal(c.answeredQuestions, 0);
  assert.equal(c.missedQuestions, 0);
});

/* ── The reader walk ── */

/**
 * Both senders must derive, or this file is testing a fix instead of the tree.
 *
 * The denominator is walked, not typed: the third sender is the one this rule
 * needs to cover and it does not exist yet. A file that calls
 * `sendReportReadyEmail` and does not call `reportCounts` is a second copy of
 * the counting rule, which is the thing this module was extracted to prevent.
 */
test("every sender of the report email counts through this module", () => {
  const senders = sourceFiles(ROOT).filter((f) => {
    const src = code(readFileSync(join(ROOT, f), "utf8"));
    return /sendReportReadyEmail\s*\(/.test(src) && !f.endsWith("verify-email.ts");
  });
  assert.ok(senders.length >= 2, `only ${senders.length} sender(s) found - this rule has gone blind`);

  const own = senders.filter((f) => !/reportCounts\s*\(/.test(code(readFileSync(join(ROOT, f), "utf8"))));
  assert.deepEqual(own, [], "these count the report's figures themselves rather than through reportCounts");
});

/**
 * And neither sender sends on a read it could not make.
 *
 * This is the defect the extraction was found by. A discarded error becomes an
 * empty list, an empty list counts to a truthful zero, and the zero reaches
 * `reportHeadline`, which publishes it as a sentence about a scan that asked
 * fourteen questions. The refusal is the caller's because only the caller can
 * tell "counted zero" from "could not count".
 */
test("neither sender mails a count it could not read", () => {
  const senders = sourceFiles(ROOT).filter((f) => {
    const src = code(readFileSync(join(ROOT, f), "utf8"));
    return /sendReportReadyEmail\s*\(/.test(src) && !f.endsWith("verify-email.ts");
  });
  for (const file of senders) {
    const src = code(readFileSync(join(ROOT, file), "utf8"));
    assert.match(
      src,
      /if\s*\(\s*qsErr\s*\|\|\s*rowsErr\s*\)/,
      `${file} does not refuse to send when either count read failed`,
    );
  }
});
