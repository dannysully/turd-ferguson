"use client";

import { useState } from "react";

import { listOf, namedOf, pickEngines, QUESTIONS } from "@/config/scan-shape";
import { CARD, MICRO, SHELL, T } from "@/config/tokens";
import { type WorkedQuestionId, workedQuestion } from "@/config/worked-example";

/**
 * "AI answers, question by question" - the product, shown rather than
 * described. Pick a question, see what the answer said, who was named
 * instead, which pages it was assembled from, and what we would do about it.
 *
 * The data is the example set from the canvas and is labelled as such on the
 * panel. Every brand in it is a placeholder - [Competitor A], [Your brand] -
 * because a worked example on the homepage must not imply a measurement of
 * anyone real. The numbers here are illustrative of the shape of a result,
 * not a reading of one.
 */

const pill = (bg: string, fg: string): React.CSSProperties => ({
  fontSize: "11px",
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: "999px",
  background: bg,
  color: fg,
  whiteSpace: "nowrap",
});

const BAD = pill(T.badBg, T.badFg);
const WARN = pill(T.warnBg, T.warnFg);

type Row = {
  /**
   * The question, and which of the free engines named the brand, both from
   * config/worked-example.ts.
   *
   * Typed here, this panel told the homepage "Named by Claude only" for a
   * year after Claude left the free pass, and never once named Perplexity,
   * which joined it - so the engine set moved to config/scan-shape.ts. The
   * row's own result stayed, and TierJourney kept a second copy of it that
   * disagreed on three questions of four. Both halves are named once now.
   */
  id: WorkedQuestionId;
  answer: string;
  rivals: string[];
  sources: { url: string; kind: string }[];
  plan: { mode: "Join" | "Create"; target: string; why: string }[];
};

