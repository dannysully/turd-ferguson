import assert from "node:assert/strict";
import { test } from "node:test";

import {
  deriveOpportunities,
  publicNote,
  type AnswerRow,
  type CitationRow,
  type KindRow,
  type QuestionRow,
} from "./opportunities.ts";

/**
 * The count on the locked gate and the rows on the unlocked table both come
 * out of here, so every exclusion in it is load-bearing: one wrong row and the
 * report recommends placing a client on google.com, one wrong number and the
 * gate sells a list that does not exist.
 *
 * It had no check until it was moved out of `unlock.ts`, which cannot be
 * loaded by `node --test` because of its `server-only` import.
 */

const q = (id: string, question: string): QuestionRow => ({ id, question });
const cite = (source_domain: string, question_id: string, engine: string): CitationRow => ({
  source_domain,
  question_id,
  engine,
});
const answer = (question_id: string, engine: string, brand_named: boolean): AnswerRow => ({
  question_id,
  engine,
  brand_named,
});
const kind = (domain: string, k: string, on_topic: boolean | null = true): KindRow => ({
  domain,
  kind: k,
  note: `${domain} note`,
  on_topic,
});

test("a placement cited for an answer the brand was absent from is an opportunity", () => {
  const out = deriveOpportunities({
    citations: [cite("trade.example", "q1", "chatgpt")],
    answers: [answer("q1", "chatgpt", false)],
    questions: [q("q1", "best crm for agencies")],
    kinds: [kind("trade.example", "placement")],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].domain, "trade.example");
  assert.equal(out[0].absent_answers, 1);
  assert.equal(out[0].absent_questions, 1);
  assert.deepEqual(out[0].questions, ["best crm for agencies"]);
  assert.equal(out[0].note, "trade.example note");
});

test("own, competitor, other and unclassified domains never reach the list", () => {
  const citations = [
    cite("mine.example", "q1", "chatgpt"),
    cite("rival.example", "q1", "chatgpt"),
    cite("google.com", "q1", "chatgpt"),
    cite("unknown.example", "q1", "chatgpt"),
  ];
  const out = deriveOpportunities({
    citations,
    answers: [answer("q1", "chatgpt", false)],
    questions: [q("q1", "best crm")],
    kinds: [
      kind("mine.example", "own"),
      kind("rival.example", "competitor"),
      kind("google.com", "other"),
      // unknown.example is deliberately absent: unclassified, not "other".
    ],
  });
  assert.deepEqual(out, []);
});

test("on_topic false is excluded and null is allowed through", () => {
  const out = deriveOpportunities({
    citations: [cite("offtopic.example", "q1", "chatgpt"), cite("legacy.example", "q1", "chatgpt")],
    answers: [answer("q1", "chatgpt", false)],
    questions: [q("q1", "best crm")],
    kinds: [kind("offtopic.example", "placement", false), kind("legacy.example", "placement", null)],
  });
  assert.deepEqual(
    out.map((o) => o.domain),
    ["legacy.example"],
  );
});

test("an answer that named the brand is not an absence, and nor is a missing answer row", () => {
  const out = deriveOpportunities({
    citations: [cite("trade.example", "q1", "chatgpt"), cite("trade.example", "q2", "claude")],
    // q1 named the brand; q2 has no answer row at all.
    answers: [answer("q1", "chatgpt", true)],
    questions: [q("q1", "one"), q("q2", "two")],
    kinds: [kind("trade.example", "placement")],
  });
  assert.deepEqual(out, []);
});

test("the same page cited twice for one answer counts once", () => {
  const out = deriveOpportunities({
    citations: [cite("trade.example", "q1", "chatgpt"), cite("trade.example", "q1", "chatgpt")],
    answers: [answer("q1", "chatgpt", false)],
    questions: [q("q1", "best crm")],
    kinds: [kind("trade.example", "placement")],
  });
  assert.equal(out[0].absent_answers, 1);
  assert.equal(out[0].absent_questions, 1);
});

test("one question on four engines is four answers and one question", () => {
  const engines = ["chatgpt", "claude", "perplexity", "gemini"];
  const out = deriveOpportunities({
    citations: engines.map((e) => cite("trade.example", "q1", e)),
    answers: engines.map((e) => answer("q1", e, false)),
    questions: [q("q1", "best crm")],
    kinds: [kind("trade.example", "placement")],
  });
  assert.equal(out[0].absent_answers, 4);
  assert.equal(out[0].absent_questions, 1);
  assert.deepEqual(out[0].questions, ["best crm"]);
});

test("two question rows carrying the same sentence count as two questions", () => {
  // The display list deduplicates by text on purpose - the same sentence twice
  // reads as a rendering fault. absent_questions used to be that list's length,
  // so a scan with two rows of identical text reported one question behind a
  // placement when it had recorded two, and the number under-read the finding
  // the visitor is buying.
  const out = deriveOpportunities({
    citations: [cite("trade.example", "q1", "chatgpt"), cite("trade.example", "q2", "chatgpt")],
    answers: [answer("q1", "chatgpt", false), answer("q2", "chatgpt", false)],
    questions: [q("q1", "best crm"), q("q2", "best crm")],
    kinds: [kind("trade.example", "placement")],
  });
  assert.equal(out[0].absent_answers, 2);
  assert.equal(out[0].absent_questions, 2);
  assert.deepEqual(out[0].questions, ["best crm"]);
});

