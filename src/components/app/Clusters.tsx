import Link from "next/link";

import EngineLogo from "@/components/EngineLogo";
import { APP_LIMITS } from "@/config/contact";
import { T } from "@/config/tokens";
import { ENGINE_SPECS, type Engine } from "@/lib/scan/engines";
import { type ClusterCard, type ClusterFilter as Filter, clusterCards, filterClusters, namedCount, neverCount } from "@/lib/tracking/cluster-figures";
import { type Range, comparisonRange, daysIn, formatDay } from "@/lib/tracking/figures";
import type { Compare, OverviewData } from "@/lib/tracking/overview-data";

import { Chip } from "./Overview";

/**
 * The Clusters page (BRIEF-3 T6 part 1, 30 Sep 2026; boards-3/Questions.dc.html):
 * "What we track", the filters and search, the usage bar and the accordion -
 * one row per cluster, one open at a time. A closed row is the keyword, its
 * meta, a dot per prompt naming you, the AI rate and the Google position with
 * their changes; the open row lists its 5 prompts with each engine's days
 * named of days checked, joined to the keyword card.
 *
 * Read-only in this part. Opening, filtering and searching are links and a
 * GET form (`?open=&filter=&q=`), so all of it works with JS off. Stop, the
 * free slot, the pending editor and "Add a cluster" come with the write
 * routes (C2's limits), so none is drawn as a control that does nothing.
 */


const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pctText = (p: number | null) => (p === null ? "-" : `${p}%`);
const ROW_H = 64;
const PITCH = ROW_H + 4;
const BLOCK_H = 5 * PITCH - 4;
const GRID = "28px minmax(0, 1fr) 168px 132px 132px";

