import EngineLogo from "@/components/EngineLogo";
import { T } from "@/config/tokens";
import { ENGINE_SPECS, type Engine } from "@/lib/scan/engines";
import { type Day, type Range, formatDay } from "@/lib/tracking/figures";
import { KIND_WORDS, PLACEMENTS_FOOTNOTE, type PlacementsView, type Span, kindFilters, pageParts, shortDay, spanText } from "@/lib/tracking/placement-figures";
import type { PlacementKind } from "@/lib/tracking/placements";

import DatePicker from "./DatePicker";
import PlacementsChart from "./PlacementsChart";

/**
 * The placements screen (T13, R97 part 3, 30 Sep 2026; BRIEF-2 T13 against
 * boards-3/Placements.dc.html): header with the cluster picker, the four
 * summary figures, the table with its Whole-cluster row, and the board's
 * footnote word for word. Server-drawn, so it reads the same with JS off.
 * Download CSV is the table as a file (part 4, report-csv.ts). The chart
 * (part 4b, PlacementsChart.tsx) and the table share ?type= and ?sel=: a
 * type filter narrows both, and picking a line or a row selects it in both.
 *
 * Nothing here says a placement moved a figure: every span is where the
 * cluster stood at go-live and where it stands now (causal-copy.test.mts).
 */

const CARD: React.CSSProperties = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: "18px" };
const H2: React.CSSProperties = { margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em" };
const COLS = "minmax(0, 1fr) 128px 104px 150px 150px 150px";
const WORDS = ["no", "one", "two", "three", "four", "five"];
// The board's type pills. Link insertion's teal is not in the palette, so it takes the neutral hair ground.
const KIND_PILL: Record<PlacementKind, { bg: string; fg: string }> = {
  guest_post: { bg: T.wash, fg: T.accent },
  link_insertion: { bg: T.hair, fg: T.soft },
  on_site: { bg: T.chip, fg: T.ink },
  coverage: { bg: T.chip, fg: T.ink },
};

/** The board's green chip, drawn only when the later reading is better. */
function Up({ s, unit, arrow = false }: { s: Span<number>; unit: "pct" | "rank"; arrow?: boolean }) {
  if (s.from === null || s.to === null) return null;
  const d = unit === "pct" ? s.to - s.from : s.from - s.to;
  if (d <= 0) return null;
  // The Whole-cluster row's chip carries the arrow; a placement row's is the bare figure (the board).
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", padding: arrow ? "2px 8px 2px 5px" : "2px 8px", borderRadius: "999px", background: T.goodBg, color: T.goodFg, fontSize: "12px", fontWeight: arrow ? 600 : 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
      {arrow ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.goodFg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 15l6-6 6 6" />
        </svg>
      ) : null}
      {unit === "pct" ? `+${d} pts` : `+${d}`}
    </span>
  );
}

