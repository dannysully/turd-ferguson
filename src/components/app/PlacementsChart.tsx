import { T } from "@/config/tokens";
import { type Day, formatDay } from "@/lib/tracking/figures";
import { KIND_WORDS, type PlacementLine, axisAt, pageParts } from "@/lib/tracking/placement-figures";
import type { PlacementKind } from "@/lib/tracking/placements";

/**
 * The placements chart (T13, R97 part 4b, 30 Sep 2026; BRIEF-2 T13 against
 * boards-3/Placements.dc.html): two stacked panels on one time axis - the
 * share of the cluster's answers naming the client above, the keyword's
 * Google position below, inverted, with a Page 1 line - and a line down both
 * for each live placement, its type dot on the "Live" strip between them.
 * Two panels, not two y-axes, so the lines are not read as linked.
 *
 * Server-drawn at the board's geometry. The type filters and the selection
 * are links (?type=, ?sel=), so they work with JS off and the table below
 * shares them. A day with no reading is a gap, never a zero.
 */

const W = 1056;
const H = 418;
const X0 = 36;
const X1 = 1040;
const A_TOP = 14;
const A_BOT = 196;
const B_TOP = 254;
const B_BOT = 380;
const MARK_H = 394;
const STRIP = 221;

// The board's type colours. Link insertion's teal is not in the palette (palette.test.mts), so it takes soft.
export const KIND_DOT: Record<PlacementKind, string> = { guest_post: T.accent, link_insertion: T.soft, on_site: T.ink, coverage: T.faint };

