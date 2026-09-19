import assert from "node:assert/strict";
import { test } from "node:test";

import { T } from "../../config/tokens.ts";
import {
  type Palette,
  type ReportCounts,
  escapeHtml,
  reportHeadline,
  reportHtml,
  reportSubject,
  verifyHtml,
} from "./email-render.ts";

/**
 * The first time either transactional email has been rendered.
 *
 * Both messages were shipped, typechecked, built and reviewed without anything
 * ever producing their output. blocked.md carried "could not render either
 * message even once" as an open item across three runs, for want of `node` on
 * the allowlist. It is allowed now, so this is the real thing rather than
 * another regex read back over the source.
 *
 * The palette below is the one verify-email.ts builds, duplicated here on
 * purpose. If the two drift, `no colour outside the palette` fails - which is
 * the point: the two departures from the tokens are deliberate and documented,
 * and a third one appearing silently is the failure this catches.
 */
const E: Palette = {
  ground: T.bg,
  card: T.surface,
  ink: T.ink,
  body: "#3d4451",
  quiet: T.soft,
  line: T.line,
  accent: T.accent,
  onAccent: T.surface,
};

const FONT = "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif";

const LINK = "https://alwayscited.com/scan/abc123";

/**
 * A real shape: fourteen questions on four engines, two of which nobody
 * answered. It is deliberately a scan where all five numbers differ, because
 * the defect this fixture exists for was two of them being the same pair.
 */
const COUNTS: ReportCounts = {
  missedAnswers: 38,
  totalAnswers: 56,
  missedQuestions: 9,
  answeredQuestions: 12,
  askedQuestions: 14,
};

const NOTHING_MISSED: ReportCounts = {
  missedAnswers: 0,
  totalAnswers: 56,
  missedQuestions: 0,
  answeredQuestions: 14,
  askedQuestions: 14,
};

/** Counts `<tag` against `</tag`, ignoring the mso conditional comments. */
function balance(html: string, tag: string): [number, number] {
  const open = html.match(new RegExp(`<${tag}[\\s>]`, "g")) ?? [];
  const close = html.match(new RegExp(`</${tag}>`, "g")) ?? [];
  return [open.length, close.length];
}

function assertWellFormed(html: string, label: string) {
  for (const tag of ["html", "head", "title", "body", "table", "tr", "td", "div", "a", "span"]) {
    const [open, close] = balance(html, tag);
    assert.equal(open, close, `${label}: <${tag}> opened ${open} times, closed ${close}`);
  }
  assert.ok(html.startsWith("<!doctype html>"), `${label}: no doctype`);
  // The brand is read off a crawled site and can hold any character there is,
  // so the document declares its own encoding rather than depending on the
  // part header Resend sets.
  assert.match(html, /<meta charset="utf-8">/, `${label}: no charset`);
  // Outlook lays out with Word and ignores max-width; the conditional comment
  // is what gives it a fixed card, and half of one would leak into the markup.
  assert.equal((html.match(/<!--\[if mso\]>/g) ?? []).length, 2, `${label}: mso open`);
  assert.equal((html.match(/<!\[endif\]-->/g) ?? []).length, 2, `${label}: mso close`);
}

test("both messages render well-formed markup", () => {
  assertWellFormed(verifyHtml(E, FONT, "Vibe Retail", LINK), "verify");
  assertWellFormed(reportHtml(E, FONT, "Vibe Retail", LINK, COUNTS), "report");
  assertWellFormed(reportHtml(E, FONT, "Vibe Retail", LINK, NOTHING_MISSED), "report, nothing missed");
});