export default function Clusters({
  brand,
  engines,
  today,
  range,
  compareMode,
  data,
  clusterLimit,
  open,
  filter,
  q,
}: {
  brand: string;
  engines: readonly Engine[];
  today: string;
  range: Range;
  compareMode: Compare;
  data: OverviewData;
  clusterLimit: number;
  open: string | null;
  filter: Filter;
  q: string;
}) {
  const before = comparisonRange(range, compareMode);
  const cards = clusterCards({ clusters: data.clusters ?? [], questions: data.questions, keywords: data.keywords, answers: data.answers, serp: data.serp, range, before, today, engines });
  const shown = filterClusters(cards, filter, q);
  // The board opens on the first cluster; `?open=` with no id closes them all.
  const openId = open ?? cards[0]?.id ?? null;
  const base: Record<string, string> = { from: range.from, to: range.to, ...(compareMode === "prev" ? {} : { compare: compareMode }) };
  const href = (extra: Record<string, string>) => `?${new URLSearchParams({ ...base, ...(filter === "all" ? {} : { filter }), ...(q ? { q } : {}), ...extra })}`;
  const used = cards.length;
  const full = used >= clusterLimit;
  const live = cards.filter((c) => c.status !== "pending");
  const filters: [Filter, string][] = [
    ["all", `All ${cards.length}`],
    ["named", `Naming you ${live.filter((c) => namedCount(c) > 0).length}`],
    ["never", `With prompts that never name you ${live.filter((c) => neverCount(c) > 0).length}`],
  ];
  const engineNames = engines.map((e) => ENGINE_SPECS[e].label);
  const since = before ? formatDay(addDaysBack(range.from)) : null;

  return (
    <div className="app-col" style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700, letterSpacing: "-0.03em", color: T.ink }}>What we track</h1>
          <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.5, color: T.soft, maxWidth: "680px" }}>
            Each cluster is one Google keyword and 5 prompts about it. Every prompt is asked on {engineNames.length > 1 ? `${engineNames.slice(0, -1).join(", ")} and ${engineNames[engineNames.length - 1]}` : engineNames[0]} each morning, and every keyword is checked on Google. Changes start at the next daily check.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", height: "48px", padding: "0 14px", border: `1px solid ${T.line}`, borderRadius: "12px", background: T.surface, color: T.ink }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
            <span style={{ fontSize: "14px", fontWeight: 700 }}>{daysIn(range).length === 28 && range.to === today ? "Last 28 days" : `${daysIn(range).length} days`}</span>
            <span style={{ fontSize: "12px", color: T.soft }}>
              {formatDay(range.from)} - {formatDay(range.to, true)}
              {before ? `, vs ${formatDay(before.from)} - ${formatDay(before.to)}` : ""}
            </span>
          </span>
        </div>
      </header>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <nav aria-label="Filter clusters" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {filters.map(([key, label]) => {
              const on = filter === key;
              const params = { ...base, ...(key === "all" ? {} : { filter: key }), ...(q ? { q } : {}) };
              return (
                <Link key={key} href={`?${new URLSearchParams(params)}`} aria-current={on ? "true" : undefined} style={{ display: "inline-flex", alignItems: "center", height: "36px", padding: "0 14px", borderRadius: "999px", border: `1px solid ${on ? T.washLine : T.line}`, background: on ? T.wash : T.surface, color: T.ink, fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
                  {label}
                </Link>
              );
            })}
          </nav>
          <form method="get" role="search" style={{ display: "flex", alignItems: "center", gap: "8px", width: "280px", maxWidth: "100%", height: "40px", boxSizing: "border-box", padding: "0 12px", border: `1px solid ${T.line}`, borderRadius: "12px", background: T.surface }}>
            <input id="cl-from" type="hidden" name="from" value={range.from} />
            <input id="cl-to" type="hidden" name="to" value={range.to} />
            {compareMode === "prev" ? null : <input id="cl-compare" type="hidden" name="compare" value={compareMode} />}
            {filter === "all" ? null : <input id="cl-filter" type="hidden" name="filter" value={filter} />}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.soft} strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            <label htmlFor="q-search" className="sr-only">
              Search clusters and prompts
            </label>
            <input id="q-search" name="q" defaultValue={q} maxLength={APP_LIMITS.search} placeholder="Search keywords and prompts" style={{ flexGrow: 1, minWidth: 0, border: 0, outline: 0, fontFamily: "inherit", fontSize: "14px", color: T.ink, background: "transparent" }} />
          </form>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "200px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: T.ink }}>{`${used} of ${clusterLimit} clusters in use`}</span>
          <span aria-hidden="true" style={{ height: "6px", borderRadius: "3px", background: T.hair, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${Math.min(100, Math.round((100 * used) / clusterLimit))}%`, background: full ? T.warnFg : T.accent, borderRadius: "3px" }} />
          </span>
        </div>
      </div>

      <section aria-label="Clusters" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "18px", overflow: "hidden" }}>
        <div className="app-cl-grid app-hide-sm" style={{ display: "grid", gridTemplateColumns: GRID, gap: "16px", padding: "14px 24px 12px" }}>
          <span />
          <span style={HEAD}>Keyword and its prompts</span>
          <span style={HEAD}>Prompts naming you</span>
          <span style={{ ...HEAD, textAlign: "right" }}>Named, vs last period</span>
          <span style={{ ...HEAD, textAlign: "right" }}>{since ? `Position, vs ${since}` : "Position"}</span>
        </div>
        {shown.map((c) => (
          <ClusterRow key={c.id} c={c} brand={brand} open={c.id === openId} toggle={href({ open: c.id === openId ? "" : c.id })} since={since} />
        ))}
        {shown.length === 0 ? (
          <div style={{ padding: "32px 24px", borderTop: `1px solid ${T.line}`, fontSize: "14px", color: T.soft }}>
            {q.trim() ? `Nothing matches “${q.trim()}”. Clear the search to see every cluster.` : cards.length ? "No clusters match this filter." : "No clusters yet. nomada digital sets up your first one when tracking starts."}
          </div>
        ) : null}
      </section>
      <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: T.soft, maxWidth: "820px" }}>
        The number beside each engine is the days it named {brand} for that prompt, out of the days checked. Stopping a prompt or a cluster keeps its history in your reports. A new prompt or cluster starts at the next daily check.
      </p>
    </div>
  );
}

const HEAD: React.CSSProperties = { fontSize: "12px", fontWeight: 600, color: T.soft };

/** The day before a range starts - the board's "vs 1 Sep" for a range from 2 Sep. */
function addDaysBack(d: string): string {
  return new Date(Date.parse(`${d}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}

function ClusterRow({ c, brand, open, toggle, since }: { c: ClusterCard; brand: string; open: boolean; toggle: string; since: string | null }) {
  const pending = c.status === "pending";
  const kw = c.keyword ?? c.name;
  const vol = c.volume !== null ? `${c.volume.toLocaleString("en-GB")} searches a month` : null;
  const lead = [c.intent ? cap(c.intent) : null, vol].filter(Boolean).join(", ");
  const meta = pending ? `${lead ? `${lead}. ` : ""}First check tomorrow at 06:00` : `${lead ? `${lead}. ` : ""}Since ${formatDay(c.started_on)}`;
  const named = namedCount(c);
  const mid = BLOCK_H / 2;
  return (
    <div style={{ borderTop: `1px solid ${T.line}`, background: open ? T.bg : T.surface }}>
      <Link href={toggle} scroll={false} aria-expanded={open} className="app-cl-grid" style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "center", gap: "16px", padding: "16px 24px", color: T.ink, textDecoration: "none" }}>
        <span aria-hidden="true" style={{ display: "flex", width: "28px", height: "28px", alignItems: "center", justifyContent: "center", borderRadius: "8px", background: T.chip, transform: `rotate(${open ? 90 : 0}deg)` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
          <span style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.01em" }}>{kw}</span>
          <span style={{ fontSize: "12px", color: T.soft }}>{meta}</span>
        </span>
        <span className="app-hide-sm" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <span style={{ fontSize: "12px", color: T.soft }}>{pending ? "Checked from tomorrow" : `${named} of ${c.prompts.length} name you`}</span>
          <span style={{ display: "flex", gap: "4px" }}>
            {c.prompts.map((p) => {
              const fill = pending ? T.wash : p.now.num > 0 ? T.accent : T.line;
              return <span key={p.id} style={{ width: "22px", height: "8px", borderRadius: "4px", background: fill }} />;
            })}
          </span>
        </span>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <span style={{ fontSize: "12px", color: T.soft }}>AI answers</span>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "17px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }} title={pending ? undefined : `${c.now.num} of ${c.now.den} answers`}>
              {pctText(c.now.pct)}
            </span>
            <Chip value={c.delta} unit=" pts" none={pending ? "Tomorrow" : "New"} />
          </span>
        </span>
        <span className="app-hide-sm" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <span style={{ fontSize: "12px", color: T.soft }}>Google</span>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "17px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{c.position === null ? "-" : `#${c.position}`}</span>
            <Chip value={c.positionChange} unit="" none={pending ? "Tomorrow" : "New"} />
          </span>
        </span>
      </Link>

      {open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "4px 24px 22px" }}>
          <div className="app-cl-body" style={{ display: "flex", alignItems: "center" }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "4px", flexGrow: 1, minWidth: 0 }}>
              {c.prompts.map((p) => (
                <li key={p.id} className="app-cl-prompt" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 52px 76px", alignItems: "center", gap: "12px", minHeight: `${ROW_H}px`, boxSizing: "border-box", padding: "8px 12px 8px 14px", borderRadius: "12px", background: T.surface, border: `1px solid ${T.hair}` }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px", minWidth: 0 }}>
                    <div className="app-cl-text-row" style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <span style={{ flexShrink: 0, padding: "2px 8px", borderRadius: "6px", background: T.chip, color: T.soft, fontSize: "11px", fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase" }}>{p.angle ?? "Prompt"}</span>
                      <span title={p.text} className="app-cl-text" style={{ fontSize: "14px", fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.text}
                      </span>
                    </div>
                    {pending ? (
                      <span style={{ fontSize: "12px", color: T.accent, fontWeight: 600 }}>First check tomorrow at 06:00</span>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        {p.daysNamed.map((d) => (
                          <span key={d.engine} title={`${ENGINE_SPECS[d.engine as Engine]?.label ?? d.engine}: named ${brand} on ${d.days} of ${p.daysChecked} days`} style={{ display: "inline-flex", alignItems: "center", gap: "4px", opacity: d.days ? 1 : 0.4 }}>
                            <EngineLogo engine={d.engine as Engine} size={16} />
                            <span style={{ fontSize: "12px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{d.days}</span>
                          </span>
                        ))}
                        <span style={{ fontSize: "12px", color: T.soft }}>{`days named, of ${p.daysChecked}`}</span>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: "16px", fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }} title={pending ? undefined : `${p.now.num} of ${p.now.den} answers`}>
                    {pctText(p.now.pct)}
                  </span>
                  <span style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Chip value={p.before && p.now.pct !== null && p.before.pct !== null ? p.now.pct - p.before.pct : null} unit=" pts" none={pending ? "Tomorrow" : "New"} />
                  </span>
                </li>
              ))}
            </ul>
            <svg className="app-hide-sm" width="64" height={BLOCK_H} viewBox={`0 0 64 ${BLOCK_H}`} aria-hidden="true" style={{ flexShrink: 0 }}>
              {c.prompts.map((p, i) => {
                const y = ROW_H / 2 + i * PITCH;
                const on = !pending && p.now.num > 0;
                return <path key={p.id} d={`M0,${y} C35,${y} 29,${mid} 64,${mid}`} fill="none" stroke={pending ? T.washLine : on ? T.accent : T.line} strokeWidth={1.8} strokeDasharray={on ? undefined : "3 4"} strokeLinecap="round" />;
              })}
              <circle cx={61} cy={mid} r={4} fill={T.accent} />
            </svg>
            <div className="app-cl-kw" style={{ width: "256px", flexShrink: 0, boxSizing: "border-box", padding: "18px", borderRadius: "14px", border: `1px solid ${T.washLine}`, background: T.surface, display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: T.soft }}>Google keyword</span>
              <span style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.3 }}>{c.keyword ?? "Needs a keyword"}</span>
              <span style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{c.position === null ? "-" : `#${c.position}`}</span>
                <Chip value={c.positionChange} unit="" none={pending ? "Tomorrow" : "New"} />
              </span>
              <span style={{ fontSize: "13px", color: T.soft }}>
                {c.positionBefore !== null && since ? `was #${c.positionBefore} on ${since}` : pending ? "First check tomorrow at 06:00" : `Tracked since ${formatDay(c.started_on)}`}
              </span>
              {c.intent || vol ? (
                <span style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {c.intent ? <span style={{ padding: "3px 9px", borderRadius: "999px", background: T.wash, color: T.accent, fontSize: "12px", fontWeight: 600 }}>{cap(c.intent)}</span> : null}
                  {c.volume !== null ? <span style={{ padding: "3px 9px", borderRadius: "999px", background: T.chip, color: T.ink, fontSize: "12px", fontWeight: 600 }}>{`${c.volume.toLocaleString("en-GB")} a month`}</span> : null}
                </span>
              ) : null}
            </div>
          </div>
          <span style={{ fontSize: "13px", color: T.soft }}>
            {c.status === "added" ? `Added ${formatDay(c.started_on)}, so there is no earlier period to compare against yet.` : pending ? "Its prompts are asked from tomorrow's 06:00 check." : "Dates and comparisons apply to the prompts and the keyword alike."}
          </span>
        </div>
      ) : null}
    </div>
  );
}
