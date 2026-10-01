import Link from "next/link";

import EngineLogo from "@/components/EngineLogo";
import { T } from "@/config/tokens";
import { ENGINE_SPECS, type Engine } from "@/lib/scan/engines";
import { clusterCards } from "@/lib/tracking/cluster-figures";
import { rangeLabel } from "@/lib/tracking/date-range";
import { type Day, type Range, type Rate, comparisonRange, formatDay } from "@/lib/tracking/figures";
import { NAMED_TOP, namedPage } from "@/lib/tracking/named-figures";
import type { Compare, OverviewData } from "@/lib/tracking/overview-data";
import { partialRunNote } from "@/lib/tracking/run-note";

import DatePicker from "./DatePicker";
import { Chip } from "./Overview";

/**
 * Who is named (R143, 1 Oct 2026; BRIEF-4 P3): the full page of the
 * Overview's "Who is named instead" panel (boards-3/Main.dc.html), in the
 * Clusters page's shell - title block, date picker, filter row, one bordered
 * list at 18px. Every figure is named-figures.ts, which is the panel's own
 * brandBoard narrowed by the filters. Filters, "Show all" and the one-open
 * accordion are links (`?cluster=&engine=&all=1&open=`), with from/to/compare
 * kept, so the whole page works with JS off.
 */

const pct = (r: Rate) => (r.pct === null ? "-" : `${r.pct}%`);
const HEAD = { fontSize: "12px", fontWeight: 600, color: T.soft } as const;
const GRID = "minmax(0, 1fr) 96px 84px 96px 120px 76px";
const PILL = (on: boolean) =>
  ({ display: "inline-flex", alignItems: "center", gap: "6px", height: "36px", padding: "0 14px", borderRadius: "999px", border: `1px solid ${on ? T.washLine : T.line}`, background: on ? T.wash : T.surface, color: T.ink, fontSize: "13px", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }) as const;

