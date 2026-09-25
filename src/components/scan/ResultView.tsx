"use client";

import EngineLogo from "@/components/EngineLogo";
import TierName from "@/components/TierName";
import { D } from "@/components/home/dark";
import { SCAN_LIMITS } from "@/config/contact";
import { track } from "@/lib/analytics";
import { useCallback, useEffect, useRef, useState } from "react";
import { CARD, MICRO, T } from "@/config/tokens";
import type { EngineAnswer, RunScanResponse, SourceEntry } from "@/lib/scan";
import { SERP_DEPTH } from "@/lib/scan/dataforseo-request";
import { ENGINE_SPECS, isEngine } from "@/lib/scan/engines";
import {
  PLAN_ORDER,
  SOV_ROWS,
  engineLabel,
  fmtDate,
  isSubject,
  leaderboardCaption,
  ordinal,
  placementCopy,
  questionPill,
  resultFigures,
} from "./result-figures";
import { btn, field, label } from "./screens";
import WalkthroughForm from "./WalkthroughForm";
import { type Inline, parseAnswer } from "./answer-markdown";
import { type Band, bandOf, selfServeCount } from "@/lib/scan/placement-difficulty";

/**
 * The result, free and unlocked, from Flow2Free.dc.html and Flow3Report.dc.html.
 *
 * One component for both because they are the same page in two states: the
 * free result with the placement list behind the gate, and the same page with
 * the list open and the metric strip filled in. Rendering them as two screens
 * would mean two copies of every table.
 *
 * What is NOT here, and why:
 *
 * - **"Who is in it"**, the column the board puts on the placement table.
 *   scan_brands is aggregated per scan and per engine, never per question, so
 *   there is no honest way to say which competitor is on which page.
 * - **"Where your competitors are cited and you are not"**, the board heading.
 *   The derivation finds pages cited for questions where no engine named the
 *   brand. That is not the same claim, however well it would sell.
 * The whole leaderboard and every source are free, and have been since
 * 20260919000000 put them in the teaser. Only the placement list is gated, and
 * the blur is on that table alone. Every section here renders from what it is
 * given and disappears when it is given nothing, which is why widening the
 * teaser filled these in without touching this file.
 */

/**
 * Every figure and every sentence this screen states is derived in
 * `result-figures.ts`, which has no JSX and therefore has an executor. Nothing
 * below re-derives one: what is here is the painting.
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

const YES = pill(T.goodBg, T.goodFg);
const NO = pill(T.badBg, T.badFg);
const QUIET = pill(T.chip, T.soft);

/**
 * What kind of site each cited page is. Unclassified renders nothing at all:
 * a domain the classifier did not reach is a different finding from one it
 * read and could not place.
 */
function Head(p: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="board-head confirm-head" style={{ marginBottom: "14px" }}>
      <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink }}>
        {p.title}
      </h2>
      <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>{p.children}</p>
    </div>
  );
}

function Metric(p: { label: string; value: React.ReactNode; note: string; first?: boolean }) {
  return (
    <div
      style={{
        flexGrow: 1,
        flexBasis: 0,
        padding: "20px 22px",
        borderLeft: p.first ? undefined : "1px solid " + T.line,
      }}
    >
      <div style={{ fontSize: "13px", color: T.soft }}>{p.label}</div>
      <div style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1, marginTop: "2px" }}>
        {p.value}
      </div>
      <div style={{ fontSize: "12.5px", color: T.soft, marginTop: "5px", maxWidth: "32ch" }}>{p.note}</div>
    </div>
  );
}

const unit: React.CSSProperties = { fontSize: "14px", fontWeight: 600, color: T.soft, letterSpacing: 0 };

/* ── Question by question ── */

/** One engine's verdict on one question, as a word. The mark beside it is decoration. */
function answerState(a: EngineAnswer): "named" | "not named" | "no answer" {
  if (!a.answered) return "no answer";
  return a.brand_named ? "named" : "not named";
}

/**
 * The engines' marks on a question row: full strength where the engine named
 * the brand, faded where it did not, dashed where it gave no answer. The pill
 * beside them says the same thing in words, so nothing here rests on colour.
 */
