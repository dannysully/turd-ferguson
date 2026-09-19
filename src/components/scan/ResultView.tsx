"use client";

import TierName from "@/components/TierName";
import { CARD, MICRO, T } from "@/config/tokens";
import type { RunScanResponse, ScanQuestion } from "@/lib/scan";
import { ENGINE_SPECS, isEngine } from "@/lib/scan/engines";
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso: string): string {
  const parts = iso.slice(0, 10).split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return iso;
  return d + " " + MONTHS[m - 1] + " " + y;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

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
const KINDS: Record<string, string> = {
  own: "yours",
  placement: "placement",
  competitor: "competitor",
  review: "review site",
  other: "other",
};

function KindPill(p: { kind: string | null; note: string | null }) {
  if (!p.kind) return null;
  const label = KINDS[p.kind] ?? KINDS.other;
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

function engineLabel(key: string): string {
  return isEngine(key) ? ENGINE_SPECS[key].label : key;
}

/** Which engines named the brand, in words rather than a count. */
function namedBy(q: ScanQuestion): string {
  const rows = q.answers ?? [];
  const named = rows.filter((a) => a.brand_named).map((a) => engineLabel(a.engine));
  if (!rows.length) return "";
  if (!named.length) return "none of them";
  return named.join(", ");
}

/** Whether Google returned an AI Overview at all for this question. */
function overviewState(q: ScanQuestion): string {
  const row = (q.answers ?? []).find((a) => a.engine === "google_aio");
  if (!row) return "";
  if (!row.answered) return "none shown";
  return row.brand_named ? "mentioned" : "shown, absent";
}

function QuestionRow(p: { q: ScanQuestion; brand: string; detailed: boolean }) {
  const q = p.q;
  const silent = q.answered === 0;
  const hit = q.named > 0;
  const transcript = (q.answers ?? []).filter((a) => a.response_text?.trim());

  const summary = (
    <div className={p.detailed ? "res-qrow res-qrow--full" : "res-qrow"}>
      <div style={{ fontSize: "13.5px", color: T.ink }}>
        {q.question}
        <span style={{ display: "block", ...MICRO, marginTop: "3px", color: T.faint }}>
          {q.kind}
          {typeof q.google_rank === "number" ? " - Google " + ordinal(q.google_rank) : ""}
          {transcript.length ? " - read what they said" : ""}
        </span>
      </div>
      <div style={{ textAlign: "right" }}>
        <span style={silent ? QUIET : hit ? YES : NO}>
          {silent ? "no answer" : hit ? q.named + " of " + q.answered : "not named"}
        </span>
      </div>
      {p.detailed ? (
        <>
          <div style={{ fontSize: "13px", color: T.soft, textAlign: "right" }}>{overviewState(q)}</div>
          <div style={{ fontSize: "13px", color: T.soft }}>{namedBy(q)}</div>
        </>
      ) : null}
    </div>
  );

  if (!transcript.length) {
    return <div style={{ borderBottom: "1px solid " + T.hair }}>{summary}</div>;
  }

  return (
    <details style={{ borderBottom: "1px solid " + T.hair }}>
      <summary style={{ cursor: "pointer", listStyle: "none" }}>{summary}</summary>
      <div style={{ padding: "0 26px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {transcript.map((a) => (
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
  const classified = rows.some((s) => s.kind);
  const placements = rows.filter((s) => s.kind === "placement").length;
  const hidden = Math.max(0, p.total - rows.length);

  return (
    <section>
      <Head title={p.detailed ? "The pages that decide this category" : "What the answers were built from"}>
        Every page the engines drew on, what kind of site it is, and how many of your answers it fed. The kind
        matters: a listicle can be joined, a competitor own site cannot.
      </Head>
      <div style={{ ...CARD, overflow: "hidden" }}>
        <div
          className="res-srow res-head"
          style={{ background: "#fbfbfc", borderBottom: "1px solid " + T.line }}
        >
          <div style={MICRO}>Source page</div>
          <div style={MICRO}>Kind</div>
          <div style={{ ...MICRO, textAlign: "right" }}>Answers it fed</div>
          <div style={MICRO}>You appear</div>
        </div>
        {rows.map((s) => {
          const yours = s.domain === p.domain || s.domain.endsWith("." + p.domain);
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
        {hidden > 0 ? (
          <p style={{ margin: 0, padding: "12px 26px", fontSize: "13px", color: T.soft }}>
            {"The " + rows.length + " most-cited of " + p.total + " pages the engines drew on. The rest come with the report."}
          </p>
        ) : null}
        {classified ? (
          <p style={{ margin: 0, padding: "12px 26px", fontSize: "13px", color: T.soft }}>
            {placements + (placements === 1 ? " of these is a page" : " of these are pages") + " a brand can realistically be placed into."}
          </p>
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
  const subject = p.r.brand.name.toLowerCase();

  return (
    <section>
      <Head title="Who is being named instead">
        The same question set scored for every brand in the category. This is the gap, and it is the number that has
        to move.
      </Head>
      <div style={{ ...CARD, padding: "22px 26px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "11px", maxWidth: "820px" }}>
          {rows.slice(0, 12).map((b) => {
            const you = b.brand.toLowerCase() === subject;
            return (
              <div key={b.brand} className="seq-sov">
                <div style={{ fontSize: "13.5px", fontWeight: you ? 700 : 500, color: you ? T.ink : T.soft }}>
                  {b.brand}
                </div>
                <div style={{ height: "22px", background: T.chip, borderRadius: "4px", overflow: "hidden" }}>
                  <div
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
        <p style={{ margin: "14px 0 0", fontSize: "12.5px", color: T.faint }}>
          {"Mentions across the answers these engines gave, " + (rows.length > 12 ? "top 12 of " + rows.length + " brands." : rows.length + " brands in all.")}
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
  const rows = (p.r.opportunities ?? []).slice(0, 3);
  if (!rows.length) return null;
  const order = ["First", "Second", "Third"];
  return (
    <div className="seq-three" style={{ marginTop: "16px" }}>
      {rows.map((o, i) => (
        <div
          key={o.domain}
          style={{ background: T.bg, border: "1px solid " + T.line, borderRadius: "14px", padding: "18px" }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <div style={{ ...MICRO, flexGrow: 1 }}>{order[i] + " - join"}</div>
            <div style={{ fontSize: "12px", color: T.soft }}>{KINDS[o.kind] ?? KINDS.other}</div>
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
}) {
  const r = p.r;
  const answers = r.engines.reduce((a, e) => a + e.answered, 0);
  const named = r.engines.reduce((a, e) => a + e.named, 0);
  const missing = answers - named;
  const pct = answers > 0 ? Math.round((named / answers) * 100) : null;

  const qs = r.questions ?? [];
  const answeredQs = qs.filter((q) => q.answered > 0);
  const blank = answeredQs.filter((q) => q.named === 0).length;

  const ranks = qs.map((q) => q.google_rank).filter((v): v is number => typeof v === "number");
  const bestRank = ranks.length ? Math.min(...ranks) : null;
  const leader = r.leaderboard.find((b) => b.brand.toLowerCase() !== r.brand.name.toLowerCase());
  const yourSources = r.sources.filter((s) => s.domain === p.domain || s.domain.endsWith("." + p.domain)).length;

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
            {answers === 0
              ? "No engine answered these questions yet."
              : missing === 0
                ? "Every answer named you."
                : missing + " of " + answers + " AI answers did not name you."}
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
                {named} <span style={unit}>{"of " + answers}</span>
              </>
            }
            note={pct === null ? "No engine answered yet." : pct + "% across the question set"}
          />
          <Metric
            label="Questions with no mention"
            value={
              <>
                {blank} <span style={unit}>{"of " + qs.length}</span>
              </>
            }
            note="Not named on any engine that answered"
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
            value={pct === null ? "-" : pct + "%"}
            note={named + " of " + answers + " answers named you, across " + qs.length + " questions."}
          />
          <Metric
            label="Sources in the category"
            value={p.totalSources}
            note={"Distinct pages the answers were assembled from. You appear in " + yourSources + "."}
          />
          {leader ? (
            <Metric
              label="Top of the leaderboard"
              value={<span style={{ fontSize: "22px" }}>{leader.brand}</span>}
              note={
                leader.mentions +
                " mentions" +
                (r.brand.rank ? ". You sit " + ordinal(r.brand.rank) + "." : ".")
              }
            />
          ) : null}
          {bestRank !== null ? (
            <Metric
              label="Best Google position"
              value={ordinal(bestRank)}
              note="Your best organic position on any question in this set."
            />
          ) : null}
        </div>
      ) : null}

      <QuestionTable r={r} detailed={p.unlocked} />
      <SourceTable r={r} domain={p.domain} detailed={p.unlocked} total={p.totalSources} />
      <ShareOfVoice r={r} />

      {/* The placement list */}
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
            <div style={{ ...CARD, padding: "22px 26px" }}>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.65, color: T.soft }}>
                None this time. Every page the engines cited for these questions either already names you, is a
                competitor own site, or is somewhere an article cannot run. That is a finding, not a gap in the scan.
              </p>
            </div>
          )
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

        <p style={{ margin: "14px 0 0", fontSize: "13.5px", lineHeight: 1.65, color: T.soft }}>
          This list is also the <TierName tier="mentioned" /> brief. We approach the pages on it, and where inclusion
          is not editorially possible we find the contextually equivalent page and write the content that gets you in.
          You get told which ones those were.
        </p>

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
