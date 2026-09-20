"use client";

import TierName from "@/components/TierName";
import { CARD, MICRO, T } from "@/config/tokens";
import type { RunScanResponse, ScanQuestion, SourceEntry } from "@/lib/scan";
import { ENGINE_SPECS, isEngine } from "@/lib/scan/engines";
import {
  PLAN_ORDER,
  SOV_ROWS,
  engineLabel,
  fmtDate,
  isOwnDomain,
  isSubject,
  kindLabel,
  leaderboardCaption,
  moreSourcesNote,
  namedBy,
  ordinal,
  overviewState,
  placementCopy,
  placementsNote,
  questionPill,
  resultFigures,
  sourcesNote,
  topBrandNote,
  transcript,
  visibilityNote,
} from "./result-figures";
import Link from "next/link";

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
function KindPill(p: { kind: string | null; note: string | null }) {
  const label = kindLabel(p.kind);
  if (!label) return null;
  const style = p.kind === "placement" ? pill(T.wash, T.accent) : QUIET;
  return (
    <span title={p.note ?? undefined} style={style}>
      {label}
    </span>
  );
}

function Head(p: { title: string; children: React.ReactNode }) {
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

function QuestionRow(p: { q: ScanQuestion; brand: string; detailed: boolean }) {
  const q = p.q;
  /* One judge per row. The pill used to read the server's tallies while the
     two columns beside it read the per-engine rows, and a visitor can open the
     row and read those rows - so a disagreement was visible to them. */
  const label = questionPill(q);
  const silent = label === "no answer";
  const hit = label !== "not named" && !silent;
  const rows = transcript(q);

  const summary = (
    <div className={p.detailed ? "res-qrow res-qrow--full" : "res-qrow"}>
      <div style={{ fontSize: "13.5px", color: T.ink }}>
        {q.question}
        <span style={{ display: "block", ...MICRO, marginTop: "3px", color: T.soft }}>
          {q.kind}
          {typeof q.google_rank === "number" ? " - Google " + ordinal(q.google_rank) : ""}
          {rows.length ? " - read what they said" : ""}
        </span>
      </div>
      <div style={{ textAlign: "right" }}>
        <span style={silent ? QUIET : hit ? YES : NO}>{label}</span>
      </div>
      {p.detailed ? (
        <>
          <div style={{ fontSize: "13px", color: T.soft, textAlign: "right" }}>{overviewState(q)}</div>
          <div style={{ fontSize: "13px", color: T.soft }}>{namedBy(q)}</div>
        </>
      ) : null}
    </div>
  );

  if (!rows.length) {
    return <div style={{ borderBottom: "1px solid " + T.hair }}>{summary}</div>;
  }

  return (
    <details style={{ borderBottom: "1px solid " + T.hair }}>
      <summary style={{ cursor: "pointer", listStyle: "none" }}>{summary}</summary>
      <div style={{ padding: "0 26px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {rows.map((a) => (
          <div
            key={a.engine}
            style={{ background: T.bg, border: "1px solid " + T.line, borderRadius: "12px", padding: "12px 14px" }}
          >
            <p style={{ margin: "0 0 6px", fontSize: "12.5px", fontWeight: 600 }}>
              {engineLabel(a.engine)}
              <span style={{ fontWeight: 500, color: a.brand_named ? T.goodFg : T.warnFg, marginLeft: "8px" }}>
                {a.brand_named ? "names " + p.brand : "does not name " + p.brand}
              </span>
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "13.5px",
                lineHeight: 1.7,
                color: T.soft,
                whiteSpace: "pre-wrap",
                maxHeight: "280px",
                overflowY: "auto",
                maxWidth: "80ch",
              }}
            >
              {a.response_text}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}

function QuestionTable(p: { r: RunScanResponse; detailed: boolean }) {
  const qs = p.r.questions ?? [];
  if (!qs.length) return null;
  return (
    <section>
      <Head title="Question by question">
        Every question we ran, how many engines named you
        {p.detailed
          ? ", and the answer word for word. Open any row."
          : ". The words each engine used come with the report."}
      </Head>
      <div style={{ ...CARD, overflow: "hidden" }}>
        <div
          className={p.detailed ? "res-qrow res-qrow--full res-head" : "res-qrow res-head"}
          style={{ background: "#fbfbfc", borderBottom: "1px solid " + T.line }}
        >
          <div style={MICRO}>Question</div>
          <div style={{ ...MICRO, textAlign: "right" }}>Named</div>
          {p.detailed ? (
            <>
              <div style={{ ...MICRO, textAlign: "right" }}>AI Overview</div>
              <div style={MICRO}>Which engines</div>
            </>
          ) : null}
        </div>
        {qs.map((q) => (
          <QuestionRow key={q.idx} q={q} brand={p.r.brand.name} detailed={p.detailed} />
        ))}
      </div>
    </section>
  );
}

/* ── What the answers were built from ── */

function SourceTable(p: { r: RunScanResponse; domain: string; detailed: boolean; total: number }) {
  const rows = p.r.sources;
  if (!rows.length) return null;
  const more = moreSourcesNote(rows.length, p.total);
  const placements = placementsNote(rows);

  return (
    <section>
      {/*
        Two lists, two sentences, and they are not interchangeable.

        Unlocked, `r.sources` is the unlock payload: every page every answer
        cited. Locked, it is the teaser, which since 20 Sep 2026 carries only
        the source each answer reached for FIRST, deduped by domain - Danny's
        item 4, a filter in `scan_teaser` and nowhere in what the pass stores.

        So "Every page the engines drew on" is true of one of these lists and
        false of the other, and it was the only sentence here. `detailed` is
        `unlocked`, which is exactly the switch, so it carries the copy too.

        The free sentence deliberately does not say "top" or "most important".
        Position is order of citation: on an AI Overview it tracks prominence
        reasonably well, on a chat engine it may be nothing but order of
        mention. "Reached for first" is what the data supports and all it
        supports - the migration header says the same thing at more length.
      */}
      <Head title={p.detailed ? "The pages that decide this category" : "What the answers were built from"}>
        {p.detailed
          ? "Every page the engines drew on, what kind of site it is, and how many of your answers it fed. The kind matters: a listicle can be joined, a competitor own site cannot."
          : "The page each answer reached for first, deduped across the answers - not a ranking, just what came first. The kind matters: a listicle can be joined, a competitor own site cannot."}
      </Head>
      <div style={{ ...CARD, overflow: "hidden" }}>
        <div
          className="res-srow res-head"
          style={{ background: "#fbfbfc", borderBottom: "1px solid " + T.line }}
        >
          <div style={MICRO}>Source page</div>
          <div style={MICRO}>Kind</div>
          {/* The figure under this header is a count of answers, and which
              answers depends on the list - see the note above the standfirst.
              Unlocked it is every answer that cited the page; locked it is
              every answer that reached for it first. "Answers it fed" is true
              of the first and overstates the second. */}
          <div style={{ ...MICRO, textAlign: "right" }}>
            {p.detailed ? "Answers it fed" : "Reached first by"}
          </div>
          <div style={MICRO}>You appear</div>
        </div>
        {rows.map((s) => {
          const yours = isOwnDomain(s.domain, p.domain);
          return (
            <div key={s.domain} className="res-srow" style={{ borderBottom: "1px solid " + T.hair }}>
              <div style={{ fontSize: "13.5px" }}>{s.domain}</div>
              <div>
                <KindPill kind={s.kind} note={s.note} />
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 600, textAlign: "right" }}>{s.mentions}</div>
              <div>
                <span style={yours ? YES : QUIET}>{yours ? "Yours" : "Not yours"}</span>
              </div>
            </div>
          );
        })}
        {more ? (
          <p style={{ margin: 0, padding: "12px 26px", fontSize: "13px", color: T.soft }}>{more}</p>
        ) : null}
        {placements ? (
          <p style={{ margin: 0, padding: "12px 26px", fontSize: "13px", color: T.soft }}>{placements}</p>
        ) : null}
      </div>
    </section>
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

/* ── The placement list: gated, then open ── */

/**
 * The shape of the table, behind the blur.
 *
 * Grey blocks rather than invented rows. The board draws plausible-looking
 * data under the blur; putting fabricated domains in the DOM of somebody
 * report is a different thing from showing them the shape of what is coming.
 */
function LockedRows() {
  const widths = ["78%", "62%", "70%", "55%", "66%"];
  return (
    <div className="scan-gated" aria-hidden="true">
      <div className="res-prow res-head" style={{ background: "#fbfbfc", borderBottom: "1px solid " + T.line }}>
        <div style={MICRO}>Page</div>
        <div style={MICRO}>Kind</div>
        <div style={{ ...MICRO, textAlign: "right" }}>Questions</div>
        <div style={{ ...MICRO, textAlign: "right" }}>Answers you would win</div>
      </div>
      {widths.map((w, i) => (
        <div key={w + i} className="res-prow" style={{ borderBottom: "1px solid " + T.hair }}>
          <div style={{ height: "11px", width: w, background: T.chip, borderRadius: "4px" }} />
          <div style={{ height: "11px", width: "60%", background: T.chip, borderRadius: "4px" }} />
          <div style={{ height: "11px", width: "30%", background: T.chip, borderRadius: "4px", marginLeft: "auto" }} />
          <div style={{ height: "11px", width: "30%", background: T.chip, borderRadius: "4px", marginLeft: "auto" }} />
        </div>
      ))}
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
        <div style={MICRO}>Kind</div>
        <div style={{ ...MICRO, textAlign: "right" }}>Questions</div>
        <div style={{ ...MICRO, textAlign: "right" }}>Answers you would win</div>
      </div>
      {rows.map((o) => (
        <div key={o.domain} className="res-prow" style={{ borderBottom: "1px solid " + T.hair }}>
          <div>
            <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{o.domain}</div>
            {o.questions.length ? (
              <div style={{ fontSize: "12.5px", color: T.soft, marginTop: "4px", lineHeight: 1.5 }}>
                {o.questions.slice(0, 2).join(" - ") +
                  (o.questions.length > 2 ? " - and " + (o.questions.length - 2) + " more" : "")}
              </div>
            ) : null}
          </div>
          <div>
            <KindPill kind={o.kind} note={o.note} />
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
            <div style={{ fontSize: "12px", color: T.soft }}>{kindLabel(o.kind)}</div>
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

/* ── The whole page ── */

export default function ResultView(p: {
  r: RunScanResponse;
  domain: string;
  /** Total distinct sources the scan cited, which can exceed what was sent. */
  totalSources: number;
  unlocked: boolean;
  gate: React.ReactNode;
  /**
   * The count route has already answered zero, so the gate must not blur a
   * table that has no rows behind it. Undefined means not known yet, which is
   * a different thing and keeps the blur.
   */
  noPlacements?: boolean;
}) {
  const r = p.r;
  /* Every figure below is derived in result-figures.ts, which has an executor.
     Nothing in this file re-derives one. */
  const f = resultFigures(r, p.domain, { unlocked: p.unlocked, noPlacements: p.noPlacements });
  const qs = r.questions ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
      {/* Headline */}
      <div className="confirm-top">
        <div>
          <div style={MICRO}>{p.domain + " - read " + fmtDate(r.read_at)}</div>
          <h1
            style={{
              margin: "10px 0 0",
              fontSize: "32px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              color: T.ink,
            }}
          >
            {f.headline}
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: "14.5px", lineHeight: 1.65, color: T.soft, maxWidth: "58ch" }}>
            {p.unlocked
              ? "Everything is stored, so any figure here can be read back to the words that produced it."
              : "Everything you were shown while this ran is on this page, in full and free: the questions, the tallies, the leaderboard, and every page the answers were assembled from."}
          </p>
          <div style={{ marginTop: "14px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {r.engines.map((e) => {
              const colour = isEngine(e.engine) ? ENGINE_SPECS[e.engine].colour : T.faint;
              return (
                <div
                  key={e.engine}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    background: T.surface,
                    border: "1px solid " + T.line,
                    borderRadius: "999px",
                    padding: "3px 11px 3px 3px",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: "19px",
                      height: "19px",
                      borderRadius: "6px",
                      background: colour + "1a",
                      border: "1px solid " + colour + "3d",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: "12px", color: T.soft }}>{e.label}</span>
                </div>
              );
            })}
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
            note="Of the questions an engine answered at all. One nobody answered is neither named nor missing."
          />
        </div>
      </div>

      {/* The unlocked metric strip. Every figure is measured, so a figure we
          cannot measure is absent rather than estimated. */}
      {p.unlocked ? (
        <div style={{ ...CARD, display: "flex", overflow: "hidden", flexWrap: "wrap" }}>
          <Metric
            first
            label="AI visibility"
            value={f.pct === null ? "-" : f.pct + "%"}
            note={visibilityNote(f.named, f.answers, qs.length)}
          />
          <Metric label="Sources in the category" value={p.totalSources} note={sourcesNote(f.yourSources)} />
          {/* Suppressed on a partial leaderboard: naming the top brand is a
              claim about a competitor, and the brand that would have topped
              this list may be in the batch that never came back. The rank in
              its note is already null for the same reason. */}
          {f.topBrand && !r.leaderboard_partial ? (
            <Metric
              label="Top of the leaderboard"
              value={<span style={{ fontSize: "22px" }}>{f.topBrand.brand}</span>}
              note={topBrandNote(f.topBrand.mentions, f.topIsYou, r.brand.rank)}
            />
          ) : null}
          {f.bestRank !== null ? (
            <Metric
              label="Best Google position"
              value={ordinal(f.bestRank)}
              note="Your best organic position on any question in this set."
            />
          ) : null}
        </div>
      ) : null}

      <QuestionTable r={r} detailed={p.unlocked} />
      <SourceTable r={r} domain={p.domain} detailed={p.unlocked} total={p.totalSources} />
      <ShareOfVoice r={r} />

      {/* The placement list. `emptyList` is a counted zero on either side of
          the gate, and is deliberately not the same as "not counted yet". */}
      <section id="plan">
        <Head title="Pages feeding the answers you are missing from">
          The pages above, filtered to the ones feeding answers no engine named you in, and where an article can
          realistically run. Ranked by how many answers a placement would put you into.
        </Head>

        {p.unlocked ? (
          r.opportunities && r.opportunities.length ? (
            <div>
              <PlanCards r={r} />
              <div style={{ marginTop: "16px" }}>
                <PlacementTable r={r} />
              </div>
            </div>
          ) : (
            <NoPlacements sources={r.sources} />
          )
        ) : p.noPlacements ? (
          <div>
            <NoPlacements sources={r.sources} />
            <div style={{ ...CARD, padding: "24px", marginTop: "16px", maxWidth: "560px" }}>{p.gate}</div>
          </div>
        ) : (
          <div style={{ ...CARD, position: "relative", overflow: "hidden" }}>
            <LockedRows />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
              }}
            >
              <div style={{ ...CARD, padding: "24px", width: "100%", maxWidth: "560px" }}>{p.gate}</div>
            </div>
          </div>
        )}

        {f.emptyList ? null : (
          <p style={{ margin: "14px 0 0", fontSize: "13.5px", lineHeight: 1.65, color: T.soft }}>
            This list is also the <TierName tier="mentioned" /> brief. We approach the pages on it, and where
            inclusion is not editorially possible we find the contextually equivalent page and write the content that
            gets you in. You get told which ones those were.
          </p>
        )}

        {p.unlocked ? (
          <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <Link
              href="/#packages"
              className="btn-primary"
              style={{
                fontSize: "14px",
                fontWeight: 600,
                padding: "11px 20px",
                borderRadius: "10px",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              See what it costs
            </Link>
            <Link
              href="/contact"
              style={{
                background: T.surface,
                border: "1px solid " + T.line,
                color: T.ink,
                fontSize: "14px",
                fontWeight: 600,
                padding: "10px 20px",
                borderRadius: "10px",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Talk it through
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
