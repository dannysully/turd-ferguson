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
 *
 * ## What the sender walk below cannot see, stated rather than discovered later
 *
 * It matches `sendReportReadyEmail\s*\(`, so **an aliased import is invisible**
 * - `import { sendReportReadyEmail as mail }` and a call to `mail(...)` would
 * pass. Nothing in this tree aliases an import today (measured, not assumed),
 * and `mail-doors.test.mts`'s call-site walk has the identical limit for the
 * identical reason. Recorded because the alternative to recording it is the
 * next run believing the walk is complete - which is precisely how the mail
 * door this feature added came to be green in two sweeps at once.
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
  // Two until 24 September 2026. The second was `unlock.ts`, sending the
  // report once an address had been confirmed, and it went with the email
  // gate. One is what is there; the rule below is the one that matters and it
  // works over however many there are.
  assert.ok(senders.length >= 1, `only ${senders.length} sender(s) found - this rule has gone blind`);

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

/* ── Danny's conditions on the send nobody confirmed an address for ── */

/**
 * The senders, split by whether anybody confirmed the address.
 *
 * Derived off the **column the address came out of**, not off the filename.
 * `report_email` is the address a visitor left while the scan was running and
 * nothing was ever sent to prove it; `leads.email` reached its own inbox and
 * had a link in it clicked. That distinction is what Danny's 19:45 decision is
 * about, so it is what this splits on - and a new sender joins whichever side
 * it belongs to on its own.
 *
 * There were two until 24 September 2026, one a side. The confirmed-address
 * sender was `unlock.ts`, and there is no confirmed address on this site any
 * more: the gate that produced one was deleted with the routes behind it. So
 * every sender left is on the unconfirmed side, and the condition that side
 * carries - say in the first line why the mail arrived - is now the condition
 * on all of them.
 */
function senders(): { file: string; src: string; unconfirmed: boolean }[] {
  return sourceFiles(ROOT)
    .filter((f) => !f.endsWith("verify-email.ts"))
    .map((f) => ({ file: f, src: code(readFileSync(join(ROOT, f), "utf8")) }))
    .filter(({ src }) => /sendReportReadyEmail\s*\(/.test(src))
    .map((s) => ({ ...s, unconfirmed: /\breport_email\b/.test(s.src) }));
}

test("every sender is told apart by where the address came from", () => {
  const all = senders();
  assert.ok(all.length >= 1, "no report sender found - this rule is sweeping nothing");
  assert.equal(
    all.filter((s) => s.unconfirmed).length,
    1,
    "expected exactly one unconfirmed-address sender",
  );
  // No confirmed-address sender exists since the email gate went. This is
  // asserted rather than left unsaid, because one coming back is a new
  // confirmed-address path and Danny's 19:45 conditions would apply to it.
  assert.deepEqual(
    all.filter((s) => !s.unconfirmed).map((s) => s.file),
    [],
    "a confirmed-address sender is back - it needs its own entry in the conditions above",
  );
});

/**
 * Danny's third condition, 20 September 2026 19:45: the mail nobody confirmed
 * an address for says in its first line why it arrived.
 *
 * `email-render.test.mts` holds what the sentence says and that it comes first.
 * This holds the half that test cannot see: **the sentence only appears if a
 * caller passes the domain**, and a value rule over a renderer would have
 * passed on a tree where nothing passed it. That is the `1ff1336` shape - write
 * the reader walk, or you have tested your fix instead of the tree.
 */
test("the send nobody confirmed says why it arrived, and the confirmed one does not", () => {
  for (const { file, src, unconfirmed } of senders()) {
    assert.equal(
      /requestedFor\s*:/.test(src),
      unconfirmed,
      unconfirmed
        ? `${file} mails an address nobody confirmed and does not tell the reader why it arrived`
        : `${file} mails a confirmed address and tells that reader somebody else asked for it`,
    );
  }
});

/**
 * Danny's fourth condition: "log bounces... record enough that the question can
 * be answered later without a migration."
 *
 * A bounce is not this call's return value and cannot be - `emails.send` says
 * only whether the message was accepted, and the bounce lands minutes later at
 * the provider. What has to survive the request is the id it was accepted
 * under, because that is the only thing a bounce can be joined back on.
 *
 * So the rule is not "it logs something". It is that the sender **takes the
 * return value and puts it on the row**: a send whose id is dropped leaves
 * `report_email_message_id` null, the bounce unattributable, and the condition
 * Danny accepted the whole feature on unanswerable - with no failing test,
 * because nothing else in the tree reads that column yet.
 */
test("the unconfirmed send records what the provider called the message", () => {
  const sender = senders().find((s) => s.unconfirmed);
  assert.ok(sender, "the unconfirmed-address sender has gone; this rule has no subject");
  assert.match(
    sender.src,
    /=\s*await\s+sendReportReadyEmail\s*\(/,
    `${sender.file} discards the provider's message id, so a bounce cannot be joined back to the scan`,
  );
  assert.match(
    sender.src,
    /report_email_message_id\s*:/,
    `${sender.file} never writes the message id to the row it belongs to`,
  );
});