export default function Named({
  brand,
  engines,
  today,
  range,
  compareMode,
  startedOn,
  data,
  slug,
  cluster,
  engine,
  all,
  open,
}: {
  brand: string;
  engines: readonly Engine[];
  today: Day;
  range: Range;
  compareMode: Compare;
  startedOn: string | null;
  data: OverviewData;
  slug: string;
  /** A cluster id from the URL, or null for all. Unknown ids are dropped by the page. */
  cluster: string | null;
  engine: Engine | null;
  all: boolean;
  open: string | null;
}) {
  const before = comparisonRange(range, compareMode);
  const partial = partialRunNote(data.lastRun, range, today);
  const cards = clusterCards({ clusters: data.clusters ?? [], questions: data.questions, keywords: data.keywords, answers: data.answers, serp: data.serp, range, before, today, engines });
  const picked = cluster ? cards.find((c) => c.id === cluster) ?? null : null;
  const only = picked ? new Set(picked.prompts.map((p) => p.id)) : null;
  const page = namedPage({ answers: data.answers, range, before, you: brand, only, engine });

  // Each prompt's cluster keyword and its place on the one-cluster page (`?prompt=` is that index).
  const where = new Map<string, { clusterId: string; keyword: string; index: number }>();
  for (const c of cards) c.prompts.forEach((p, i) => where.set(p.id, { clusterId: c.id, keyword: c.keyword ?? c.name, index: i }));
  const text = new Map(data.questions.map((q) => [q.id, q.text]));

  const base: Record<string, string> = { from: range.from, to: range.to, ...(compareMode === "prev" ? {} : { compare: compareMode }) };
  const state = { ...base, ...(picked ? { cluster: picked.id } : {}), ...(engine ? { engine } : {}), ...(all ? { all: "1" } : {}) };
  const href = (over: Record<string, string | null>) => {
    const q: Record<string, string> = { ...state };
    for (const [k, v] of Object.entries(over)) if (v === null) delete q[k];
    else q[k] = v;
    return `?${new URLSearchParams(q)}`;
  };
  const clusterPath = (id: string) => `/app/${encodeURIComponent(slug)}/clusters/${encodeURIComponent(id)}`;

  const shown = all ? page.rows : page.rows.slice(0, NAMED_TOP);
  const clustersCounted = picked ? 1 : cards.filter((c) => c.prompts.some((p) => p.now.den > 0)).length;
  const headline = page.answers
    ? `${page.brands} brand${page.brands === 1 ? "" : "s"} named across ${page.answers.toLocaleString("en-GB")} answers${cards.length ? ` in ${clustersCounted} cluster${clustersCounted === 1 ? "" : "s"}` : ""}.`
    : null;

  return (
    <div className="app-col" style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>Who is named</h1>
          <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.5, color: T.soft, maxWidth: "680px" }}>Every brand the engines name in answers to your prompts, with its share of every brand mention.</p>
          {partial ? <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.5, color: T.soft, maxWidth: "680px" }}>{partial}</p> : null}
        </div>
        <DatePicker range={range} compare={compareMode} today={today} startedOn={startedOn} grow={false}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
            <span style={{ fontSize: "14px", fontWeight: 700 }}>{rangeLabel(range, today, startedOn)}</span>
            <span style={{ fontSize: "12px", color: T.soft }}>
              {formatDay(range.from)} - {formatDay(range.to, true)}
              {before ? `, vs ${formatDay(before.from)} - ${formatDay(before.to)}` : ""}
            </span>
          </span>
        </DatePicker>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {cards.length ? (
          <nav aria-label="Filter by cluster" className="app-nm-filters" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Link href={href({ cluster: null, open: null })} aria-current={!picked ? "true" : undefined} style={PILL(!picked)}>
              All clusters
            </Link>
            {cards.map((c) => (
              <Link key={c.id} href={href({ cluster: c.id, open: null })} aria-current={picked?.id === c.id ? "true" : undefined} style={PILL(picked?.id === c.id)}>
                {c.keyword ?? c.name}
              </Link>
            ))}
          </nav>
        ) : null}
        <nav aria-label="Filter by engine" className="app-nm-filters" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link href={href({ engine: null, open: null })} aria-current={!engine ? "true" : undefined} style={PILL(!engine)}>
            All engines
          </Link>
          {engines.map((e) => (
            <Link key={e} href={href({ engine: e, open: null })} aria-current={engine === e ? "true" : undefined} style={PILL(engine === e)}>
              <EngineLogo engine={e} size={16} />
              {ENGINE_SPECS[e].label}
            </Link>
          ))}
        </nav>
      </div>

      <section aria-labelledby="nm-h" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "18px", overflow: "hidden" }}>
        <h2 id="nm-h" style={{ margin: 0, padding: "18px 24px 14px", fontSize: "15px", fontWeight: 600, color: T.ink }}>
          {headline ?? "No answers in this range yet."}
        </h2>
        {headline ? (
          <>
            <div className="app-nm-grid app-hide-sm" style={{ display: "grid", gridTemplateColumns: GRID, gap: "16px", padding: "10px 24px", borderTop: `1px solid ${T.line}` }}>
              <span style={HEAD}>Brand</span>
              <span style={{ ...HEAD, textAlign: "right" }}>Answers</span>
              <span style={{ ...HEAD, textAlign: "right" }}>Share</span>
              <span style={{ ...HEAD, textAlign: "right" }}>{before ? "Vs last period" : "Change"}</span>
              <span style={HEAD}>Engines</span>
              <span style={{ ...HEAD, textAlign: "right" }}>Prompts</span>
            </div>
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {shown.map((r) => {
                const isOpen = open === r.key;
                return (
                  <li key={r.key} style={{ borderTop: `1px solid ${T.line}`, background: r.you ? T.wash : undefined }}>
                    <Link href={href({ open: isOpen ? null : r.key })} scroll={false} aria-expanded={isOpen} className="app-nm-grid" style={{ display: "grid", gridTemplateColumns: GRID, gap: "16px", alignItems: "center", padding: "14px 24px", color: T.ink, textDecoration: "none" }}>
                      <span className="app-nm-name" style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, fontSize: "14px", fontWeight: r.you ? 700 : 600, color: r.you ? T.accent : T.ink }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.soft} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, transform: isOpen ? "rotate(90deg)" : undefined }}>
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                        <span style={{ overflowWrap: "break-word", minWidth: 0 }}>{r.name}</span>
                        {r.you ? <span style={{ padding: "1px 8px", borderRadius: "999px", background: T.surface, border: `1px solid ${T.washLine}`, fontSize: "11px", fontWeight: 700, color: T.ink }}>You</span> : null}
                      </span>
                      <span className="app-nm-answers" style={{ textAlign: "right", fontSize: "14px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {r.answers.toLocaleString("en-GB")}
                        <span className="app-show-sm" style={{ fontWeight: 400, color: T.soft }}>{" answers"}</span>
                      </span>
                      <span className="app-hide-sm" style={{ textAlign: "right", fontSize: "14px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }} title={`${r.share.num} of ${r.share.den} mentions`}>
                        {pct(r.share)}
                      </span>
                      <span className="app-nm-change" style={{ display: "flex", justifyContent: "flex-end" }}>
                        {r.isNew ? <span style={{ fontSize: "12px", fontWeight: 600, color: T.soft }}>New</span> : before && r.answers ? <Chip value={r.delta} unit=" pts" none="-" /> : null}
                      </span>
                      <span className="app-nm-engines" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        {engines.map((e) => (
                          <span key={e} style={{ display: "inline-flex", opacity: r.engines.includes(e) ? 1 : 0.22 }}>
                            <EngineLogo engine={e} size={16} title={`${ENGINE_SPECS[e].label}${r.engines.includes(e) ? " named" : " did not name"} ${r.name}`} />
                          </span>
                        ))}
                      </span>
                      <span className="app-nm-prompts" style={{ textAlign: "right", fontSize: "13px", color: T.soft, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {`${r.prompts.length} prompt${r.prompts.length === 1 ? "" : "s"}`}
                      </span>
                    </Link>
                    {isOpen ? (
                      r.prompts.length ? (
                        <ul style={{ listStyle: "none", margin: 0, padding: "0 24px 16px 44px", display: "flex", flexDirection: "column", gap: "2px" }}>
                          {r.prompts.map((p) => {
                            const w = where.get(p.id);
                            return (
                              <li key={p.id} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px 16px", flexWrap: "wrap", padding: "8px 0", borderTop: `1px solid ${T.hair}` }}>
                                <span style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: "1 1 320px" }}>
                                  {w ? (
                                    <Link href={`${clusterPath(w.clusterId)}?${new URLSearchParams({ ...base, prompt: String(w.index) })}`} style={{ fontSize: "14px", fontWeight: 600, color: T.ink, textDecoration: "none", overflowWrap: "anywhere" }}>
                                      {text.get(p.id) ?? "A stopped prompt"}
                                    </Link>
                                  ) : (
                                    <span style={{ fontSize: "14px", fontWeight: 600, overflowWrap: "anywhere" }}>{text.get(p.id) ?? "A stopped prompt"}</span>
                                  )}
                                  {w ? <span style={{ fontSize: "12px", color: T.soft }}>{w.keyword}</span> : null}
                                </span>
                                <span style={{ fontSize: "13px", color: T.soft, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{`Named ${p.daysNamed} of ${p.daysAnswered} day${p.daysAnswered === 1 ? "" : "s"} answered`}</span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p style={{ margin: 0, padding: "0 24px 16px 44px", fontSize: "13px", color: T.soft }}>{r.you ? "No answer named you in this range." : "Not named in this range."}</p>
                      )
                    ) : null}
                  </li>
                );
              })}
            </ol>
            {!all && page.rows.length > NAMED_TOP ? (
              <div style={{ borderTop: `1px solid ${T.line}`, padding: "14px 24px" }}>
                <Link href={href({ all: "1" })} style={{ fontSize: "14px", fontWeight: 600, color: T.accent, textDecoration: "none" }}>
                  {`Show all ${page.rows.length}`}
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <p style={{ margin: 0, padding: "0 24px 20px", fontSize: "14px", color: T.soft }}>
            {picked || engine ? "No answers match these filters in this range. Clear a filter or pick another range." : "The figures fill in from the first daily check."}
          </p>
        )}
      </section>
      <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: T.soft, maxWidth: "820px" }}>
        Share is a brand&apos;s mentions out of every brand mention in these answers; one answer naming a brand is one mention. Change is in points against the comparison period.
      </p>
    </div>
  );
}