test("a citation whose question row is missing still counts as an answer", () => {
  // absent_questions is counted over ids, so it does not silently drop to zero
  // when the question text cannot be looked up.
  const out = deriveOpportunities({
    citations: [cite("trade.example", "q1", "chatgpt")],
    answers: [answer("q1", "chatgpt", false)],
    questions: [],
    kinds: [kind("trade.example", "placement")],
  });
  assert.equal(out[0].absent_answers, 1);
  assert.equal(out[0].absent_questions, 1);
  assert.deepEqual(out[0].questions, []);
});

test("absent_questions is never greater than absent_answers", () => {
  const out = deriveOpportunities({
    citations: [
      cite("trade.example", "q1", "chatgpt"),
      cite("trade.example", "q1", "claude"),
      cite("trade.example", "q2", "chatgpt"),
    ],
    answers: [
      answer("q1", "chatgpt", false),
      answer("q1", "claude", false),
      answer("q2", "chatgpt", false),
    ],
    questions: [q("q1", "one"), q("q2", "two")],
    kinds: [kind("trade.example", "placement")],
  });
  assert.equal(out[0].absent_answers, 3);
  assert.equal(out[0].absent_questions, 2);
  assert.ok(out[0].absent_questions <= out[0].absent_answers);
});

test("review sites are placeable alongside placements", () => {
  const out = deriveOpportunities({
    citations: [cite("g2.example", "q1", "chatgpt")],
    answers: [answer("q1", "chatgpt", false)],
    questions: [q("q1", "best crm")],
    kinds: [kind("g2.example", "review")],
  });
  assert.equal(out[0].kind, "review");
});

test("rows are ranked by absent answers, then by domain", () => {
  const out = deriveOpportunities({
    citations: [
      cite("b.example", "q1", "chatgpt"),
      cite("b.example", "q2", "chatgpt"),
      cite("a.example", "q1", "chatgpt"),
      cite("c.example", "q1", "chatgpt"),
    ],
    answers: [answer("q1", "chatgpt", false), answer("q2", "chatgpt", false)],
    questions: [q("q1", "one"), q("q2", "two")],
    kinds: [kind("a.example", "placement"), kind("b.example", "placement"), kind("c.example", "placement")],
  });
  assert.deepEqual(
    out.map((o) => o.domain),
    ["b.example", "a.example", "c.example"],
  );
});

test("no answers means no opportunities, whatever was cited", () => {
  /**
   * Why a failed `scan_answers` read has to throw rather than return zero.
   *
   * An opportunity is a page cited for an answer the brand was *absent* from,
   * and absence is only knowable from the answer row: a citation whose answer
   * is missing is skipped, which is right - an answer we do not hold is not an
   * answer the brand was missing from.
   *
   * The consequence is that an empty answer set produces exactly what a scan
   * with nothing to place into produces. So for as long as `opportunityShape`
   * and `buildUnlockPayload` swallowed that read's error, a database fault and
   * a real finding of zero were the same number on the gate - and zero is the
   * number that tells a visitor there is nothing behind it worth an address.
   */
  const out = deriveOpportunities({
    citations: [cite("trade.example", "q1", "chatgpt"), cite("trade.example", "q2", "gemini")],
    answers: [],
    questions: [q("q1", "best crm for agencies"), q("q2", "crm pricing")],
    kinds: [kind("trade.example", "placement")],
  });
  assert.deepEqual(out, []);
});

test("a domain named for something on Object.prototype is not classified by inheritance", () => {
  // The kinds table is keyed by a value that comes from outside this file.
  const out = deriveOpportunities({
    citations: [cite("constructor", "q1", "chatgpt"), cite("toString", "q1", "chatgpt")],
    answers: [answer("q1", "chatgpt", false)],
    questions: [q("q1", "best crm")],
    kinds: [],
  });
  assert.deepEqual(out, []);
});

/**
 * R16/R17, 25 September 2026: a classifier note that names a marketplace, a
 * listing or a price never leaves the derivation, so neither the three cards
 * nor the "page · note" table can print it, whichever domains sort highest.
 * The fixture is the live mayple.com note word for word.
 */
test("a note naming a marketplace, a listing or a price does not reach the rows", () => {
  const rows = deriveOpportunities({
    questions: [q("q1", "best b2b seo agency uk")],
    answers: [answer("q1", "perplexity", false)],
    citations: [cite("mayple.com", "q1", "perplexity"), cite("example-blog.com", "q1", "perplexity")],
    kinds: [
      { domain: "mayple.com", kind: "placement", note: "Marketplace/directory listing marketing agencies", on_topic: true },
      { domain: "example-blog.com", kind: "placement", note: "Roundup of UK SEO agencies", on_topic: true },
    ],
  });
  const mayple = rows.find((r) => r.domain === "mayple.com");
  assert.ok(mayple, "the row itself stays - only its note goes");
  assert.equal(mayple.note, null);
  assert.equal(rows.find((r) => r.domain === "example-blog.com")?.note, "Roundup of UK SEO agencies");
  for (const r of rows) assert.doesNotMatch(JSON.stringify(r), /marketplace|listed on|\$\s?\d/i);
});

test("publicNote drops every sale word, keeps an ordinary note", () => {
  for (const bad of [
    "Marketplace/directory listing marketing agencies",
    "Listed on a link market place",
    "Sponsored posts from $150",
    "Guest post site, pricing on request",
    "Agency directory",
    "Charges £80 per article",
  ]) {
    assert.equal(publicNote(bad), null, bad);
  }
  assert.equal(publicNote("  Industry news site covering SaaS  "), "Industry news site covering SaaS");
  assert.equal(publicNote(null), null);
  assert.equal(publicNote(""), null);
});
