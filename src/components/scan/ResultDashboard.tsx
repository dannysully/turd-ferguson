import type { RunScanResponse, ScanSource } from "@/lib/scan";

/**
 * The results view, shared by the homepage checker (blurred behind the gate)
 * and the /example page (ungated). Renders only what the result contains.
 * A null field is not shown; it is never filled in.
 *
 * Every figure carries its read date.
 */

const C = { navy: "#0B1220", purple: "#7C3AED", body: "#4B5563", soft: "#F8F7FF", border: "#E5E7EB", white: "#ffffff", muted: "#9CA3AF" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-09" -> "9 Sep 2026". Fixed table, so server and browser agree. */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/* Green for live, amber for illustrative. Same size and position always. */
export function DataPill({ source, readAt }: { source: ScanSource; readAt: string }) {
  const live = source === "live";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.375rem",
      fontSize: "0.7rem", fontWeight: 600, borderRadius: "999px", padding: "0.2rem 0.625rem",
      color: live ? "#15803D" : "#B45309",
      background: live ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
      border: `1px solid ${live ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.35)"}`,
      whiteSpace: "nowrap",
    }}>
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: live ? "#22C55E" : "#F59E0B" }} />
      {live ? "Live data" : "Fixture data"} · read {fmtDate(readAt)}
    </span>
  );
}

function ReadDate({ iso }: { iso: string }) {
  return <span style={{ fontSize: "0.7rem", color: C.muted, fontWeight: 500 }}>read {fmtDate(iso)}</span>;
}

function SectionHead({ title, readAt }: { title: string; readAt: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", marginBottom: "0.875rem", flexWrap: "wrap" }}>
      <h3 style={{ fontWeight: 700, fontSize: "1rem", color: C.navy, margin: 0, letterSpacing: "-0.01em" }}>{title}</h3>
      <ReadDate iso={readAt} />
    </div>
  );
}

const card: React.CSSProperties = { background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "1.5rem" };