function EngineMarks(p: { answers: EngineAnswer[] }) {
  if (!p.answers.length) return null;
  return (
    <div style={{ display: "flex", gap: "5px", justifyContent: "flex-end" }}>
      {p.answers.map((a) => {
        const state = answerState(a);
        return (
          <span
            key={a.engine}
            title={engineLabel(a.engine) + ": " + state}
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "999px",
              display: "grid",
              placeItems: "center",
              background: T.surface,
              color: T.ink,
              border:
                state === "named"
                  ? "1.5px solid " + T.goodFg
                  : state === "no answer"
                    ? "1px dashed " + T.line
                    : "1px solid " + T.line,
              opacity: state === "named" ? 1 : 0.42,
              filter: state === "named" ? undefined : "grayscale(1)",
            }}
          >
            <EngineLogo engine={a.engine} size={14} />
          </span>
        );
      })}
    </div>
  );
}

function QuestionTable(p: { r: RunScanResponse; onOpen: (idx: number) => void }) {
  const qs = p.r.questions ?? [];
  if (!qs.length) return null;
  return (
    <section>
      <Head title="Question by question">
        Every question we asked, and which engines named you. Open any question to read what each engine said and
        the pages it cited.
      </Head>
      <div style={{ ...CARD, overflow: "hidden" }}>
        <div className="res-qrow res-qrow--eng res-head" style={{ background: "#fbfbfc", borderBottom: "1px solid " + T.line }}>
          <div style={MICRO}>Question</div>
          <div style={{ ...MICRO, textAlign: "right" }}>Engines</div>
          <div style={{ ...MICRO, textAlign: "right" }}>Named</div>
        </div>
        {qs.map((q) => {
          const label = questionPill(q);
          const silent = label === "no answer";
          const hit = label !== "not named" && !silent;
          const answers = q.answers ?? [];
          const open = answers.length > 0;
          return (
            <button
              key={q.idx}
              type="button"
              className="res-qrow res-qrow--eng res-qbtn"
              disabled={!open}
              onClick={() => p.onOpen(q.idx)}
              aria-haspopup="dialog"
              style={{ borderBottom: "1px solid " + T.hair }}
            >
              <div style={{ fontSize: "13.5px", color: T.ink, textAlign: "left" }}>
                {q.question}
                <span style={{ display: "block", ...MICRO, marginTop: "3px", color: T.soft }}>
                  {q.kind}
                  {typeof q.google_rank === "number" ? " - Google " + ordinal(q.google_rank) : ""}
                  {open ? " - read the answers" : ""}
                </span>
              </div>
              <EngineMarks answers={answers} />
              <div style={{ textAlign: "right" }}>
                <span style={silent ? QUIET : hit ? YES : NO}>{label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * The answers to one question, in a panel from the right.
 *
 * A sidebar rather than an inline disclosure: five answers of a few hundred
 * words each pushed everything below them off the page, and a visitor
 * comparing engines wants them side by side with the question still in view.
 */
function AnswerDrawer(p: {
  r: RunScanResponse;
  idx: number | null;
  onClose: () => void;
  onMove: (idx: number) => void;
}) {
  const qs = p.r.questions ?? [];
  const at = qs.findIndex((q) => q.idx === p.idx);
  const q = at >= 0 ? qs[at] : null;
  const closeRef = useRef<HTMLButtonElement>(null);
  const { onClose } = p;

  useEffect(() => {
    if (!q) return;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [q, onClose]);

  if (!q) return null;
  const brand = p.r.brand.name;
  const answers = q.answers ?? [];
  const step = (d: number) => {
    const next = qs[at + d];
    if (next) p.onMove(next.idx);
  };

  return (
    <>
      <div className="ans-backdrop" onClick={p.onClose} aria-hidden="true" />
      <aside className="ans-drawer" role="dialog" aria-modal="true" aria-labelledby="ans-title">
        <div className="ans-drawer__head">
          <div style={{ ...MICRO, flexGrow: 1 }}>{"Question " + (at + 1) + " of " + qs.length + " - " + q.kind}</div>
          <button type="button" className="ans-nav" onClick={() => step(-1)} disabled={at <= 0} aria-label="Previous question">
            ‹
          </button>
          <button type="button" className="ans-nav" onClick={() => step(1)} disabled={at >= qs.length - 1} aria-label="Next question">
            ›
          </button>
          <button type="button" className="ans-nav" ref={closeRef} onClick={p.onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div style={{ padding: "18px 24px 32px" }}>
          <h2 id="ans-title" style={{ margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em", lineHeight: 1.35 }}>
            {q.question}
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: "13px", color: T.soft }}>
            {typeof q.google_rank === "number"
              ? "You rank " + ordinal(q.google_rank) + " on Google for this."
              : "You are not in Google's top " + SERP_DEPTH + " for this."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "18px" }}>
            {answers.map((a) => {
              const state = answerState(a);
              const direct = isEngine(a.engine) && ENGINE_SPECS[a.engine].kind === "model";
              const cited = a.citations ?? [];
              return (
                <div key={a.engine} style={{ border: "1px solid " + T.line, borderRadius: "14px", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "9px", padding: "11px 14px", background: "#fbfbfc", borderBottom: "1px solid " + T.line }}>
                    <EngineLogo engine={a.engine} size={17} />
                    <span style={{ fontSize: "13.5px", fontWeight: 600, flexGrow: 1 }}>
                      {engineLabel(a.engine)}
                      {direct ? <span style={{ fontWeight: 500, color: T.soft }}> - asked directly</span> : null}
                    </span>
                    <span style={state === "named" ? YES : state === "no answer" ? QUIET : NO}>
                      {state === "named" ? "names " + brand : state === "no answer" ? "no answer" : "does not name " + brand}
                    </span>
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    {a.response_text?.trim() ? (
                      <AnswerText source={a.response_text} />
                    ) : (
                      <p style={{ margin: 0, fontSize: "13px", color: T.soft }}>
                        {a.answered
                          ? "The words were not kept for this scan - it ran before answers were stored for good."
                          : "This engine gave no answer to this question."}
                      </p>
                    )}
                    {cited.length ? (
                      <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid " + T.hair }}>
                        <div style={{ ...MICRO, color: T.soft, marginBottom: "6px" }}>{"Cited " + cited.length + (cited.length === 1 ? " page" : " pages")}</div>
                        <ol style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          {cited.slice(0, 8).map((c, i) => (
                            <li key={(c.url ?? c.domain) + i} style={{ fontSize: "12.5px", color: T.soft, lineHeight: 1.5 }}>
                              {c.url ? (
                                <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" style={{ color: T.ink }}>
                                  {c.domain}
                                </a>
                              ) : (
                                <span style={{ color: T.ink }}>{c.domain}</span>
                              )}
                              {c.title ? " - " + c.title : ""}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}

/* ── One stored answer, as the markdown the engine wrote ── */

/**
 * See `answer-markdown.ts`. Every string reaches the page as a React text
 * node, never as HTML, so nothing an engine wrote can run.
 */
function AnswerText(p: { source: string }) {
  const blocks = parseAnswer(p.source);
  const text: React.CSSProperties = { margin: 0, fontSize: "13.5px", lineHeight: 1.7, color: T.ink };
  const cell: React.CSSProperties = { padding: "6px 8px", borderBottom: "1px solid " + T.hair, verticalAlign: "top", textAlign: "left" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {blocks.map((b, i) => {
        if (b.kind === "table") {
          return (
            <div key={i} style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "12.5px", lineHeight: 1.5, color: T.ink }}>
                <thead>
                  <tr>
                    {b.head.map((c, j) => (
                      <th key={j} style={{ ...cell, fontWeight: 600, borderBottom: "1px solid " + T.line }}>
                        <Runs runs={c} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, j) => (
                    <tr key={j}>
                      {r.map((c, k) => (
                        <td key={k} style={cell}>
                          <Runs runs={c} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (b.kind === "ul" || b.kind === "ol") {
          const List = b.kind;
          return (
            <List key={i} style={{ ...text, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {b.items.map((it, j) => (
                <li key={j}>
                  <Runs runs={it} />
                </li>
              ))}
            </List>
          );
        }
        if (b.kind === "h") {
          return (
            <p key={i} style={{ ...text, fontWeight: 600 }}>
              <Runs runs={b.text} />
            </p>
          );
        }
        if (b.kind !== "p") return null;
        return (
          <p key={i} style={text}>
            {b.lines.map((l, j) => (
              <span key={j}>
                {j ? <br /> : null}
                <Runs runs={l} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function Runs(p: { runs: Inline[] }) {
  return (
    <>
      {p.runs.map((r, i) =>
        r.bold ? (
          <strong key={i} style={{ fontWeight: 600 }}>
            {r.text}
          </strong>
        ) : r.cite ? (
          <sup key={i} style={{ fontSize: "10px", color: T.soft }}>
            {"[" + r.text + "]"}
          </sup>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
}

/* ── Who is being named instead ── */

function ShareOfVoice(p: { r: RunScanResponse }) {
  const rows = p.r.leaderboard;
  if (!rows.length) return null;
  const top = Math.max(...rows.map((b) => b.mentions), 1);
  /**
   * Part of this leaderboard did not come back.
   *
   * Every row below is still a real count - the bars are what those brands
   * were named. What is missing is other brands, so the standfirst cannot
   * claim "every brand in the category" and the caption cannot say "in all".
   * The rank and the share of voice counted against this list are already
   * absent by the time the data reaches here.
   */
  const partial = p.r.leaderboard_partial;

  return (
    <section>
      <Head title="Who is being named instead">
        {partial
          ? "The same question set scored for every brand we could read. Part of this leaderboard did not come back, so names are missing from it - the counts below are real, but we are not publishing a ranking off a list we know is short."
          : "The same question set scored for every brand in the category. This is the gap, and it is the number that has to move."}
      </Head>
      <div style={{ ...CARD, padding: "22px 26px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "11px", maxWidth: "820px" }}>
          {rows.slice(0, SOV_ROWS).map((b) => {
            const you = isSubject(b, p.r.brand.name);
            return (
              <div key={b.brand} className="seq-sov">
                <div style={{ fontSize: "13.5px", fontWeight: you ? 700 : 500, color: you ? T.ink : T.soft }}>
                  {b.brand}
                </div>
                <div style={{ height: "22px", background: T.chip, borderRadius: "4px", overflow: "hidden" }}>
                  {/* acGrow, at Flow2Free.dc.html's own .8s cubic-bezier -
                      seq-bar is already that exact declaration. Time-based
                      rather than scroll-driven because this arrives when the
                      scan finishes, which is the moment the board animates.
                      The count sits in text beside it, so a bar at scaleX(0)
                      hides a graphic and never a number. */}
                  <div
                    className="seq-bar"
                    style={{
                      height: "100%",
                      width: Math.round((b.mentions / top) * 100) + "%",
                      background: you ? T.accent : "#c8cad0",
                      borderRadius: "4px",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    textAlign: "right",
                    color: you ? T.ink : T.soft,
                  }}
                >
                  {b.mentions}
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ margin: "14px 0 0", fontSize: "12.5px", color: T.soft }}>
          {leaderboardCaption(rows.length, partial)}
        </p>
      </div>
    </section>
  );
}

/* ── The placement list ── */

const BAND_COLOUR: Record<Band, string> = { Easy: T.goodFg, Moderate: T.warnFg, Hard: T.badFg };
const BAND_PILL: Record<Band, React.CSSProperties> = {
  Easy: pill(T.goodBg, T.goodFg),
  Moderate: pill(T.warnBg, T.warnFg),
  Hard: pill(T.badBg, T.badFg),
};

/**
 * How hard a placement is, as a half dial out of 100 with the band in words
 * beside it - the word is always there, so colour never carries it alone.
 * `placement-difficulty.ts` is the rule; this is the painting.
 */
function DifficultyCell(p: { score: number | null }) {
  if (p.score === null) return <span style={{ fontSize: "12.5px", color: T.soft }}>Not scored</span>;
  const band = bandOf(p.score);
  // A half circle of radius 18: its length is pi x 18, and the filled part is that times score / 100.
  const r = 18;
  const len = Math.PI * r;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <svg width="44" height="28" viewBox="0 0 44 28" role="img" aria-label={"Difficulty " + p.score + " out of 100, " + band}>
        <path d="M4 24 A18 18 0 0 1 40 24" fill="none" stroke={T.line} strokeWidth="5" strokeLinecap="round" />
        <path
          d="M4 24 A18 18 0 0 1 40 24"
          fill="none"
          stroke={BAND_COLOUR[band]}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={(len * p.score) / 100 + " " + len}
        />
        <text x="22" y="25" textAnchor="middle" fontSize="11" fontWeight="700" fill={T.ink}>
          {p.score}
        </text>
      </svg>
      <div style={{ fontSize: "13px", fontWeight: 600, color: BAND_COLOUR[band] }}>{band}</div>
    </div>
  );
}

/**
 * Which of these the visitor could land alone, and the step up for the rest -
 * Danny, 25 Sep 2026: "we want people to understand whether they could do this
 * themselves or would be better off with us doing it for them". Only drawn when
 * the rows were scored; an unscored list says nothing rather than zero.
 */
function SelfServe(p: { r: RunScanResponse }) {
  const rows = p.r.opportunities ?? [];
  const { easy, scored } = selfServeCount(rows);
  if (!scored) return null;
  const rest = scored - easy;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
      <p style={{ margin: 0, fontSize: "14.5px", lineHeight: 1.6, color: T.ink }}>
        <strong style={{ fontWeight: 700 }}>
          {easy === 1 ? "You could place 1 of these yourself." : "You could place " + easy + " of these yourself."}
        </strong>
        {rest > 0 ? " The other " + rest + " need an editorial pitch or a budget." : ""}
      </p>
      {rest > 0 ? (
        // The board's dark ink card (ScanResult.dc.html, QF1). The tier name is
        // in the sentence, through TierName under `.on-dark`; the button is
        // plain words, so no lockup sits inside a coloured link.
        <div
          className="on-dark"
          style={{
            background: T.ink,
            color: T.surface,
            borderRadius: "18px",
            padding: "22px 26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flexGrow: 1, minWidth: "220px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: T.surface }}>Want us to secure the hard ones?</div>
            <p style={{ margin: "4px 0 0", fontSize: "14px", lineHeight: 1.55, color: D.muted }}>
              That is <TierName tier="mentioned" />: placements in the pages the engines cite, links included.
            </p>
          </div>
          <a
            href="/alwaysmentioned"
            style={{
              background: T.surface,
              color: T.ink,
              fontSize: "14.5px",
              fontWeight: 600,
              padding: "12px 18px",
              borderRadius: "10px",
              textDecoration: "none",
              minHeight: "44px",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
            }}
          >
            See how it works
          </a>
        </div>
      ) : null}
    </div>
  );
}

/**
 * No page to be placed into, said once and used on both sides of the gate.
 *
 * It used to exist only on the unlocked side. Locked, the same scan drew the
 * blurred skeleton and a gate offering a list - so a visitor gave an address
 * for rows that were never there, and the report then told them so. The gate
 * and the report have to agree before the address is given, not after.
 *
 * There are four ways to reach zero and only one of them is a finding, which
 * is `placementVerdict`'s whole subject - read it there. This is the painting.
 */
function NoPlacements(p: { sources: readonly SourceEntry[] }) {
  return (
    <div style={{ ...CARD, padding: "22px 26px" }}>
      <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.65, color: T.soft }}>{placementCopy(p.sources)}</p>
    </div>
  );
}

function PlacementTable(p: { r: RunScanResponse }) {
  const rows = p.r.opportunities ?? [];
  return (
    <div style={{ ...CARD, overflow: "hidden" }}>
      <div className="res-prow res-head" style={{ background: "#fbfbfc", borderBottom: "1px solid " + T.line }}>
        <div style={MICRO}>Page</div>
        <div style={MICRO}>Difficulty</div>
        <div style={{ ...MICRO, textAlign: "right" }}>Questions</div>
        <div style={{ ...MICRO, textAlign: "right" }}>Answers you would win</div>
      </div>
      {rows.map((o) => (
        <div key={o.domain} className="res-prow" style={{ borderBottom: "1px solid " + T.hair }}>
          <div>
            <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{o.domain}</div>
            {/* What the board shows under a row, as far as the scan records it:
                how many engines cite the page. Which brands it names is not
                derivable (opportunities.ts), so nothing stands in for it. */}
            {o.cited_by ? (
              <div style={{ fontSize: "12.5px", color: T.soft, marginTop: "2px" }}>
                {"Cited by " + o.cited_by + " of " + p.r.engines.length + " engines"}
              </div>
            ) : null}
            {o.questions.length ? (
              <div style={{ fontSize: "12.5px", color: T.soft, marginTop: "4px", lineHeight: 1.5 }}>
                {o.questions.slice(0, 2).join(" - ") +
                  (o.questions.length > 2 ? " - and " + (o.questions.length - 2) + " more" : "")}
              </div>
            ) : null}
          </div>
          <div>
            <DifficultyCell score={o.difficulty ?? null} />
          </div>
          <div style={{ fontSize: "13.5px", textAlign: "right", color: T.soft }}>{o.absent_questions}</div>
          <div style={{ fontSize: "13.5px", fontWeight: 600, textAlign: "right" }}>{o.absent_answers}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * The first three, as the brief.
 *
 * The board labels them join / join / create. Only join is derivable: a
 * "create" row is a page that does not exist yet, and nothing in the scan
 * records the absence of a page. So these are the three highest-value pages
 * that can be joined, and the create idea is left to the sentence under them
 * rather than dressed up as a finding.
 */
function PlanCards(p: { r: RunScanResponse }) {
  /* The slice and the labels share one ceiling. Two typed threes is the ladder
     species this repo keeps finding, and a fourth label with no row to hang on
     - or a fourth row with no label - is what it looks like here. */
  const rows = (p.r.opportunities ?? []).slice(0, PLAN_ORDER.length);
  if (!rows.length) return null;
  return (
    <div className="seq-three" style={{ marginTop: "16px" }}>
      {rows.map((o, i) => (
        <div
          key={o.domain}
          style={{ background: T.bg, border: "1px solid " + T.line, borderRadius: "14px", padding: "18px" }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <div style={{ ...MICRO, flexGrow: 1 }}>{PLAN_ORDER[i] + " - join"}</div>
            {typeof o.difficulty === "number" ? (
              <span style={BAND_PILL[bandOf(o.difficulty)]}>{bandOf(o.difficulty) + " - " + o.difficulty}</span>
            ) : null}
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "7px", lineHeight: 1.4 }}>{o.domain}</div>
          {o.note ? (
            <p style={{ margin: "8px 0 0", fontSize: "13px", lineHeight: 1.6, color: T.soft }}>{o.note}</p>
          ) : null}
          <div
            style={{
              marginTop: "11px",
              paddingTop: "9px",
              borderTop: "1px solid " + T.line,
              display: "flex",
              alignItems: "baseline",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "19px", fontWeight: 700, letterSpacing: "-0.03em", color: T.accent }}>
              {o.absent_answers}
            </span>
            <span style={{ fontSize: "12.5px", color: T.soft }}>answers you would win</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrackedSection(p: { token: string; questions: number }) {
  const point = (title: string, body: string) => (
    <div style={{ borderTop: "1px solid " + T.line, paddingTop: "12px" }}>
      <div style={{ fontSize: "14px", fontWeight: 600, color: T.ink }}>{title}</div>
      <p style={{ margin: "4px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>{body}</p>
    </div>
  );
  return (
    <section id="tracked">
      <div className="page-split" style={{ ...CARD, padding: "28px", rowGap: "24px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.25 }}>
            This was one reading. <TierName tier="tracked" /> keeps it running.
          </h2>
          <p style={{ margin: "10px 0 16px", fontSize: "14px", lineHeight: 1.65, color: T.soft }}>
            {"You have just seen " +
              p.questions +
              " questions on one day. alwaystracked is the same measurement, run for you every week, so you can see what moves and why."}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {point("Your own prompts", "Add the questions your buyers actually ask, and track every engine's answer to each one over time.")}
            {point(
              "Adjacent opportunities",
              "The sites cited today are not always ones you can get onto. It also finds the pages that are not cited yet but are the kind these engines reach for - where the right piece has a real chance of being picked up.",
            )}
            {point(
              "Reporting, not placement",
              "alwaystracked tells you where you stand and where the openings are. Getting the placements is a separate service, alwaysmentioned, where we approach the sites and write what gets you in.",
            )}
          </div>
        </div>
        <div style={{ background: T.bg, border: "1px solid " + T.line, borderRadius: "14px", padding: "20px" }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: T.ink }}>See alwaystracked on your own data</div>
          <p style={{ margin: "4px 0 14px", fontSize: "13.5px", lineHeight: 1.6, color: T.soft }}>
            It is set up for each client, so the quickest way to see it is a walkthrough of this report.
          </p>
          <WalkthroughForm token={p.token} />
        </div>
      </div>
    </section>
  );
}

/* ── The whole page ── */

export default function ResultView(p: {
  r: RunScanResponse;
  domain: string;
  token: string;
  /** The count route has already answered zero. */
  noPlacements?: boolean;
}) {
  const r = p.r;
  const f = resultFigures(r, p.domain, { unlocked: true, noPlacements: p.noPlacements });
  const qs = r.questions ?? [];
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const close = useCallback(() => setOpenIdx(null), [setOpenIdx]);
  const opps = r.opportunities ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
      {/* Headline */}
      <div className="confirm-top">
        <div>
          <div style={MICRO}>{p.domain + " - read " + fmtDate(r.read_at)}</div>
          <h1 style={{ margin: "10px 0 0", fontSize: "32px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, color: T.ink }}>
            {f.headline}
          </h1>
          <div style={{ marginTop: "14px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {r.engines.map((e) => (
              <div
                key={e.engine}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  background: T.surface,
                  border: "1px solid " + T.line,
                  borderRadius: "999px",
                  padding: "4px 11px 4px 8px",
                  color: T.ink,
                }}
              >
                <EngineLogo engine={e.engine} size={15} />
                <span style={{ fontSize: "12px", color: T.soft }}>{e.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...CARD, display: "flex", overflow: "hidden", alignSelf: "start", flexWrap: "wrap" }}>
          <Metric
            first
            label="Answers naming you"
            value={
              <>
                {f.named} <span style={unit}>{"of " + f.answers}</span>
              </>
            }
            note={f.pct === null ? "No engine answered yet." : f.pct + "% across the question set"}
          />
          <Metric
            label="Questions with no mention"
            value={
              <>
                {f.blank} <span style={unit}>{"of " + f.answeredQuestions}</span>
              </>
            }
            note="Of the questions an engine answered at all."
          />
          {f.bestRank !== null ? (
            <Metric label="Best Google position" value={ordinal(f.bestRank)} note="Your best organic position on any of these questions." />
          ) : null}
        </div>
      </div>

      <QuestionTable r={r} onOpen={setOpenIdx} />

      {/* Where to get placed - the sources, cut down to the ones worth acting on. */}
      <section id="plan">
        <Head title="Where to get placed">
          Of every page the engines drew on, the ones feeding answers you are missing from, where an article can
          realistically run. Ranked by how many answers a placement would put you into.
        </Head>
        {opps.length ? (
          <div>
            <SelfServe r={r} />
            <PlanCards r={r} />
            {opps.length > PLAN_ORDER.length ? (
              <div style={{ marginTop: "16px" }}>
                <PlacementTable r={r} />
              </div>
            ) : null}
            <p style={{ margin: "14px 0 0", fontSize: "13.5px", lineHeight: 1.65, color: T.soft }}>
              These are the pages already being cited. <TierName tier="mentioned" /> is how we get you onto them - and
              where inclusion is not editorially possible, we find the equivalent page and write the content that gets
              you in.
            </p>
          </div>
        ) : (
          <NoPlacements sources={r.sources} />
        )}
      </section>

      <ShareOfVoice r={r} />

      <TrackedSection token={p.token} questions={qs.length} />

      <AnswerDrawer r={r} idx={openIdx} onClose={close} onMove={setOpenIdx} />
    </div>
  );
}
