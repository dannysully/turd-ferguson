import Link from "next/link";

import EngineLogo from "@/components/EngineLogo";
import { CLOSE_WASH, D } from "@/components/home/dark";
import { T } from "@/config/tokens";
import { ENGINE_SPECS, type Engine } from "@/lib/scan/engines";
import {
  type Day,
  type Range,
  type Rate,
  addDays,
  brandBoard,
  citedPages,
  dailySeries,
  daysIn,
  formatDay,
  keywordRows,
  movers,
  overview,
  pointsDelta,
  sparkPoints,
} from "@/lib/tracking/figures";
import { type ClusterCard, clusterCards, clusterChart, clusterSummary } from "@/lib/tracking/cluster-figures";
import type { Compare, OverviewData } from "@/lib/tracking/overview-data";

import ClusterChart from "./ClusterChart";
import OverviewChart, { type ChartDay } from "./OverviewChart";

/**
 * The alwaystracked overview (T4, 29 Sep 2026), in the order
 * boards/Main.dc.html draws it: the dark headline card and the check grid,
 * the four key figures, the chart, biggest movers and who is named instead,
 * then Google keywords and the pages the engines cite most. Since T4b part 3
 * (30 Sep 2026) the headline, heat map and key figures read by cluster, as
 * boards-3/Main.dc.html draws them, from `cluster-figures.ts`.
 *
 * Every figure is a count from stored rows (BRIEF decision 10), computed in
 * `figures.ts`, and each rate is shown with its numerator and denominator.
 * Rendered on the server, so the settled figures are there with JS off.
 */

const WORDS = ["no", "one", "two", "three", "four", "five"];

function enginesSentence(engines: readonly Engine[]): string {
  const names = engines.map((e) => ENGINE_SPECS[e].label);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "");
}

const span = (r: Range, year = false) => `${formatDay(r.from)} - ${formatDay(r.to, year)}`;
const pct = (r: Rate) => (r.pct === null ? "-" : `${r.pct}%`);

/** The London wall-clock time of a timestamp, "06:10". */
function londonTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

function Delta({ value, unit = " pts", dark = false }: { value: number | null; unit?: string; dark?: boolean }) {
  if (value === null) return null;
  if (value === 0) return <span style={{ fontSize: "13px", color: dark ? D.cardHead : T.soft, whiteSpace: "nowrap" }}>No change</span>;
  const up = value > 0;
  const fg = dark ? D.accent : up ? T.goodFg : T.badFg;
  const bg = dark ? D.field : up ? T.goodBg : T.badBg;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", padding: "2px 8px 2px 5px", borderRadius: "999px", background: bg, color: fg, fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
      </svg>
      {up ? "+" : "−"}
      {Math.abs(value)}
      {unit}
    </span>
  );
}