/* ── The finding ── */
export function Finding({ r }: { r: RunScanResponse }) {
  const b = r.brand;
  const marketName = r.market === "UK" ? "the UK" : "the US";
  return (
    <div>
      {b.named_in !== null && b.of !== null ? (
        <p style={{ fontSize: "clamp(1.125rem, 2vw, 1.375rem)", fontWeight: 700, color: C.navy, lineHeight: 1.4, marginBottom: "0.75rem" }}>
          {b.name} is named in {b.named_in} of {b.of} Google AI Overview answers to the questions buyers ask about {r.topic} in {marketName}.
        </p>
      ) : r.top_source && !r.top_source.brand_present ? (
        <p style={{ fontSize: "clamp(1.125rem, 2vw, 1.375rem)", fontWeight: 700, color: C.navy, lineHeight: 1.4, marginBottom: "0.75rem" }}>
          {b.name} is not among the sources Google AI Overviews cite for {r.topic} in {marketName}.
        </p>
      ) : (
        <p style={{ fontSize: "clamp(1.125rem, 2vw, 1.375rem)", fontWeight: 700, color: C.navy, lineHeight: 1.4, marginBottom: "0.75rem" }}>
          Here is what Google AI Overviews draw on for {r.topic} in {marketName}.
        </p>
      )}

      {b.rank !== null && b.of_brands !== null && (
        <p style={{ fontSize: "1rem", color: C.body, lineHeight: 1.65, marginBottom: "0.5rem" }}>
          That puts them {b.rank}{ordinal(b.rank)} of {b.of_brands} brands the engines mention for this topic.
        </p>
      )}

      {r.top_source && (
        <p style={{ fontSize: "1rem", color: C.body, lineHeight: 1.65, marginBottom: "0.5rem" }}>
          The most-cited source for this topic is <strong style={{ color: C.navy }}>{r.top_source.domain}</strong>.{" "}
          {r.top_source.brand_present ? `${b.name} is in it.` : `${b.name} is not in it.`}
        </p>
      )}
      <ReadDate iso={r.read_at} />
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/* ── Leaderboard ── */
export function Leaderboard({ r }: { r: RunScanResponse }) {
  const marketName = r.market === "UK" ? "the UK" : "the US";
  return (
    <div style={card}>
      <SectionHead title="Brands the engines mention" readAt={r.read_at} />
      {r.leaderboard.length === 0 ? (
        <p style={{ fontSize: "0.9375rem", color: C.body, lineHeight: 1.65, margin: 0 }}>
          The engines have not been asked enough about {r.topic} in {marketName} for us to rank brands yet. That is worth knowing on its own.
        </p>
      ) : (
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {r.leaderboard.map((e, i) => (
            <li key={e.brand} style={{ display: "grid", gridTemplateColumns: "2rem 1fr auto", gap: "0.75rem", alignItems: "baseline", padding: "0.5rem 0", borderTop: i ? `1px solid ${C.border}` : "none" }}>
              <span style={{ fontSize: "0.8125rem", color: C.muted, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
              <span style={{ fontSize: "0.9375rem", fontWeight: e.brand.toLowerCase() === r.brand.name.toLowerCase() ? 700 : 500, color: C.navy }}>{e.brand}</span>
              <span style={{ fontSize: "0.8125rem", color: C.body, fontVariantNumeric: "tabular-nums" }}>{e.mentions} mention{e.mentions === 1 ? "" : "s"}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ── Sources ── */
export function Sources({ r, limit }: { r: RunScanResponse; limit?: number }) {
  const rows = limit ? r.sources.slice(0, limit) : r.sources;
  const brandDomain = r.brand.name.toLowerCase();
  return (
    <div style={card}>
      <SectionHead title="Every source the engines cited" readAt={r.read_at} />
      {rows.length === 0 ? (
        <p style={{ fontSize: "0.9375rem", color: C.body, margin: 0 }}>No sources were cited for this topic.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "420px" }}>
            <thead>
              <tr>
                {["#", "Source", "Mentions", "AI search volume"].map((h, i) => (
                  <th key={h} style={{ textAlign: i < 2 ? "left" : "right", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, padding: "0 0 0.625rem", paddingLeft: i === 0 ? 0 : "0.75rem" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={s.domain} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "0.625rem 0", color: C.muted, fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                  <td style={{ padding: "0.625rem 0.75rem", color: C.navy, fontWeight: s.domain.includes(brandDomain.split(" ")[0]) ? 700 : 500 }}>{s.domain}</td>
                  <td style={{ padding: "0.625rem 0.75rem", textAlign: "right", color: C.navy, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{s.mentions}</td>
                  <td style={{ padding: "0.625rem 0 0.625rem 0.75rem", textAlign: "right", color: C.body, fontVariantNumeric: "tabular-nums" }}>{s.ai_search_volume.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {limit && r.sources.length > limit && (
        <p style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.75rem", marginBottom: 0 }}>and {r.sources.length - limit} more</p>
      )}
    </div>
  );
}

/* ── History: mentions by month. Not rendered - retrospective data is out of scope. ── */
export function History({ r }: { r: RunScanResponse }) {
  const pts = r.history;
  if (pts.length === 0) {
    return (
      <div style={card}>
        <SectionHead title="Mentions over time" readAt={r.read_at} />
        <p style={{ fontSize: "0.9375rem", color: C.body, margin: 0 }}>No history for {r.brand.name} yet. The first reading is the baseline.</p>
      </div>
    );
  }
  const W = 560, H = 160, padL = 28, padB = 26, padT = 10;
  const max = Math.max(1, ...pts.map((p) => p.mentions));
  const bw = (W - padL) / pts.length;
  const total = pts.reduce((a, p) => a + p.mentions, 0);
  return (
    <div style={card}>
      <SectionHead title={`Mentions of ${r.brand.name} in Google AI Overviews, by month`} readAt={r.read_at} />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label={`${total} mentions across ${pts.length} months`}>
        {[0, max].map((v) => {
          const y = padT + (H - padT - padB) * (1 - v / max);
          return (
            <g key={v}>
              <line x1={padL} x2={W} y1={y} y2={y} stroke="#F3F4F6" />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill={C.muted}>{v}</text>
            </g>
          );
        })}
        {pts.map((p, i) => {
          const h = (H - padT - padB) * (p.mentions / max);
          const x = padL + i * bw + bw * 0.2;
          const y = H - padB - h;
          return (
            <g key={`${p.year}-${p.month}`}>
              <rect x={x} y={y} width={bw * 0.6} height={h} rx="3" fill={p.mentions ? C.purple : "#E5E7EB"} />
              {p.mentions > 0 && <text x={x + bw * 0.3} y={y - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill={C.navy}>{p.mentions}</text>}
              <text x={x + bw * 0.3} y={H - 8} textAnchor="middle" fontSize="8.5" fill={C.muted}>{MONTHS[p.month - 1]}{p.month === 1 || i === 0 ? ` ${String(p.year).slice(2)}` : ""}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── The whole thing, stacked ── */
export default function ResultDashboard({ r, sourceLimit }: { r: RunScanResponse; sourceLimit?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Leaderboard r={r} />
      <Sources r={r} limit={sourceLimit} />
    </div>
  );
}