const DATA: Row[] = [
  {
    id: "pm-creative",
    answer:
      '"For creative teams, the tools most often recommended are [Competitor A], [Competitor B] and [Competitor C]. [Competitor A] is usually cited for its proofing workflow..."',
    rivals: ["[Competitor A]", "[Competitor B]", "[Competitor C]"],
    sources: [
      { url: "reviewsite.example/project-management", kind: "Review site" },
      { url: "publication.example/best-pm-tools-2026", kind: "Listicle" },
      { url: "competitor-a.example/for-agencies", kind: "Brand site" },
    ],
    plan: [
      {
        mode: "Join",
        target: "publication.example/best-pm-tools-2026",
        // "14 answers" was a denominator no scan this product runs can
        // produce: a free pass is QUESTIONS questions across four engines, so
        // the answer count is 56 and the question count is 14. The two other
        // rows in this panel already count questions - "cited on three
        // questions", "five answers draw on it" - and this row was counting
        // questions under the word answers. Read off QUESTIONS for the same
        // reason config/scan-shape.ts exists.
        why: `Cited on 7 of the ${QUESTIONS} questions and it is an editorial listicle, so inclusion is a conversation rather than a rebuild.`,
      },
      {
        mode: "Create",
        target: 'A "best for creative teams" comparison, placed',
        why: "Nothing covers this cut specifically. A page that ranks for it becomes the source the engines reach for, and we own the brief.",
      },
    ],
  },
  {
    id: "crm-b2b",
    answer:
      '"[Competitor B] and [Competitor D] are the usual picks for small B2B teams. [Your brand] is also mentioned for lighter pipelines..."',
    rivals: ["[Competitor B]", "[Competitor D]"],
    sources: [
      { url: "reviewsite.example/crm", kind: "Review site" },
      { url: "tradetitle.example/crm-for-smes", kind: "Trade press" },
      { url: "forum.example/small-business-software", kind: "Forum" },
    ],
    plan: [
      {
        mode: "Join",
        target: "tradetitle.example/crm-for-smes",
        why: "Already cited on three questions, and the piece is updated quarterly - a natural inclusion window.",
      },
      {
        mode: "Create",
        target: "An alternatives page on a trusted trade domain",
        why: 'The "alternatives to" cut drives a third of this category and there is no good page for it. It would rank on its own and get read as a source.',
      },
    ],
  },
  {
    id: "xero",
    answer:
      '"Several tools integrate with Xero. Commonly mentioned are [Competitor C], [Your brand] and [Competitor E], with [Competitor C] usually listed first..."',
    rivals: ["[Competitor C]", "[Competitor E]"],
    sources: [
      { url: "xero.example/marketplace", kind: "Marketplace" },
      { url: "publication.example/xero-integrations", kind: "Listicle" },
      { url: "reviewsite.example/invoicing", kind: "Review site" },
    ],
    plan: [
      {
        mode: "Join",
        target: "publication.example/xero-integrations",
        why: "You are in it but listed last. Position inside a cited page changes which brand the answer names first.",
      },
      {
        mode: "Create",
        target: "An integration-specific guide on an accounting title",
        why: "Integration questions are their own category and almost nobody writes for them properly.",
      },
    ],
  },
  {
    id: "helpdesk-saas",
    answer:
      '"[Competitor F] and [Competitor G] dominate recommendations for SaaS support teams, usually on the strength of their automation..."',
    rivals: ["[Competitor F]", "[Competitor G]"],
    sources: [
      { url: "reviewsite.example/help-desk", kind: "Review site" },
      { url: "publication.example/saas-support-stack", kind: "Listicle" },
      { url: "competitor-f.example/saas", kind: "Brand site" },
    ],
    plan: [
      {
        mode: "Join",
        target: "publication.example/saas-support-stack",
        why: "Five answers draw on it and the brand is absent, which is the cheapest gap on the list to close.",
      },
      {
        mode: "Create",
        target: 'A "for SaaS" buyers guide on a software title',
        why: "The vertical cut is uncontested. A page that ranks for it feeds every answer in this sub-category.",
      },
    ],
  },
  {
    id: "competitor-alternatives",
    answer:
      '"Teams moving away from [Competitor A] usually consider [Competitor B], [Competitor H] and [Your brand]..."',
    rivals: ["[Competitor B]", "[Competitor H]"],
    sources: [
      { url: "reviewsite.example/alternatives", kind: "Review site" },
      { url: "blog.example/competitor-a-alternatives", kind: "Comparison" },
      { url: "forum.example/tooling", kind: "Forum" },
    ],
    plan: [
      {
        mode: "Join",
        target: "blog.example/competitor-a-alternatives",
        why: "Highest intent question in the set. Being in this page is worth more than being in three informational ones.",
      },
      {
        mode: "Create",
        target: "A head-to-head comparison, placed on a neutral title",
        why: "Comparison pages on third-party domains get cited far more than the same page on your own site, because the engines read them as independent.",
      },
    ],
  },
];

/**
 * "Named by ChatGPT only", built from the free engine set rather than typed
 * beside it. One sentence, one source, so the prose and the count in the left
 * column cannot disagree about how many engines there are.
 */
function namedBy(picks: number[]): string {
  const labels = pickEngines(picks);
  if (!labels.length) return "Not named on any engine";
  if (labels.length === 1) return "Named by " + labels[0] + " only";
  return "Named by " + listOf(labels);
}

const label: React.CSSProperties = { ...MICRO, display: "block" };