type Pt = [number, number];
function runs(vals: (number | null)[], xAt: (i: number) => number, y: (v: number) => number): Pt[][] {
  const out: Pt[][] = [];
  let run: Pt[] = [];
  vals.forEach((v, i) => {
    if (v === null) {
      if (run.length) out.push(run);
      run = [];
      return;
    }
    run.push([xAt(i), y(v)]);
  });
  if (run.length) out.push(run);
  return out;
}
const path = (rs: Pt[][]) => rs.map((r) => "M" + r.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")).join(" ");
const fill = (rs: Pt[][]) => rs.map((r) => `M${r[0]![0].toFixed(1)},${A_BOT} ` + r.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + ` L${r[r.length - 1]![0].toFixed(1)},${A_BOT} Z`).join(" ");
const pctOf = (x: number) => `${((x / W) * 100).toFixed(3)}%`;
const pctH = (y: number) => `${((y / H) * 100).toFixed(3)}%`;

export default function PlacementsChart({
  brand,
  series,
  rows,
  filters,
  kind,
  sel,
  hrefFor,
  keyword,
}: {
  brand: string;
  series: { days: Day[]; named: (number | null)[]; google: (number | null)[]; weekly: boolean };
  /** The table's rows after the type filter; the live ones draw a line. */
  rows: PlacementLine[];
  filters: { kind: PlacementKind | null; label: string; href: string }[];
  kind: PlacementKind | null;
  sel: string | null;
  /** The link that selects (or, when it is selected, clears) one placement. */
  hrefFor: (id: string | null) => string;
  keyword: string | null;
}) {
  const { days, named, google } = series;
  const first = days[0]!;
  const last = days[days.length - 1]!;
  const xAt = (i: number) => (days.length < 2 ? (X0 + X1) / 2 : X0 + (i * (X1 - X0)) / (days.length - 1));
  const xDay = (d: Day) => X0 + axisAt(d, first, last) * (X1 - X0);
  const topN = Math.max(0, ...named.map((v) => v ?? 0));
  const aMax = topN <= 50 ? 50 : 100;
  const gMax = Math.max(0, ...google.map((v) => v ?? 0)) <= 20 ? 20 : 30;
  const ya = (v: number) => A_BOT - (Math.min(v, aMax) * (A_BOT - A_TOP)) / aMax;
  const yb = (p: number) => B_TOP + ((Math.min(p, gMax) - 1) * (B_BOT - B_TOP)) / (gMax - 1);
  const aRuns = runs(named, xAt, ya);
  const bRuns = runs(google, xAt, yb);
  const ticks = days.length < 2 ? [0] : [0, 1, 2, 3].map((k) => Math.round((k * (days.length - 1)) / 3)).filter((v, i, a) => a.indexOf(v) === i);

  const live = rows.filter((r) => r.live && r.liveOn);
  const cur = live.find((r) => r.id === sel) ?? null;
  const firstN = named.find((v) => v !== null);
  const lastN = [...named].reverse().find((v) => v !== null);
  const firstG = google.find((v) => v !== null);
  const lastG = [...google].reverse().find((v) => v !== null);
  const aria = [
    firstN != null && lastN != null ? `AI answers naming ${brand} for this cluster went from ${firstN}% to ${lastN}%` : `No AI answers read for this cluster yet`,
    firstG != null && lastG != null ? `the keyword${keyword ? ` ${keyword}` : ""} went from #${firstG} to #${lastG}` : null,
  ]
    .filter(Boolean)
    .join(" while ") + `, ${formatDay(first)} to ${formatDay(last, true)}`;

  return (
    <section id="placements-chart" aria-labelledby="gr-h" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: "18px", padding: "24px 27px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h2 id="gr-h" style={{ margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.022em" }}>
            AI answers and Google, with every placement
          </h2>
          <p style={{ margin: 0, fontSize: "14px", color: T.soft }}>{`${series.weekly ? "Weekly" : "Daily"}. Each line down the chart is a placement going live. Pick one, here or in the table, to follow it.`}</p>
        </div>
        <div style={{ display: "flex", gap: "16px", fontSize: "13px", fontWeight: 600, flexShrink: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "18px", borderTop: `3px solid ${T.accent}` }} />
            Answers naming you
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "18px", borderTop: `3px solid ${T.ink}` }} />
            Google position
          </span>
        </div>
      </div>
      <nav aria-label="Placement types" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {filters.map((f) => {
          const on = f.kind === kind;
          return (
            <a key={f.kind ?? "all"} href={f.href} aria-current={on ? "true" : undefined} style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "36px", padding: "0 14px", borderRadius: "999px", border: `1px solid ${on ? T.washLine : T.line}`, background: on ? T.wash : T.surface, color: T.ink, fontSize: "13px", fontWeight: 600, textDecoration: "none", boxSizing: "border-box" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: f.kind ? KIND_DOT[f.kind] : T.faint }} />
              {f.label}
            </a>
          );
        })}
      </nav>
      <div className="app-scroll-x" style={{ overflowX: "auto" }}>
        <div style={{ position: "relative", width: "100%", minWidth: "720px", aspectRatio: `${W} / ${H}` }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ position: "absolute", inset: 0, display: "block" }}>
            <line x1={X0} x2={X1} y1={A_BOT} y2={A_BOT} stroke={T.line} />
            {[0, aMax / 2, aMax].map((v) => (
              <g key={`a${v}`}>
                {v ? <line x1={X0} x2={X1} y1={ya(v)} y2={ya(v)} stroke={T.hair} /> : null}
                <text x={X0 - 8} y={ya(v) + 4} textAnchor="end" fontSize="12" fill={T.soft}>{`${v}%`}</text>
              </g>
            ))}
            {[1, 10, gMax].map((p) => (
              <g key={`b${p}`}>
                <line x1={X0} x2={X1} y1={yb(p)} y2={yb(p)} stroke={T.hair} />
                <text x={X0 - 8} y={yb(p) + 4} textAnchor="end" fontSize="12" fill={T.soft}>{`#${p}`}</text>
              </g>
            ))}
            <line x1={X0} x2={X1} y1={yb(10.5)} y2={yb(10.5)} stroke={T.soft} strokeDasharray="3 4" opacity="0.5" />
            <text x={X1} y={yb(10.5) - 6} textAnchor="end" fontSize="11" fill={T.soft}>
              Page 1
            </text>
            {ticks.map((i) => (
              <text key={`t${i}`} x={xAt(i)} y={410} textAnchor="middle" fontSize="12" fill={T.soft}>
                {formatDay(days[i]!)}
              </text>
            ))}
            {aRuns.length ? <path d={fill(aRuns)} fill={T.accent} fillOpacity="0.07" /> : null}
            <path d={path(aRuns)} fill="none" stroke={T.accent} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            <path d={path(bRuns)} fill="none" stroke={T.ink} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {aRuns.flat().map(([x, y]) => (
              <circle key={`ca${x}`} cx={x} cy={y} r="3.5" fill={T.surface} stroke={T.accent} strokeWidth="2" />
            ))}
            {bRuns.flat().map(([x, y]) => (
              <circle key={`cb${x}`} cx={x} cy={y} r="3.5" fill={T.surface} stroke={T.ink} strokeWidth="2" />
            ))}
          </svg>
          <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: pctH(MARK_H) }}>
            {live.map((r) => {
              const on = r.id === sel;
              const { host } = pageParts(r.url);
              return (
                <a
                  key={r.id}
                  href={hrefFor(on ? null : r.id)}
                  aria-label={`${KIND_WORDS[r.kind]} on ${host}, live ${r.when}`}
                  aria-current={on ? "true" : undefined}
                  style={{ position: "absolute", left: pctOf(xDay(r.liveOn!)), top: 0, width: "14px", height: "100%", marginLeft: "-7px", display: "flex", justifyContent: "center" }}
                >
                  <span style={{ width: "2px", height: "100%", background: on ? KIND_DOT[r.kind] : T.faint, opacity: on ? 0.9 : 0.35 }} />
                  <span style={{ position: "absolute", top: `${((STRIP / MARK_H) * 100).toFixed(3)}%`, width: "12px", height: "12px", borderRadius: "50%", background: KIND_DOT[r.kind], boxShadow: `0 0 0 3px ${T.surface}` }} />
                </a>
              );
            })}
          </div>
          <div style={{ position: "absolute", left: 0, top: pctH(219), fontSize: "12px", fontWeight: 600, color: T.soft }}>Live</div>
          {cur ? <Readout r={cur} x={xDay(cur.liveOn!)} /> : null}
        </div>
      </div>
    </section>
  );
}