test("no colour outside the palette reaches the inbox", () => {
  // The drift this catches really happened: the two messages were hand-copied
  // table markup carrying #f6f6f8 where the ground is #f6f6f7 and #eceef2
  // where the rule is #ececee, and they survived the sweep that moved all of
  // the site onto the tokens - because a hex in a template literal in a server
  // module is invisible to a sweep of the rendered site.
  const allowed = new Set(Object.values(E).map((c) => c.toLowerCase()));
  for (const html of [
    verifyHtml(E, FONT, "Vibe Retail", LINK),
    reportHtml(E, FONT, "Vibe Retail", LINK, COUNTS),
  ]) {
    // Not preceded by &, or the run of &#8203; padding the preview line reads
    // as a colour called #8203. The first version of this test failed on
    // exactly that and the markup was fine.
    for (const hex of html.match(/(?<!&)#[0-9a-fA-F]{3,8}\b/g) ?? []) {
      assert.ok(allowed.has(hex.toLowerCase()), `${hex} is not in the email palette`);
    }
  }
});

test("a brand is escaped exactly once", () => {
  // Escaping the title and the preview line on top of a brand the caller had
  // already escaped sent "&amp;amp;" to the inbox. The shell escapes nothing
  // and the caller escapes once, so this is the assertion that keeps it so.
  const html = verifyHtml(E, FONT, "Ben & Jerry's", LINK);
  assert.match(html, /Ben &amp; Jerry&#39;s/);
  assert.doesNotMatch(html, /&amp;amp;/);
  assert.doesNotMatch(html, /Ben & Jerry/);
});

test("a brand cannot close a tag or open a script", () => {
  const html = reportHtml(E, FONT, `</title><script>alert(1)</script>`, LINK, COUNTS);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  // The heading, the title and the preview line all interpolate the brand, so
  // a single unescaped site would show up as an extra real </title>.
  const [open, close] = balance(html, "title");
  assert.equal(open, close);
  assert.equal(open, 1);
});

test("the preview line is not the heading again", () => {
  // With no preheader a client takes the first text it finds, which is the
  // heading - so the reader saw the same sentence twice and learned nothing
  // from the second.
  const verify = verifyHtml(E, FONT, "Vibe Retail", LINK);
  assert.match(verify, /Confirming your address opens the placements/);
  assert.match(verify, /One click and your Vibe Retail report opens/);

  const report = reportHtml(E, FONT, "Vibe Retail", LINK, COUNTS);
  assert.match(report, /Your Vibe Retail report is ready/);
  // And it is not the subject again either. sendReportReadyEmail sends
  // "38 of 56 AI answers did not name Vibe Retail" as the subject, so a preview
  // line carrying the same count restates it rather than adding to it - which
  // is what it did until the message was first rendered.
  assert.match(report, /The pages you could be placed into, ranked/);
  const preheader = report.match(/font-size:1px;line-height:1px;[^>]*>([^<]*)</)?.[1] ?? "";
  assert.doesNotMatch(preheader, /\d+ of (the )?\d+/);
  // The number still leads the body, which is where it does work.
  assert.match(report, /9 of the 12 questions an engine answered came back without Vibe Retail/);
});

test("the subject counts answers and the body counts questions", () => {
  // The defect: one pair of numbers, counted over questions, printed in the
  // subject under the word "answers". On a four-engine scan the subject said
  // "9 of 14 AI answers" where the answers were 38 of 56 - and the h1 of the
  // page the link opens says the answer figure, so the two disagreed.
  assert.equal(
    reportSubject("Vibe Retail", COUNTS),
    "38 of 56 AI answers did not name Vibe Retail",
  );
  assert.match(reportHeadline("Vibe Retail", COUNTS), /^9 of the 12 questions/);

  // Nothing missed at the answer level is the only thing that drops the number
  // from the subject. A scan can miss no whole question and still have answers
  // that left the brand out, and that subject is still worth sending.
  assert.equal(reportSubject("Vibe Retail", NOTHING_MISSED), "Your Vibe Retail report");
  assert.equal(
    reportSubject("Vibe Retail", { ...NOTHING_MISSED, missedAnswers: 18 }),
    "18 of 56 AI answers did not name Vibe Retail",
  );
});

test("the link is in the button and in the fallback", () => {
  // A client that strips the button leaves the reader with nothing to click,
  // so the address is also printed. Both messages, both places.
  for (const html of [
    verifyHtml(E, FONT, "Vibe Retail", LINK),
    reportHtml(E, FONT, "Vibe Retail", LINK, COUNTS),
  ]) {
    assert.match(html, new RegExp(`href="${LINK}"`));
    assert.match(html, /paste this into your browser/);
    assert.equal((html.match(new RegExp(LINK, "g")) ?? []).length, 2);
  }
});

test("a link is escaped into the href", () => {
  // The token is ours and is hex, so this is not a live hole. It is here
  // because the same link was already escaped for display in the fallback and
  // was not escaped into the attribute, and an inconsistency like that is only
  // safe for as long as nobody changes what builds the URL.
  const html = verifyHtml(E, FONT, "Vibe Retail", `https://alwayscited.com/x?a=1"onmouseover="x`);
  assert.doesNotMatch(html, /"onmouseover="/);
  assert.match(html, /&quot;onmouseover=&quot;/);
});

test("the headline the html shows is the headline the text part shows", () => {
  // The text part used to drop the number entirely, so a client showing text
  // only got the blandest version of the one thing worth saying.
  assert.equal(
    reportHeadline("Vibe Retail", COUNTS),
    "9 of the 12 questions an engine answered came back without Vibe Retail in the answer.",
  );
  assert.equal(
    reportHeadline("Vibe Retail", NOTHING_MISSED),
    "We put 14 buying-intent questions to the engines your buyers use.",
  );
  // Nothing missed must not read as "0 of the 14".
  assert.doesNotMatch(reportHeadline("Vibe Retail", NOTHING_MISSED), /^0 of/);
  // Both halves of the sentence are the same measure. The denominator is the
  // questions an engine answered, never every question asked - 9 of 12 here,
  // where the old shape printed "9 of the 14" for a figure whose real
  // denominator was twelve.
  assert.doesNotMatch(reportHeadline("Vibe Retail", COUNTS), /of the 14/);
});

test("a scan of one question does not say 1 questions", () => {
  /**
   * Reachable by an ordinary visitor, not a contrived input: the confirm
   * screen lets a buyer drop every cluster but one and keep a single question,
   * and it runs. This is the first sentence of the email that report arrives
   * in, so it is the first thing the buyer reads.
   */
  assert.equal(
    reportHeadline("Vibe Retail", { ...COUNTS, missedQuestions: 1, answeredQuestions: 1, askedQuestions: 1 }),
    "1 of the 1 question an engine answered came back without Vibe Retail in the answer.",
  );
  assert.equal(
    reportHeadline("Vibe Retail", { ...COUNTS, missedAnswers: 0, missedQuestions: 0, askedQuestions: 1 }),
    "We put 1 buying-intent question to the engines your buyers use.",
  );
});

test("escapeHtml covers the five", () => {
  assert.equal(escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
  // Ampersand first, or the entities it writes get re-escaped.
  assert.equal(escapeHtml("&lt;"), "&amp;lt;");
});