const CARD: React.CSSProperties = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: "18px" };
const H2: React.CSSProperties = { margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em", color: T.ink };
const LABEL: React.CSSProperties = { fontSize: "13px", fontWeight: 600, color: T.soft };
const TH: React.CSSProperties = { textAlign: "left", fontSize: "12px", fontWeight: 600, color: T.soft, padding: "10px 24px", borderBottom: `1px solid ${T.line}` };
const TD: React.CSSProperties = { padding: "12px 24px", borderBottom: `1px solid ${T.hair}`, fontSize: "14px", color: T.ink, verticalAlign: "middle", whiteSpace: "nowrap" };
/** The one column that wraps and takes the slack. */
const TD_WIDE: React.CSSProperties = { ...TD, whiteSpace: "normal", width: "100%", minWidth: "160px" };

/** The heat colour of one check-grid cell: the dark ground's bar at 0%, the dark accent at 60% and over. */
const heat = (p: number | null) => (p === null ? D.bar : `color-mix(in srgb, ${D.accent} ${Math.round(Math.min(p / 60, 1) * 100)}%, ${D.bar})`);

export default function Overview({
  brand,
  domain,
  market,
  engines,
  startedOn,
  today,
  range,
  compareMode,
  data,
  selected,
}: {
  brand: string;
  domain: string;
  market: string;
  engines: readonly Engine[];
  startedOn: Day | null;
  today: Day;
  range: Range;
  compareMode: Compare;
  data: OverviewData;
  /** The cluster the chart shows, from `?cluster=`. */
  selected?: string;
}) {
  const where = market === "UK" ? "the United Kingdom" : "the United States";
  const o = overview({ range, compare: compareMode, startedOn, engines, questions: data.questions, answers: data.answers, serp: data.serp, keywordCount: data.keywords.filter((k) => k.stopped_on === null).length });
  // BRIEF-3 T4b part 3 (30 Sep 2026): the headline, heat map and four figures
  // read by cluster (boards-3/Main.dc.html). A client with no cluster rows yet
  // keeps the flat T4 reading rather than print 0 of 0. `?.` because
  // /app/parity reads docs/parity/T4/fixture.json, generated before clusters.
  const clusterInput = data.clusters?.length
    ? { clusters: data.clusters, questions: data.questions, keywords: data.keywords, answers: data.answers, serp: data.serp, range, before: o.compare, today, engines }
    : null;
  const cards = clusterInput ? clusterCards(clusterInput) : null;
  const cs = cards ? clusterSummary(cards) : null;
  // T4b part 5b: the picked card (?cluster=) sets the chart; the first card by default, as the board opens on c1.
  const picked = cards ? (cards.find((c) => c.id === selected) ?? cards[0]!) : null;
  const pickedChart = clusterInput && picked ? clusterChart(clusterInput, picked.id) : null;
  const clusterHref = (id: string) => `?${new URLSearchParams({ from: range.from, to: range.to, ...(compareMode === "prev" ? {} : { compare: compareMode }), cluster: id })}`;
  const heatRows = cards ? cards.filter((c) => c.status !== "pending") : [];
  const pendingKeywords = cards ? cards.filter((c) => c.status === "pending" && c.keyword).length : 0;
  const liveQuestions = data.questions.filter((q) => q.stopped_on === null && q.added_on <= today).length;
  const hasData = o.named.den > 0;
  const beforeRange = !!startedOn && range.to < startedOn;

  const header = (
    <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }} className={cards ? "app-hide-sm" : undefined}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>Overview</h1>
        <p style={{ margin: 0, fontSize: "14px", color: T.soft }}>
          {brand} in {where}. {cards ? `${cards.length} cluster${cards.length === 1 ? "" : "s"} on ` : ""}
          {enginesSentence(engines)}.
        </p>
      </div>
      <div className={cards ? "app-date" : undefined} style={{ display: "flex", alignItems: "center", gap: "12px", height: "48px", padding: "0 14px", border: `1px solid ${T.line}`, borderRadius: "12px", background: T.surface, color: T.ink }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        {/* Mobile.dc.html: one line, "Last 28 days 2 - 29 Sep", no comparison range. */}
        {cards ? (
          <span className="app-show-sm" style={{ fontSize: "14px" }}>
            <strong>{daysIn(range).length === 28 && range.to === today ? "Last 28 days" : `${daysIn(range).length} days`}</strong>{" "}
            <span style={{ color: T.soft }}>{span(range)}</span>
          </span>
        ) : null}
        <span className={cards ? "app-hide-sm" : undefined} style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
          <span style={{ fontSize: "14px", fontWeight: 700 }}>{daysIn(range).length === 28 && range.to === today ? "Last 28 days" : `${daysIn(range).length} days`}</span>
          <span style={{ fontSize: "12px", color: T.soft }}>
            {span(range, true)}
            {o.compare ? `, vs ${span(o.compare)}` : ""}
          </span>
        </span>
      </div>
    </header>
  );

  const checked = data.lastRun?.finished_at
    ? data.lastRun.run_date === today
      ? `Checked today at ${londonTime(data.lastRun.finished_at)}. Next check tomorrow at 06:00.`
      : `Last checked ${formatDay(data.lastRun.run_date)} at ${londonTime(data.lastRun.finished_at)}. Next check at 06:00.`
    : "Your first check runs tomorrow at 06:00.";
  // Mobile.dc.html: "Checked today at 06:10", nothing after it.
  const checkedShort = data.lastRun?.finished_at && data.lastRun.run_date === today ? `Checked today at ${londonTime(data.lastRun.finished_at)}` : null;

  if (!hasData) {
    const line = beforeRange && startedOn ? `Tracking began ${formatDay(startedOn, true)}.` : "Your first check runs tomorrow at 06:00.";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
        {header}
        <section aria-label="Headline" className="on-dark" style={{ padding: "36px 40px", borderRadius: "18px", background: `${CLOSE_WASH}, ${D.ground}`, color: T.surface }}>
          <h2 style={{ margin: 0, fontSize: "28px", lineHeight: 1.2, fontWeight: 700, letterSpacing: "-0.03em" }}>{line}</h2>
          <p style={{ margin: "12px 0 0", fontSize: "16px", lineHeight: 1.55, color: D.cardHead, maxWidth: "520px" }}>
            {liveQuestions ? `${liveQuestions} prompts are set up on ${WORDS[engines.length] ?? engines.length} engines. ` : ""}
            The figures fill in from the first daily check, and history starts that day.
          </p>
        </section>
      </div>
    );
  }

  // ---- 1. headline ----
  const lflDelta = cs ? cs.lflDelta : o.lfl ? pointsDelta(o.lfl.now, o.lfl.before) : null;
  const gridDays = daysIn(range).slice(-28);
  const gridFrom = daysIn(range).length - gridDays.length;
  const questionsAnswered = o.questions.den;
  const direction = (d: number) => (d > 0 ? "up from" : d < 0 ? "down from" : "the same as");
  const headlineRate = cs ? cs.now : o.named;
  const subLine = cs
    ? `${cs.now.num.toLocaleString("en-GB")} of ${cs.now.den.toLocaleString("en-GB")} answers across ${cs.clusters} cluster${cs.clusters === 1 ? "" : "s"}, ${cs.prompts} prompts and ${WORDS[engines.length] ?? engines.length} engines.`
    : `${o.named.num.toLocaleString("en-GB")} of ${o.named.den.toLocaleString("en-GB")} answers across ${questionsAnswered} prompts and ${WORDS[engines.length] ?? engines.length} engines.`;
  const lflLine = cs
    ? cs.lflBefore && lflDelta !== null
      ? ` On the ${cs.clustersLfl} cluster${cs.clustersLfl === 1 ? "" : "s"} tracked all period that's ${pct(cs.lfl)}, ${direction(lflDelta)} ${pct(cs.lflBefore)}.`
      : ""
    : o.lfl && lflDelta !== null
      ? ` On the ${o.lfl.questions} prompts tracked all period that's ${pct(o.lfl.now)}, ${direction(lflDelta)} ${pct(o.lfl.before)}.`
      : "";

  // ---- 3. chart ----
  const toChart = (days: ReturnType<typeof dailySeries>): ChartDay[] => days.map((d) => ({ label: formatDay(d.day), all: d.all, by: d.by }));
  const lflIds = o.compare ? new Set(data.questions.filter((q) => q.added_on <= o.compare!.from && (q.stopped_on === null || q.stopped_on > range.to)).map((q) => q.id)) : null;
  const addedMid = data.questions.filter((q) => q.added_on > range.from && q.added_on <= range.to);
  const lflNote =
    o.lfl && addedMid.length
      ? `Like-for-like leaves out the ${addedMid.length === 1 ? "prompt" : `${addedMid.length} prompts`} added on ${[...new Set(addedMid.map((q) => formatDay(q.added_on)))].join(", ")}.`
      : o.compareHidden;
  const notes = [
    ...data.notes.map((n) => ({ day: n.note_date, text: n.text })),
    ...[...new Set(addedMid.map((q) => q.added_on))].map((d) => {
      const n = addedMid.filter((q) => q.added_on === d).length;
      return { day: d, text: `${n} prompt${n === 1 ? "" : "s"} added` };
    }),
  ]
    .map((n) => ({ index: daysIn(range).indexOf(n.day), text: n.text }))
    .filter((n) => n.index >= 0);

  // ---- 4 and 5 ----
  const text = new Map(data.questions.map((q) => [q.id, q.text]));
  const moved = movers(data.answers, range, o.compare).slice(0, 6);
  const board = brandBoard(data.answers, range, o.compare, brand);
  const top = board.slice(0, 5);
  const rest = board.slice(5);
  const restShare = rest.reduce((s, b) => s + b.share.num, 0);
  const brandTotal = board.reduce((s, b) => s + b.share.num, 0);
  const kwRows = keywordRows(data.serp, { from: addDays(range.to, -27) < range.from ? range.from : addDays(range.to, -27), to: range.to });
  const pages = citedPages(data.answers, range, domain);

  // The four lower cards; the cluster layout keeps two of them (boards-3/Main.dc.html).
  const moversCard = (
    <section aria-labelledby="movers-h" tabIndex={0} style={{ ...CARD, paddingTop: "22px", minWidth: 0, overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 24px 14px" }}>
            <h2 id="movers-h" style={H2}>
              Biggest movers
            </h2>
            <span style={{ fontSize: "13px", color: T.soft }}>{`All ${questionsAnswered} prompts`}</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={TH}>Prompt</th>
                <th style={TH} className="app-hide-sm">Named by</th>
                <th style={{ ...TH, textAlign: "right" }}>Rate</th>
                <th style={{ ...TH, textAlign: "right" }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {moved.map((m) => (
                <tr key={m.id}>
                  <td style={TD_WIDE}>{text.get(m.id) ?? "A prompt no longer tracked"}</td>
                  <td style={TD} className="app-hide-sm">
                    <span style={{ display: "flex", gap: "4px" }}>
                      {engines.map((e) => (
                        <span key={e} style={{ opacity: m.engines.includes(e) ? 1 : 0.25 }}>
                          <EngineLogo engine={e} size={16} title={`${ENGINE_SPECS[e].label}${m.engines.includes(e) ? " named you" : " did not name you"}`} />
                        </span>
                      ))}
                    </span>
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }} title={`${m.now.num} of ${m.now.den} answers`}>
                    {pct(m.now)}
                  </td>
                  <td style={{ ...TD, textAlign: "right" }}>{m.delta === null ? <span style={{ fontSize: "13px", color: T.soft }}>New</span> : <Delta value={m.delta} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
  );
  const whoNamed = (
    <section aria-labelledby="lb-h" style={{ ...CARD, paddingTop: "22px", minWidth: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "0 24px 14px" }}>
            <h2 id="lb-h" style={H2}>
              Who is named instead
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: T.soft }}>Share of every brand mention across your prompts.</p>
          </div>
          <ol style={{ listStyle: "none", margin: 0, padding: "0 0 8px" }}>
            {top.map((b, i) => (
              <li key={b.name} className="app-brand" style={{ display: "grid", gridTemplateColumns: "20px minmax(0, 1fr) 72px 40px 78px", gap: "12px", alignItems: "center", padding: "10px 24px", background: b.you ? T.wash : undefined }}>
                <span style={{ fontSize: "13px", color: T.soft, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                <span style={{ fontSize: "14px", fontWeight: b.you ? 700 : 500, color: b.you ? T.accent : T.ink, overflowWrap: "anywhere" }}>{b.name}</span>
                <span aria-hidden="true" className="app-hide-sm" style={{ height: "6px", borderRadius: "999px", background: T.hair }}>
                  <span style={{ display: "block", height: "100%", width: `${Math.round(((b.share.num || 0) / (top[0]!.share.num || 1)) * 100)}%`, borderRadius: "999px", background: b.you ? T.accent : T.faint }} />
                </span>
                <span style={{ fontSize: "14px", fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }} title={`${b.share.num} of ${b.share.den} mentions`}>
                  {pct(b.share)}
                </span>
                <span style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Delta value={b.delta} />
                </span>
              </li>
            ))}
            {rest.length ? (
              <li className="app-brand" style={{ display: "grid", gridTemplateColumns: "20px minmax(0, 1fr) 72px 40px 78px", gap: "12px", alignItems: "center", padding: "10px 24px" }}>
                <span />
                <span style={{ fontSize: "14px", color: T.soft }}>{`${rest.length} other${rest.length === 1 ? "" : "s"}`}</span>
                <span aria-hidden="true" className="app-hide-sm" style={{ height: "6px", borderRadius: "999px", background: T.hair }}>
                  <span style={{ display: "block", height: "100%", width: `${Math.min(100, Math.round((restShare / (top[0]!.share.num || 1)) * 100))}%`, borderRadius: "999px", background: T.faint }} />
                </span>
                <span style={{ fontSize: "14px", fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{brandTotal ? `${Math.round((restShare / brandTotal) * 100)}%` : "-"}</span>
                <span />
              </li>
            ) : null}
          </ol>
          <p style={{ margin: 0, padding: "4px 24px 20px", fontSize: "13px", color: T.soft }}>{`${board.length} brand${board.length === 1 ? " was" : "s were"} named across ${o.named.den.toLocaleString("en-GB")} answers.`}</p>
        </section>
  );
  const keywordsCard = (
    <section aria-labelledby="kw-h" tabIndex={0} style={{ ...CARD, paddingTop: "22px", minWidth: 0, overflowX: "auto" }}>
          <div style={{ padding: "0 24px 14px" }}>
            <h2 id="kw-h" style={H2}>
              Google keywords
            </h2>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...TH, paddingRight: "8px" }}>Keyword</th>
                <th style={{ ...TH, padding: "10px 8px" }} className="app-hide-sm">4 weeks</th>
                <th style={{ ...TH, padding: "10px 8px", textAlign: "right" }}>Position</th>
                <th style={{ ...TH, paddingLeft: "8px", textAlign: "right" }}>Places</th>
              </tr>
            </thead>
            <tbody>
              {data.keywords
                .filter((k) => k.stopped_on === null)
                .map((k) => {
                  const row = kwRows.get(k.id);
                  return (
                    <tr key={k.id}>
                      {/* One line, as the board keeps it; the phone lets it wrap (R104). */}
                      <td style={{ ...TD_WIDE, whiteSpace: "nowrap", fontWeight: 500, paddingRight: "8px" }} className="app-kw">{k.keyword}</td>
                      <td style={{ ...TD, padding: "12px 8px", lineHeight: 0 }} className="app-hide-sm">{row ? <Spark series={row.series} colour={!row.change ? T.soft : row.change > 0 ? T.goodFg : T.badFg} /> : null}</td>
                      <td style={{ ...TD, padding: "12px 8px", textAlign: "right", fontSize: "15px", fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {k.added_on > today ? <span style={{ fontWeight: 400, fontSize: "13px", color: T.soft }}>First check tomorrow at 06:00</span> : row?.position ? `#${row.position}` : <span style={{ fontWeight: 400, fontSize: "13px", color: T.soft }}>Not in top 20</span>}
                      </td>
                      <td style={{ ...TD, paddingLeft: "8px", textAlign: "right" }}>{row?.change === null || row?.change === undefined ? null : <Delta value={row.change} unit="" />}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </section>
  );
  const citedCard = (
    <section aria-labelledby="cited-h" style={{ ...CARD, paddingTop: "22px", minWidth: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "0 24px 14px" }}>
            <h2 id="cited-h" style={H2}>
              Pages the engines cite most
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: T.soft }}>Times cited in answers to your prompts.</p>
          </div>
          {pages.length ? (
            <ol style={{ listStyle: "none", margin: 0, padding: "0 24px 12px" }}>
              {pages.map((p) => (
                <li key={p.page} style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.hair}` }}>
                  <span style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, overflowWrap: "anywhere" }}>{p.page}</span>
                    <span style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      {p.engines.map((e) => (
                        <EngineLogo key={e} engine={e as Engine} size={14} title={ENGINE_SPECS[e as Engine]?.label ?? e} />
                      ))}
                    </span>
                  </span>
                  <span style={{ display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 }}>
                    {p.yours ? <span style={{ fontSize: "12px", fontWeight: 600, color: T.accent, background: T.wash, borderRadius: "999px", padding: "2px 8px" }}>You</span> : null}
                    <span style={{ fontSize: "14px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{p.count}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p style={{ margin: 0, padding: "0 24px 20px", fontSize: "14px", color: T.soft }}>No engine cited a page in this range.</p>
          )}
          {/* BRIEF T4: the alwaysmentioned line appears only when at least one
              cited publisher provably does not name the client, with that
              count. Nothing stored yet says what a cited page names - the
              runner keeps the citation, not the page - so the line stays off
              rather than claim a count it cannot stand behind. */}
        </section>
  );

  return (
    <div className={cs ? "app-col" : undefined} style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
      {header}

      <section aria-label="Headline" className="on-dark app-headline" style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: cs ? "40px" : "48px", padding: cs ? "34px 36px" : "36px 40px", borderRadius: "18px", background: `${CLOSE_WASH}, ${D.ground}`, color: T.surface, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: "1 1 320px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: D.muted }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: D.accent }} />
            {cs && checkedShort ? (
              <>
                <span className="app-hide-sm">{checked}</span>
                <span className="app-show-sm">{checkedShort}</span>
              </>
            ) : (
              checked
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: cs ? "36px" : "40px", lineHeight: 1.12, fontWeight: 700, letterSpacing: "-0.03em", maxWidth: "520px" }} className={cs ? "app-headline-h app-hide-sm" : "app-headline-h"}>
            {brand} was named in <span data-figure="headline-named">{pct(headlineRate)}</span> of AI answers
          </h2>
          {/* Mobile.dc.html's short headline and one-line sub-line (T4b mobile, 30 Sep 2026): the same figures, fewer words. */}
          {cs ? (
            <h2 className="app-show-sm" style={{ margin: 0, fontSize: "28px", lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.03em" }}>
              {`Named in ${pct(headlineRate)} of AI answers`}
            </h2>
          ) : null}
          <p className={cs ? "app-hide-sm" : undefined} style={{ margin: 0, fontSize: cs ? "15px" : "16px", lineHeight: 1.55, color: D.cardHead, maxWidth: "500px" }}>
            {subLine}
            {lflLine}
            {o.compareHidden ? ` ${o.compareHidden}` : ""}
          </p>
          {cs ? (
            <p className="app-show-sm" style={{ margin: 0, fontSize: "14px", lineHeight: 1.5, color: D.cardHead }}>
              {`${cs.now.num.toLocaleString("en-GB")} of ${cs.now.den.toLocaleString("en-GB")} answers across ${cs.clusters} cluster${cs.clusters === 1 ? "" : "s"}.`}
              {cs.lflBefore && lflDelta !== null ? ` Like-for-like ${pct(cs.lfl)}, ${direction(lflDelta)} ${pct(cs.lflBefore)}.` : ""}
            </p>
          ) : null}
          {o.compare ? (
            <div className={cs ? "app-hide-sm" : undefined} style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
              {lflDelta !== null ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px 4px 7px", borderRadius: "999px", background: D.field, color: D.accent, fontSize: "13px", fontWeight: 600 }}>
                  {lflDelta === 0 ? "No change" : `${lflDelta > 0 ? "+" : "−"}${Math.abs(lflDelta)} pts`} like-for-like
                </span>
              ) : null}
              <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: "999px", background: D.fieldLine, color: D.cardHead, fontSize: "13px", fontWeight: 500 }}>vs {span(o.compare)}</span>
            </div>
          ) : null}
        </div>

        {cs ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: "0 1 auto", minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: D.cardHead }}>
              <span className="app-hide-sm">Every daily check, by cluster</span>
              <span className="app-show-sm">Every daily check, one row per cluster</span>
            </div>
            <div style={{ display: "flex", gap: "12px", minWidth: 0 }}>
              <div className="app-heat-labels app-hide-sm" style={{ display: "flex", flexDirection: "column", width: "196px", minWidth: 0, flexShrink: 1 }}>
                {heatRows.map((c) => (
                  <div key={c.id} style={{ height: "11px", marginBottom: "3px", display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: "11px", fontWeight: 500, color: D.cardHead, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1 }}>
                    {c.keyword ?? c.name}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0, flex: "0 1 auto" }}>
                <svg width={gridDays.length * 14 - 3} height={heatRows.length * 14 - 3} viewBox={`0 0 ${gridDays.length * 14 - 3} ${heatRows.length * 14 - 3}`} style={{ maxWidth: "100%", height: "auto" }} role="img" aria-label={`Daily share of answers naming ${brand}, one row per cluster, ${formatDay(gridDays[0]!)} to ${formatDay(gridDays[gridDays.length - 1]!, true)}`}>
                  {heatRows.map((c, row) =>
                    gridDays.map((d, col) => {
                      const cell = c.heat[gridFrom + col] ?? null;
                      const label = `${c.keyword ?? c.name}, ${formatDay(d)}: ${cell ? `${cell.pct}% (${cell.num} of ${cell.den})` : "not tracked yet"}`;
                      return cell ? (
                        <rect key={`${c.id}-${d}`} x={col * 14} y={row * 14} width={11} height={11} rx={3} fill={heat(cell.pct)}>
                          <title>{label}</title>
                        </rect>
                      ) : (
                        <rect key={`${c.id}-${d}`} x={col * 14 + 0.5} y={row * 14 + 0.5} width={10} height={10} rx={2.5} fill="none" stroke={D.quiet} strokeOpacity={0.45}>
                          <title>{label}</title>
                        </rect>
                      );
                    }),
                  )}
                </svg>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: D.quiet }}>
                  <span>{formatDay(gridDays[0]!)}</span>
                  <span className="app-hide-sm">{formatDay(gridDays[Math.floor(gridDays.length / 2)]!)}</span>
                  <span>{gridDays[gridDays.length - 1] === today ? "Today" : formatDay(gridDays[gridDays.length - 1]!)}</span>
                </div>
              </div>
            </div>
            <div className="app-hide-sm" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: D.quiet, flexWrap: "wrap" }}>
              {`Share of the cluster's ${5 * engines.length} answers naming you that day`}
              <span style={{ display: "flex", gap: "3px" }} aria-hidden="true">
                {[0, 15, 30, 45, 60].map((p) => (
                  <span key={p} style={{ width: "11px", height: "11px", borderRadius: "3px", background: heat(p) }} />
                ))}
              </span>
              0 to 60%+
              <span aria-hidden="true" style={{ display: "inline-flex", width: "10px", height: "10px", borderRadius: "2.5px", border: `1px solid ${D.quiet}`, opacity: 0.45, marginLeft: "6px" }} />
              not tracked yet
            </div>
          </div>
        ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: "0 1 auto", minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: D.cardHead }}>Every daily check, by engine</div>
          <div style={{ display: "flex", gap: "12px", minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {engines.map((e) => (
                <div key={e} style={{ height: "14px", display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: "12px", fontWeight: 500, color: D.cardHead, whiteSpace: "nowrap" }}>
                  {ENGINE_SPECS[e].label}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0, flex: "1 1 auto" }}>
              <svg width={gridDays.length * 17 - 3} height={engines.length * 17 - 3} viewBox={`0 0 ${gridDays.length * 17 - 3} ${engines.length * 17 - 3}`} style={{ maxWidth: "100%", height: "auto" }} role="img" aria-label={`Each engine's daily share of prompts naming ${brand}, ${formatDay(gridDays[0]!)} to ${formatDay(gridDays[gridDays.length - 1]!)}`}>
                {engines.map((e, row) =>
                  gridDays.map((d, col) => {
                    const cell = o.grid[e]?.[gridFrom + col] ?? null;
                    return (
                      <rect key={`${e}-${d}`} x={col * 17} y={row * 17} width={14} height={14} rx={3} fill={heat(cell?.pct ?? null)}>
                        <title>{`${ENGINE_SPECS[e].label}, ${formatDay(d)}: ${cell ? `${cell.pct}% (${cell.num} of ${cell.den})` : "no check"}`}</title>
                      </rect>
                    );
                  }),
                )}
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: D.quiet }}>
                <span>{formatDay(gridDays[0]!)}</span>
                <span>{formatDay(gridDays[Math.floor(gridDays.length / 2)]!)}</span>
                <span>{gridDays[gridDays.length - 1] === today ? "Today" : formatDay(gridDays[gridDays.length - 1]!)}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: D.quiet, flexWrap: "wrap" }}>
            Share of prompts naming you that day
            <span style={{ display: "flex", gap: "3px" }} aria-hidden="true">
              {[0, 15, 30, 45, 60].map((p) => (
                <span key={p} style={{ width: "12px", height: "12px", borderRadius: "3px", background: heat(p) }} />
              ))}
            </span>
            0 to 60%+
          </div>
        </div>
        )}
      </section>

      <section aria-label="Key figures" className={cs ? "app-figures app-hide-sm" : "app-figures"} style={{ ...CARD, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", overflow: "hidden" }}>
        {(cs
          ? [
              {
                figure: "named",
                label: "Answers naming you",
                value: pct(cs.now),
                delta: <Delta value={cs.lflDelta} />,
                foot: <span style={{ fontSize: "13px", color: T.soft }}>{`${cs.now.num.toLocaleString("en-GB")} of ${cs.now.den.toLocaleString("en-GB")} answers${cs.lflDelta !== null ? ". Change is like-for-like" : ""}`}</span>,
              },
              {
                figure: "questions",
                label: "Prompts you are named in",
                value: `${cs.promptsNamed.num} of ${cs.promptsNamed.den}`,
                delta: cs.promptsNamedBefore ? <span style={{ fontSize: "13px", color: T.soft }}>{`was ${cs.promptsNamedBefore.num} of ${cs.promptsNamedBefore.den}`}</span> : null,
                foot: <span style={{ fontSize: "13px", color: T.soft }}>{cs.never.length ? `${cs.never.length} never name you` : "Named in every prompt"}</span>,
              },
              {
                figure: "sov",
                label: "Share of voice",
                value: pct(o.sov),
                delta: <Delta value={pointsDelta(o.sov, o.sovBefore)} />,
                foot: <span style={{ fontSize: "13px", color: T.soft }}>{o.sov.rank ? `${ordinal(o.sov.rank)} of ${o.sov.brands} brands named` : `Not named; ${o.sov.brands} other brands were`}</span>,
              },
              {
                figure: "keywords",
                label: "Cluster keywords on page 1",
                value: `${cs.page1.num} of ${cs.page1.den}`,
                delta: cs.page1Before !== null ? <Delta value={cs.page1.num - cs.page1Before} unit="" /> : null,
                foot: (
                  <span style={{ fontSize: "13px", color: T.soft }}>
                    {`${cs.page1.avg === null ? "No keyword in the top 20 yet" : `Average position ${cs.page1.avg}`}${pendingKeywords ? `. ${pendingKeywords} more from tomorrow` : ""}`}
                  </span>
                ),
              },
            ]
          : [
          {
            figure: "named",
            label: "Answers naming you",
            value: pct(o.named),
            delta: <Delta value={pointsDelta(o.named, o.namedBefore)} />,
            foot: <span style={{ fontSize: "13px", color: T.soft }}>{`${o.named.num.toLocaleString("en-GB")} of ${o.named.den.toLocaleString("en-GB")} answers`}</span>,
          },
          {
            figure: "questions",
            label: "Prompts you are named in",
            value: `${o.questions.num} of ${o.questions.den}`,
            delta: o.questionsBefore && o.questionsBefore.den ? <span style={{ fontSize: "13px", color: T.soft }}>{`was ${o.questionsBefore.num} of ${o.questionsBefore.den}`}</span> : null,
            foot: o.questions.den - o.questions.num ? <span style={{ fontSize: "13px", color: T.soft }}>{`${o.questions.den - o.questions.num} never name you`}</span> : <span style={{ fontSize: "13px", color: T.soft }}>Named in every prompt</span>,
          },
          {
            figure: "sov",
            label: "Share of voice",
            value: pct(o.sov),
            delta: <Delta value={pointsDelta(o.sov, o.sovBefore)} />,
            foot: <span style={{ fontSize: "13px", color: T.soft }}>{o.sov.rank ? `${ordinal(o.sov.rank)} of ${o.sov.brands} brands named` : `Not named; ${o.sov.brands} other brands were`}</span>,
          },
          {
            figure: "keywords",
            label: "Google keywords on page 1",
            value: `${o.keywords.num} of ${o.keywords.den}`,
            delta: o.keywordsBefore && o.keywordsBefore.den ? <Delta value={o.keywords.num - o.keywordsBefore.num} unit="" /> : null,
            foot: <span style={{ fontSize: "13px", color: T.soft }}>{o.keywords.avg === null ? "No keyword in the top 20 yet" : `Average position ${o.keywords.avg}`}</span>,
          },
        ]).map((f, i) => (
          <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "22px 24px", minWidth: 0, borderLeft: i ? `1px solid ${T.line}` : undefined, marginLeft: i ? "-1px" : undefined }}>
            <div style={LABEL}>{f.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "30px", fontWeight: 700, letterSpacing: "-0.03em", color: T.ink, fontVariantNumeric: "tabular-nums" }} data-figure={f.figure}>{f.value}</span>
              {f.delta}
            </div>
            {f.foot}
          </div>
        ))}
      </section>

      {/* Mobile.dc.html's four figure cards (T4b mobile, 30 Sep 2026): the headline already says the named share, so the phone trades it for rank among brands. Same figures as above. */}
      {cs ? (
        <section aria-label="Key figures" className="app-show-sm">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
            {[
              { label: "Prompts named in", value: `${cs.promptsNamed.num} of ${cs.promptsNamed.den}`, foot: cs.promptsNamedBefore ? <span style={{ fontSize: "12px", color: T.soft }}>{`was ${cs.promptsNamedBefore.num} of ${cs.promptsNamedBefore.den}`}</span> : null },
              { label: "Share of voice", value: pct(o.sov), foot: <Delta value={pointsDelta(o.sov, o.sovBefore)} /> },
              { label: "Keywords on page 1", value: `${cs.page1.num} of ${cs.page1.den}`, foot: cs.page1Before !== null ? <Delta value={cs.page1.num - cs.page1Before} unit="" /> : null },
              {
                label: "Rank among brands",
                value: o.sov.rank ? `${ordinal(o.sov.rank)} of ${o.sov.brands}` : "-",
                foot: board[0] ? <span style={{ fontSize: "12px", color: T.soft }}>{board[0].you ? "You lead" : `${board[0].name} leads`}</span> : null,
              },
            ].map((f) => (
              <div key={f.label} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px", padding: "16px", background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", minWidth: 0 }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: T.soft }}>{f.label}</span>
                <span style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.03em", color: T.ink, fontVariantNumeric: "tabular-nums" }}>{f.value}</span>
                {f.foot}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {cards ? <ClusterCards cards={cards} engines={engines} picked={picked?.id ?? null} href={clusterHref} /> : null}
      {cards ? <ClusterRows cards={cards} picked={picked?.id ?? null} href={clusterHref} /> : null}

      {picked && pickedChart ? (
        <ClusterChart
          data={{
            keyword: picked.keyword ?? picked.name,
            site: domain,
            brand,
            days: pickedChart.days.map((d, i) => (i === pickedChart.days.length - 1 && d === today ? "Today" : formatDay(d))),
            dayLabels: pickedChart.days.map((d) => formatDay(d, true)),
            named: pickedChart.named,
            google: pickedChart.google,
            prevLabels: o.compare ? daysIn(o.compare).map((d) => formatDay(d)) : null,
            namedBefore: pickedChart.namedBefore,
            googleBefore: pickedChart.googleBefore,
            beforeLabel: o.compare ? span(o.compare) : null,
            answersPerDay: picked.prompts.length * engines.length,
            pending: picked.status === "pending",
            note: picked.status !== "pending" && !pickedChart.namedBefore?.some((p) => p !== null) ? `Tracked from ${formatDay(picked.started_on)}. No earlier period to compare yet.` : null,
          }}
        />
      ) : (
      <OverviewChart
        data={{
          engines: [...engines],
          now: toChart(dailySeries(data.answers, range, engines)),
          before: o.compare ? toChart(dailySeries(data.answers, o.compare, engines)).slice(0, daysIn(range).length) : null,
          lflNow: lflIds ? toChart(dailySeries(data.answers, range, engines, lflIds)) : null,
          lflBefore: lflIds && o.compare ? toChart(dailySeries(data.answers, o.compare, engines, lflIds)).slice(0, daysIn(range).length) : null,
          beforeLabel: o.compare ? span(o.compare) : null,
          lflNote,
          notes,
          brand,
          questions: questionsAnswered,
        }}
      />
      )}

      {cards ? (
        <div className="app-pair" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "24px" }}>
          {whoNamed}
          {citedCard}
        </div>
      ) : (
        <>
          <div className="app-pair" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)", gap: "24px" }}>
            {moversCard}
            {whoNamed}
          </div>
          <div className="app-pair" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)", gap: "24px" }}>
            {keywordsCard}
            {citedCard}
          </div>
        </>
      )}
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A change chip in the cards' 12px size, or the grey word when there is no change to show. */
export function Chip({ value, unit, none, size = 12 }: { value: number | null; unit: string; none: string; size?: number }) {
  if (value === null || value === 0) return <span style={{ fontSize: `${size}px`, fontWeight: 600, color: T.soft, whiteSpace: "nowrap" }}>{value === 0 ? "No change" : none}</span>;
  const up = value > 0;
  const fg = up ? T.goodFg : T.badFg;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", padding: "2px 8px 2px 5px", borderRadius: "999px", background: up ? T.goodBg : T.badBg, color: fg, fontSize: `${size}px`, fontWeight: 600, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
      </svg>
      {up ? "+" : "−"}
      {Math.abs(value)}
      {unit}
    </span>
  );
}

/**
 * "Your clusters" (T4b part 4, 30 Sep 2026; boards-3/Main.dc.html): two
 * columns, one card per cluster - keyword, intent and volume, the cluster's
 * rate and change, one row per angle with the engines that named the client
 * and a rate bar, lines joining each row to the Google node. Purple for a
 * prompt named in range, grey dashed for one that never was. Static until the
 * chart below is set by the picked card: each card is a link to `?cluster=`,
so picking works with JS off (T4b part 5b).
 */
function ClusterCards({ cards, engines, picked, href }: { cards: ClusterCard[]; engines: readonly Engine[]; picked: string | null; href: (id: string) => string }) {
  return (
    <section aria-labelledby="cl-h" className="app-hide-sm" style={{ ...CARD, padding: "22px 24px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <h2 id="cl-h" style={H2}>
          Your clusters
        </h2>
        <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.5, color: T.soft, maxWidth: "760px" }}>
          Each cluster is one Google keyword and the 5 prompts about it. An engine mark is full where that engine named you at least once this period. Pick a cluster to chart it below.
        </p>
      </div>
      <div className="app-pair" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
        {cards.map((c) => {
          const pending = c.status === "pending";
          const meta = [c.intent ? cap(c.intent) : null, c.volume !== null ? `${c.volume.toLocaleString("en-GB")} searches a month` : null].filter(Boolean).join(", ");
          const since = formatDay(c.started_on);
          const foot = pending
            ? "First check tomorrow at 06:00."
            : `${c.promptsNamed.num} of ${c.promptsNamed.den} prompts name you. Tracked since ${since}${c.status === "added" ? ", so no change yet" : ""}.`;
          const rowY = (i: number) => 11 + i * 26;
          const h = Math.max(1, c.prompts.length) * 26 - 4;
          const mid = h / 2;
          const on = c.id === picked;
          return (
            <Link key={c.id} href={href(c.id)} scroll={false} aria-current={on ? "true" : undefined} style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px 18px 14px", border: `1px solid ${on ? T.accent : T.line}`, borderRadius: "16px", background: T.surface, boxShadow: on ? `0 0 0 3px ${T.wash}` : "none", color: T.ink, textDecoration: "none", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, letterSpacing: "-0.01em", color: T.ink }}>{c.keyword ?? c.name}</h3>
                  {meta ? <span style={{ fontSize: "12px", color: T.soft }}>{meta}</span> : null}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }} title={pending ? undefined : `${c.now.num} of ${c.now.den} answers`}>
                    {pct(c.now)}
                  </span>
                  <Chip value={c.delta} unit=" pts" none={pending ? "Tomorrow" : "New"} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "4px", flexGrow: 1, minWidth: 0 }}>
                  {c.prompts.map((r) => (
                    <li key={r.id} title={r.text} style={{ display: "flex", alignItems: "center", gap: "8px", height: "22px" }}>
                      <span style={{ width: "80px", flexShrink: 0, fontSize: "12px", fontWeight: 600, color: pending ? T.soft : T.ink }}>{r.angle ? cap(r.angle) : "Prompt"}</span>
                      {pending ? (
                        <span style={{ fontSize: "12px", color: T.soft }}>Asked from tomorrow, 06:00</span>
                      ) : (
                        <>
                          <span style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                            {engines.map((e) => (
                              <span key={e} style={{ display: "inline-flex", opacity: r.namedBy.includes(e) ? 1 : 0.22 }}>
                                <EngineLogo engine={e} size={16} title={`${ENGINE_SPECS[e].label}${r.namedBy.includes(e) ? " named you" : " did not name you"}: ${r.text}`} />
                              </span>
                            ))}
                          </span>
                          <span aria-hidden="true" style={{ flexGrow: 1, height: "6px", borderRadius: "3px", background: T.hair, overflow: "hidden" }}>
                            <span style={{ display: "block", height: "100%", width: `${Math.min(100, (r.now.pct ?? 0) * 1.6)}%`, borderRadius: "3px", background: r.now.num ? T.accent : T.line }} />
                          </span>
                          <span style={{ width: "34px", flexShrink: 0, textAlign: "right", fontSize: "12px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }} title={`${r.now.num} of ${r.now.den} answers`}>
                            {pct(r.now)}
                          </span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <svg width="56" height={h} viewBox={`0 0 56 ${h}`} aria-hidden="true" style={{ flexShrink: 0 }}>
                  {c.prompts.map((r, i) => (
                    <path
                      key={r.id}
                      d={`M0,${rowY(i)} C30,${rowY(i)} 26,${mid} 56,${mid}`}
                      fill="none"
                      stroke={pending ? T.line : r.now.num ? D.accent : D.cardHead}
                      strokeWidth={1.6}
                      strokeDasharray={pending || !r.now.num ? "3 4" : undefined}
                      strokeLinecap="round"
                    />
                  ))}
                  <circle cx={54} cy={mid} r={3} fill={pending ? T.line : T.accent} />
                </svg>
                <div style={{ width: "108px", flexShrink: 0, boxSizing: "border-box", padding: "10px 12px", borderRadius: "12px", border: `1px solid ${on ? T.washLine : T.line}`, background: T.bg, display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: T.soft }}>Google</span>
                  <span style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{c.position === null ? "-" : `#${c.position}`}</span>
                  <Chip value={c.positionChange} unit="" none={pending ? "Tomorrow" : "New"} />
                </div>
              </div>
              <span style={{ fontSize: "12px", color: T.soft }}>{foot}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/**
 * The phone's "Your clusters" (T4b mobile part 4, 30 Sep 2026;
 * boards-3/Mobile.dc.html): one compact row per cluster in place of the
 * desktop cards - a dot per prompt (filled where it named the client this
 * period) joined to the Google node, the keyword and its prompt count, the
 * rate and its change. Swapped by CSS, so it stands with JS off; each row
 * picks the chart below, as the cards do. The board's "Manage" link waits
 * for T6: there is no clusters screen to send it to yet.
 */
function ClusterRows({ cards, picked, href }: { cards: ClusterCard[]; picked: string | null; href: (id: string) => string }) {
  return (
    <section aria-labelledby="cl-h-sm" className="app-show-sm" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "16px", paddingTop: "14px" }}>
      <h2 id="cl-h-sm" style={{ margin: "0 16px 10px", fontSize: "16px", fontWeight: 700, color: T.ink }}>
        Your clusters
      </h2>
      <p style={{ margin: "0 16px 10px", fontSize: "12px", lineHeight: 1.5, color: T.soft }}>Each keyword and its 5 prompts. A filled dot is a prompt that named you this period.</p>
      {cards.map((c) => {
        const pending = c.status === "pending";
        const h = Math.max(1, c.prompts.length) * 9 + 1;
        const mid = h / 2;
        return (
          <Link key={c.id} href={href(c.id)} scroll={false} aria-current={c.id === picked ? "true" : undefined} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderTop: `1px solid ${T.hair}`, color: T.ink, textDecoration: "none" }}>
            <svg width="36" height={h} viewBox={`0 0 36 ${h}`} aria-hidden="true" style={{ flexShrink: 0 }}>
              {c.prompts.map((r, i) => {
                const y = 5 + i * 9;
                const named = !pending && r.now.num > 0;
                return (
                  <g key={r.id}>
                    <circle cx={5} cy={y} r={3.5} fill={pending ? T.wash : named ? T.accent : T.line} />
                    <path d={`M9,${y} C22,${y} 20,${mid} 34,${mid}`} fill="none" stroke={named ? T.washLine : T.line} strokeWidth={1.4} />
                  </g>
                );
              })}
            </svg>
            <span style={{ width: "44px", height: "40px", flexShrink: 0, boxSizing: "border-box", borderRadius: "10px", border: `1px solid ${pending ? T.line : T.washLine}`, background: T.surface, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "9px", fontWeight: 600, color: T.soft }}>Google</span>
              <span style={{ fontSize: "14px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{c.position === null ? "-" : `#${c.position}`}</span>
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: "3px", flexGrow: 1, minWidth: 0 }}>
              <span style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.3 }}>{c.keyword ?? c.name}</span>
              <span style={{ fontSize: "12px", color: T.soft }}>
                {pending ? (c.intent ? `${cap(c.intent)}, no readings yet` : "No readings yet") : `${c.promptsNamed.num} of ${c.promptsNamed.den} prompts name you`}
              </span>
            </span>
            {pending ? (
              <span style={{ fontSize: "12px", color: T.soft, textAlign: "right", flexShrink: 0 }}>
                First check
                <br />
                tomorrow, 06:00
              </span>
            ) : (
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                <span style={{ fontSize: "16px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }} title={`${c.now.num} of ${c.now.den} answers`}>
                  {pct(c.now)}
                </span>
                <Chip value={c.delta} unit=" pts" none="New" size={11} />
              </span>
            )}
          </Link>
        );
      })}
    </section>
  );
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}

/** A keyword's four weeks, one point a week on its own scale (sparkPoints), gaps where it was outside the top 20 or not read. */
function Spark({ series, colour }: { series: (number | null)[]; colour: string }) {
  const w = 64;
  const h = 20;
  let d = "";
  let pen = false;
  for (const p of sparkPoints(series, w, h)) {
    if (p.y === null) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${p.x},${p.y} `;
    pen = true;
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d.trim()} fill="none" stroke={colour} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