export default function AnswerExplorer() {
  const [picked, setPicked] = useState(0);
  const sel = DATA[picked];
  const selQ = workedQuestion(sel.id);

  return (
    <div style={{ ...SHELL, marginTop: "40px" }}>
      <div style={{ ...CARD, overflow: "hidden" }}>
        <div
          style={{
            padding: "12px 22px",
            borderBottom: `1px solid ${T.hair}`,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <span style={MICRO}>AI answers, question by question</span>
          <span style={{ background: T.chip, borderRadius: "999px", padding: "3px 10px", fontSize: "12px", color: T.soft }}>
            Example data
          </span>
          <div style={{ flexGrow: 1 }} />
          <span style={{ fontSize: "12px", color: T.soft }}>Choose a question</span>
        </div>

        <div className="answer-explorer">
          {/* Left: the questions */}
          <div className="answer-explorer__list">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "3fr 1fr",
                columnGap: "12px",
                padding: "10px 22px",
                background: "#fbfbfc",
                borderBottom: `1px solid ${T.line}`,
              }}
            >
              <div style={MICRO}>Question</div>
              <div style={{ ...MICRO, textAlign: "right" }}>Named</div>
            </div>
            {DATA.map((row, i) => {
              const q = workedQuestion(row.id);
              return (
              <button
                key={row.id}
                type="button"
                onClick={() => setPicked(i)}
                aria-pressed={i === picked}
                style={{
                  width: "100%",
                  textAlign: "left",
                  font: "inherit",
                  cursor: "pointer",
                  display: "grid",
                  gridTemplateColumns: "3fr 1fr",
                  columnGap: "12px",
                  padding: "12px 22px",
                  borderTop: 0,
                  borderLeft: 0,
                  borderRight: 0,
                  borderBottom: `1px solid ${T.hair}`,
                  alignItems: "baseline",
                  background: i === picked ? T.wash : T.surface,
                  boxShadow: i === picked ? `inset 2px 0 0 ${T.accent}` : undefined,
                }}
              >
                <span style={{ fontSize: "13.5px", color: T.ink, lineHeight: 1.4 }}>{q.text}</span>
                <span style={{ textAlign: "right" }}>
                  <span style={q.engines.length ? WARN : BAD}>{namedOf(q.engines)}</span>
                </span>
              </button>
              );
            })}
          </div>

          {/* Right: the answer, the gap, the sources, the plan */}
          <div style={{ padding: "18px 22px" }}>
            <span style={label}>What the answer said</span>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "13.5px",
                lineHeight: 1.65,
                color: T.soft,
                background: T.bg,
                border: `1px solid ${T.line}`,
                borderRadius: "10px",
                padding: "12px 14px",
              }}
            >
              {sel.answer}
            </p>

            <span style={{ ...label, marginTop: "16px" }}>The gap</span>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "7px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 12px",
                  background: T.badBg,
                  border: `1px solid ${T.badLine}`,
                  borderRadius: "10px",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 600, color: T.ink, flexGrow: 1 }}>You</span>
                <span style={{ ...pill(T.surface, T.badFg) }}>{namedBy(selQ.engines)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 12px",
                  background: T.bg,
                  border: `1px solid ${T.line}`,
                  borderRadius: "10px",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: "13px", color: T.soft }}>Named instead</span>
                {sel.rivals.map((r) => (
                  <span
                    key={r}
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 500,
                      background: T.surface,
                      border: `1px solid ${T.line}`,
                      borderRadius: "999px",
                      padding: "3px 10px",
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            <span style={{ ...label, marginTop: "16px" }}>Assembled from</span>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {sel.sources.map((s) => (
                <div key={s.url} style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                  <span style={{ fontSize: "12.5px", color: T.ink, flexGrow: 1, wordBreak: "break-word" }}>{s.url}</span>
                  <span style={{ ...MICRO, whiteSpace: "nowrap" }}>{s.kind}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: `1px solid ${T.hair}` }}>
              <span style={{ ...label, color: T.accent }}>What we would do about it</span>
              <div style={{ marginTop: "9px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {sel.plan.map((p) => (
                  <div
                    key={p.mode}
                    style={{
                      background: T.wash,
                      border: `1px solid ${T.washLine}`,
                      borderRadius: "10px",
                      padding: "11px 13px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 600,
                          letterSpacing: "0.002em",
                          color: T.accent,
                          background: T.surface,
                          borderRadius: "999px",
                          padding: "2px 8px",
                        }}
                      >
                        {p.mode}
                      </span>
                      <span style={{ fontSize: "12.5px", fontWeight: 600, color: T.ink }}>{p.target}</span>
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: "12.5px", lineHeight: 1.55, color: T.soft }}>{p.why}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