export default function Placements({
  brand,
  engines,
  range,
  today,
  startedOn,
  clusters,
  cluster,
  keyword,
  prompts,
  view,
  series,
  kind,
  sel,
  query,
  path,
  csvHref,
}: {
  brand: string;
  engines: readonly Engine[];
  range: Range;
  today: Day;
  /** The client's tracking start, the picker's floor as on every other dashboard page. */
  startedOn: Day | null;
  /** Every cluster the picker offers, with its link. */
  clusters: { id: string; name: string; href: string }[];
  cluster: { id: string; name: string; started_on: Day };
  keyword: string | null;
  prompts: number;
  view: PlacementsView;
  series: React.ComponentProps<typeof PlacementsChart>["series"];
  /** ?type= - null is every kind. */
  kind: PlacementKind | null;
  /** ?sel= - the selected placement, if any. */
  sel: string | null;
  /** The page's own query (cluster, and from/to when stated), kept by every filter and selection link. */
  query: Record<string, string>;
  path: string;
  /** GET /api/app/[client]/report?kind=placements for this cluster and range. */
  csvHref: string;
}) {
  const link = (k: PlacementKind | null, id: string | null, hash: string) => `${path}?${new URLSearchParams({ ...query, ...(k ? { type: k } : {}), ...(id ? { sel: id } : {}) })}${hash}`;
  const rows = view.rows.filter((r) => kind === null || r.kind === kind);
  const filters = kindFilters(view.rows).map((f) => ({ ...f, href: link(f.kind, sel, "#placements-chart") }));
  const since = view.whole.from ? shortDay(view.whole.from) : shortDay(range.from);
  const cell: React.CSSProperties = { display: "grid", gridTemplateColumns: COLS, alignItems: "center", gap: "16px", padding: "12px 24px" };
  const fig = (label: string, figure: string, big: string, sub: string, first = false) => (
    <div style={{ flex: "1 1 200px", padding: "22px 24px", display: "flex", flexDirection: "column", gap: "8px", minWidth: 0, borderLeft: first ? undefined : `1px solid ${T.line}` }}>
      <span style={{ fontSize: "13px", fontWeight: 600, color: T.soft }}>{label}</span>
      <span data-figure={figure} style={{ fontSize: "30px", fontWeight: 700, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
        {big}
      </span>
      <span style={{ fontSize: "13px", color: T.soft }}>{sub}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", color: T.ink }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700, letterSpacing: "-0.03em" }}>Placements</h1>
          <p style={{ margin: 0, fontSize: "14px", color: T.soft }}>{`What we've placed for ${brand}, and what the answers and Google did around it.`}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <details className="app-picker" style={{ position: "relative" }}>
            <summary style={{ display: "flex", alignItems: "center", gap: "10px", height: "48px", padding: "0 14px", border: `1px solid ${T.line}`, borderRadius: "12px", background: T.surface, cursor: "pointer", listStyle: "none" }}>
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                <span style={{ fontSize: "12px", color: T.soft }}>Cluster</span>
                <span style={{ fontSize: "14px", fontWeight: 700 }}>{cluster.name}</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.soft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <nav aria-label="Clusters" style={{ ...CARD, position: "absolute", zIndex: 2, top: "54px", left: 0, minWidth: "100%", padding: "6px", display: "grid", gap: "2px", borderRadius: "12px" }}>
              {clusters.map((c) => (
                <a key={c.id} href={c.href} aria-current={c.id === cluster.id ? "true" : undefined} style={{ padding: "8px 10px", borderRadius: "8px", fontSize: "14px", fontWeight: c.id === cluster.id ? 700 : 500, color: c.id === cluster.id ? T.accent : T.ink, background: c.id === cluster.id ? T.wash : "transparent", whiteSpace: "nowrap" }}>
                  {c.name}
                </a>
              ))}
            </nav>
          </details>
          {/* DS25: the range face was a static box drawn like a control; it is now the dashboard's picker, writing ?from=&to= over cluster, type and sel. */}
          <DatePicker range={range} compare="prev" today={today} startedOn={startedOn} grow={false} noCompare>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
              <span style={{ fontSize: "14px", fontWeight: 700 }}>{range.from <= cluster.started_on ? "Since it started" : "Range"}</span>
              <span style={{ fontSize: "12px", color: T.soft }}>{`${formatDay(range.from)} - ${formatDay(range.to, true)}`}</span>
            </span>
          </DatePicker>
        </div>
      </header>

      <section aria-label="Cluster summary" style={{ ...CARD, display: "flex", flexWrap: "wrap" }}>
        {fig("Placements live", "placements-live", String(view.live), view.inProgress ? `${view.inProgress} more in progress.` : "None in progress.", true)}
        {fig("Answers naming you", "placements-named", spanText(view.whole.named, "pct"), `${prompts} prompt${prompts === 1 ? "" : "s"}, ${WORDS[engines.length] ?? engines.length} engines, since ${since}`)}
        {fig("Google position", "placements-google", spanText(view.whole.google, "rank"), keyword ?? "No keyword yet")}
        {fig("Answers citing your placements", "placements-cited", String(view.whole.cited), "An engine cited the placement page itself")}
      </section>

      <PlacementsChart brand={brand} series={series} rows={rows} filters={filters} kind={kind} sel={sel} hrefFor={(id) => link(kind, id, "#placements-chart")} keyword={keyword} />

      <section aria-labelledby="tb-h" style={{ ...CARD, padding: "22px 0 8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 24px 14px" }}>
          <h2 id="tb-h" style={H2}>
            Every placement, and where the cluster stood
          </h2>
          <a href={csvHref} download style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", padding: "0 12px", border: `1px solid ${T.line}`, borderRadius: "10px", background: T.surface, color: T.ink, fontSize: "13px", fontWeight: 600, textDecoration: "none", boxSizing: "border-box" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
            </svg>
            Download CSV
          </a>
        </div>
        <div className="app-scroll-x" style={{ overflowX: "auto" }}>
          <div style={{ minWidth: "980px" }}>
            <div style={{ display: "grid", gridTemplateColumns: COLS, gap: "16px", padding: "0 24px 10px" }}>
              {["Page", "Type", "Live", "Answers citing it", "Named, at go-live to now", "Google, at go-live to now"].map((h) => (
                <span key={h} style={{ fontSize: "12px", fontWeight: 600, color: T.soft }}>
                  {h}
                </span>
              ))}
            </div>
            <div style={{ ...cell, padding: "14px 24px", background: T.chip, borderTop: `1px solid ${T.line}` }}>
              <span style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700 }}>Whole cluster</span>
                <span style={{ fontSize: "12px", color: T.soft }}>{`${keyword ?? cluster.name}, ${prompts} prompt${prompts === 1 ? "" : "s"}`}</span>
              </span>
              <span style={{ fontSize: "13px", fontWeight: 600 }}>{`${view.live} live`}</span>
              <span style={{ fontSize: "13px" }}>{`Since ${since}`}</span>
              <span data-figure="placements-whole-cited" style={{ fontSize: "15px", fontWeight: 700 }}>
                {view.whole.cited}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700 }}>
                {spanText(view.whole.named, "pct")}
                <Up s={view.whole.named} unit="pct" arrow />
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700 }}>
                {spanText(view.whole.google, "rank")}
                <Up s={view.whole.google} unit="rank" arrow />
              </span>
            </div>
            {rows.map((r) => {
              const { host, path: page } = pageParts(r.url);
              const pill = KIND_PILL[r.kind];
              const on = r.id === sel;
              return (
                <div key={r.id} id={`p-${r.id}`} data-placement={r.id} aria-current={on ? "true" : undefined} style={{ ...cell, borderTop: `1px solid ${T.hair}`, background: on ? T.wash : undefined }}>
                  <a href={link(kind, on ? null : r.id, `#p-${r.id}`)} data-usage="placement_select" style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, color: T.ink, textDecoration: "none" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700 }}>{host}</span>
                    <span style={{ fontSize: "12px", color: T.soft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page}</span>
                  </a>
                  <span style={{ justifySelf: "start", padding: "3px 9px", borderRadius: "999px", background: pill.bg, color: pill.fg, fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>{KIND_WORDS[r.kind]}</span>
                  <span style={{ fontSize: "13px", fontWeight: r.live ? 500 : 600, color: r.live ? T.ink : T.warnFg }}>{r.when}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: "22px" }}>{r.live ? r.cited : "-"}</span>
                    <span style={{ display: "flex", gap: "3px" }}>
                      {r.citedBy.map((e) => (
                        <EngineLogo key={e} engine={e} size={16} title={ENGINE_SPECS[e as Engine]?.label ?? e} />
                      ))}
                    </span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontVariantNumeric: "tabular-nums" }}>
                    {r.live ? spanText(r.named, "pct") : "Not live yet"}
                    <Up s={r.named} unit="pct" />
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontVariantNumeric: "tabular-nums" }}>
                    {r.live ? spanText(r.google, "rank") : ""}
                    <Up s={r.google} unit="rank" />
                  </span>
                </div>
              );
            })}
            {/* DS23: a type the cluster has none of (a stale bookmark; the pills offer only kinds present) is a filter that matched nothing, not an empty cluster. */}
            {rows.length === 0 && kind !== null && view.rows.length > 0 ? (
              <p style={{ margin: 0, padding: "14px 24px", borderTop: `1px solid ${T.hair}`, fontSize: "14px", color: T.soft }}>
                {`No ${KIND_WORDS[kind].toLowerCase()} placements on this cluster. `}
                <a href={link(null, sel, "#placements-chart")} style={{ display: "inline-flex", alignItems: "center", color: T.accent, fontWeight: 600 }}>{view.rows.length === 1 ? "Show the 1 placement" : `Show all ${view.rows.length} placements`}</a>
              </p>
            ) : null}
            {rows.length === 0 && (kind === null || view.rows.length === 0) ? <p style={{ margin: 0, padding: "14px 24px", borderTop: `1px solid ${T.hair}`, fontSize: "14px", color: T.soft }}>{`Nothing placed on this cluster yet. Each placement shows here from the day it is logged${clusters.length > 1 ? "; pick another cluster at the top of the page to see its placements" : ""}.`}</p> : null}
          </div>
        </div>
        <p style={{ margin: "14px 24px 8px", fontSize: "13px", lineHeight: 1.5, color: T.soft, maxWidth: "820px" }}>{PLACEMENTS_FOOTNOTE}</p>
      </section>
    </div>
  );
}