/** The board's dark readout beside the selected line. */
function Readout({ r, x }: { r: PlacementLine; x: number }) {
  const { host } = pageParts(r.url);
  const pos: React.CSSProperties = x > 760 ? { right: `calc(${(((W - x) / W) * 100).toFixed(3)}% + 14px)` } : { left: `calc(${pctOf(x)} + 14px)` };
  const line: React.CSSProperties = { fontSize: "13px", color: T.line };
  return (
    <div role="status" style={{ ...pos, position: "absolute", top: "20px", width: "260px", boxSizing: "border-box", padding: "12px 14px", borderRadius: "12px", background: T.ink, color: T.surface, boxShadow: `0 24px 60px -28px color-mix(in srgb, ${T.ink} 45%, transparent)`, display: "flex", flexDirection: "column", gap: "6px", pointerEvents: "none" }}>
      <span style={{ fontSize: "12px", color: T.faint }}>{`${KIND_WORDS[r.kind]}, live ${r.when}`}</span>
      <span style={{ fontSize: "14px", fontWeight: 700 }}>{host}</span>
      {r.named.from !== null ? <span style={line}>{`Answers naming you: ${r.named.from}% then, ${r.named.to}% now`}</span> : null}
      {r.google.from !== null ? <span style={line}>{`Google: #${r.google.from} then, #${r.google.to} now`}</span> : null}
      <span style={line}>{`Cited in ${r.cited} answer${r.cited === 1 ? "" : "s"} since`}</span>
    </div>
  );
}
