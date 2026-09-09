"use client";

import type { HistoryPoint, Market, RunScanResponse, SourceEntry } from "@/lib/scan";
import ResultDashboard, { Finding, fmtDate } from "./ResultDashboard";

/**
 * The checker's screens as stateless components. ScanChecker composes them
 * with live state; the /example walkthrough renders each one frozen at a
 * step with fixed data. Same markup either way, which is the point.
 *
 * readOnly renders the screen non-interactive but styled exactly as live.
 */

export const C = { navy: "#0B1220", purple: "#7C3AED", body: "#4B5563", soft: "#F8F7FF", border: "#E5E7EB", white: "#ffffff", muted: "#9CA3AF", red: "#B91C1C" };

export const field: React.CSSProperties = { width: "100%", padding: "0.875rem 1rem", fontSize: "1rem", color: C.navy, background: C.white, border: `1.5px solid ${C.border}`, borderRadius: "12px", fontFamily: "inherit", outline: "none" };
export const label: React.CSSProperties = { display: "block", fontSize: "0.8125rem", fontWeight: 600, color: C.navy, marginBottom: "0.5rem" };
export const btn: React.CSSProperties = { border: "none", cursor: "pointer", padding: "0.875rem 2rem" };
const quiet: React.CSSProperties = { background: "none", border: "none", color: C.body, fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "0.875rem 0" };

export const STEPS = ["Building the questions buyers ask", "Reading what the engines answered", "Finding the sources they cited"];

const ro = (readOnly?: boolean) => (readOnly ? { readOnly: true, tabIndex: -1, "aria-readonly": true as const } : {});

/* ── 1. Domain ── */
export function DomainScreen(p: {
  value: string; onChange?: (v: string) => void; onSubmit?: (e: React.FormEvent) => void;
  error?: string; busy?: boolean; readOnly?: boolean; exampleLink?: boolean; id?: string;
}) {
  const id = p.id ?? "scan-domain";
  return (
    <form onSubmit={p.onSubmit ?? ((e) => e.preventDefault())} noValidate>
      <label htmlFor={id} style={label}>Your client&apos;s domain</label>
      <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
        <input id={id} name="domain" inputMode="url" autoComplete="url" placeholder="client-domain.com"
          value={p.value} onChange={(e) => p.onChange?.(e.target.value)} style={{ ...field, flex: "1 1 220px" }}
          aria-invalid={Boolean(p.error)} aria-describedby={p.error ? `${id}-err` : undefined} {...ro(p.readOnly)} />
        <button type="submit" className="btn-primary" style={btn} disabled={p.busy || p.readOnly} tabIndex={p.readOnly ? -1 : undefined}>
          {p.busy ? "Checking" : "Check"}
        </button>
      </div>
      {p.error && <p id={`${id}-err`} style={{ fontSize: "0.8125rem", color: C.red, marginTop: "0.5rem" }}>{p.error}</p>}
      {p.exampleLink && (
        <p style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
          <a href="/example?from=hero" style={{ color: C.body, textDecoration: "underline", textUnderlineOffset: 3 }}>See exactly what happens first</a>
        </p>
      )}
    </form>
  );
}

/* ── 2. Topic and market ── */
export function TopicScreen(p: {
  brand: string | null; brandName?: string; onBrandName?: (v: string) => void;
  topic: string; onTopic?: (v: string) => void;
  market: Market; onMarket?: (m: Market) => void;
  onSubmit?: (e: React.FormEvent) => void; onBack?: () => void;
  readOnly?: boolean; headingRef?: React.Ref<HTMLHeadingElement>; id?: string;
}) {
  const id = p.id ?? "scan";
  const canRun = p.topic.trim() && (p.brand || (p.brandName ?? "").trim());
  return (
    <form onSubmit={p.onSubmit ?? ((e) => e.preventDefault())} noValidate>
      <h2 ref={p.headingRef} tabIndex={-1} style={{ fontSize: "1rem", fontWeight: 700, color: C.navy, margin: "0 0 1rem", outline: "none", lineHeight: 1.45 }}>
        {p.brand ? <>We read <span style={{ color: C.purple }}>{p.brand}</span> from the domain. Which topic should we check them against?</> : "Which topic should we check them against?"}
      </h2>
      {!p.brand && (
        <>
          <label htmlFor={`${id}-brand`} style={label}>What is the brand called?</label>
          <input id={`${id}-brand`} value={p.brandName ?? ""} onChange={(e) => p.onBrandName?.(e.target.value)} style={{ ...field, marginBottom: "0.75rem" }} {...ro(p.readOnly)} />
        </>
      )}
      <label htmlFor={`${id}-topic`} style={label}>Topic</label>
      <input id={`${id}-topic`} value={p.topic} onChange={(e) => p.onTopic?.(e.target.value)} placeholder="b2b seo agency" style={{ ...field, marginBottom: "0.75rem" }} {...ro(p.readOnly)} />
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 0.75rem" }}>
        <legend style={label}>Market</legend>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["UK", "US"] as Market[]).map((m) => (
            <button key={m} type="button" onClick={() => p.onMarket?.(m)} aria-pressed={p.market === m} disabled={p.readOnly} tabIndex={p.readOnly ? -1 : undefined}
              style={{ padding: "0.5rem 1.125rem", fontSize: "0.875rem", fontWeight: 600, fontFamily: "inherit", color: p.market === m ? C.white : C.navy, background: p.market === m ? C.purple : C.white, border: `1.5px solid ${p.market === m ? C.purple : C.border}`, borderRadius: "10px", cursor: p.readOnly ? "default" : "pointer" }}>
              {m}
            </button>
          ))}
        </div>
      </fieldset>
      <p style={{ fontSize: "0.8125rem", color: C.body, lineHeight: 1.6, marginBottom: "1.25rem" }}>
        Write the topic the way a buyer would say it, not the way you would pitch it. It decides every question we ask.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="btn-primary" style={btn} disabled={!canRun || p.readOnly} tabIndex={p.readOnly ? -1 : undefined}>Run the check</button>
        {p.onBack && !p.readOnly && <button type="button" onClick={p.onBack} style={quiet}>Back</button>}
      </div>
    </form>
  );
}

/* ── 3. Running: three named steps, never a bare spinner ── */
export function RunningScreen(p: { brandLabel: string; progress: number; slow?: boolean; headingRef?: React.Ref<HTMLHeadingElement> }) {
  return (
    <div>
      <h2 ref={p.headingRef} tabIndex={-1} style={{ fontSize: "1rem", fontWeight: 700, color: C.navy, margin: "0 0 1rem", outline: "none" }}>Checking {p.brandLabel}</h2>
      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {STEPS.map((s, i) => {
          const state = i < p.progress ? "done" : i === p.progress ? "active" : "todo";
          return (
            <li key={s} className={state === "active" ? "scan-step-active" : undefined} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.9375rem", color: state === "todo" ? C.muted : C.navy, fontWeight: state === "active" ? 600 : 500 }}>
              <span className="scan-step-dot" aria-hidden="true" style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: state === "done" ? C.purple : state === "active" ? "rgba(124,58,237,0.15)" : C.border, border: state === "active" ? `2px solid ${C.purple}` : "none" }}>
                {state === "done" && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </span>
              {s}
            </li>
          );
        })}
      </ol>
      {p.slow && <p style={{ fontSize: "0.8125rem", color: C.body, marginTop: "1rem" }}>This is taking longer than usual. Still working on it.</p>}
    </div>
  );
}

/* ── 4 and 5. Result: finding ungated; the rest blurred behind the gate or open ── */
export function ResultScreen(p: { result: RunScanResponse; gated: boolean; compact?: boolean; gate?: React.ReactNode; headingRef?: React.Ref<HTMLHeadingElement> }) {
  const r = p.result;
  return (
    <div>
      <h2 ref={p.headingRef} tabIndex={-1} className="sr-only">Results</h2>
      <div style={{ marginBottom: "1.5rem" }}><Finding r={r} /></div>
      {p.gated ? (
        <div style={{ position: "relative" }}>
          <div className="scan-gated" aria-hidden="true"><ResultDashboard r={r} sourceLimit={p.compact ? 4 : 8} /></div>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "1.5rem", boxShadow: "0 12px 40px rgba(11,18,32,0.14)", width: "100%", maxWidth: "440px" }}>
              {p.gate}
            </div>
          </div>
        </div>
      ) : (
        <ResultDashboard r={r} />
      )}
    </div>
  );
}

/* ── 6. Coverage after an upload ── */
export function CoverageScreen(p: {
  uploaded: number; cited: number; notCited: number;
  /** Named pieces where we have them. Null renders the slot as not yet available. */
  pieces: { title: string; cited: boolean }[] | null;
  owners: SourceEntry[]; readAt: string;
}) {
  const card: React.CSSProperties = { background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "1.25rem" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }} className="stack-mobile">
        {[[p.uploaded, "pieces uploaded"], [p.cited, "cited by the engines"], [p.notCited, "not cited"]].map(([n, l]) => (
          <div key={String(l)} style={card}>
            <p style={{ fontSize: "1.75rem", fontWeight: 800, color: C.navy, letterSpacing: "-0.03em", lineHeight: 1, margin: "0 0 0.25rem", fontVariantNumeric: "tabular-nums" }}>{n}</p>
            <p style={{ fontSize: "0.75rem", color: C.body, margin: 0 }}>{l}</p>
          </div>
        ))}
      </div>
      <div style={card}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.navy, margin: "0 0 0.75rem" }}>The pieces doing the work</p>
        {p.pieces ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {p.pieces.map((x) => (
              <li key={x.title} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.875rem", color: C.navy, borderTop: `1px solid ${C.border}`, paddingTop: "0.5rem" }}>
                <span>{x.title}</span><span style={{ color: x.cited ? "#15803D" : C.muted, fontWeight: 600 }}>{x.cited ? "cited" : "not cited"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0, lineHeight: 1.6 }}>Piece-level matching publishes when the upload runs live. The field is blank until it is measured.</p>
        )}
      </div>
      <div style={card}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.navy, margin: "0 0 0.75rem" }}>Sources that own the commercial questions</p>
        <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {p.owners.map((s) => <li key={s.domain} style={{ fontSize: "0.875rem", color: C.navy }}>{s.domain} <span style={{ color: C.muted }}>· {s.mentions} mention{s.mentions === 1 ? "" : "s"}</span></li>)}
        </ol>
        <p style={{ fontSize: "0.7rem", color: C.muted, margin: "0.75rem 0 0" }}>read {fmtDate(p.readAt)}</p>
      </div>
    </div>
  );
}

/* ── 7. Tracking, weekly, on the same questions ── */
export function TrackingScreen(p: {
  brand: string; baseline: HistoryPoint[]; readAt: string;
  /** Null until four weeks of tracking exist. Rendered as blank, never estimated. */
  after: { namedIn: number; of: number } | null;
  newlyNamed: string[] | null;
  shareOfVoiceWeekly: number[] | null;
}) {
  const card: React.CSSProperties = { background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "1.25rem" };
  const blank = <span style={{ color: C.muted, fontWeight: 500 }}>not yet measured</span>;
  const monthsWith = p.baseline.filter((h) => h.mentions > 0).length;
  const total = p.baseline.reduce((a, h) => a + h.mentions, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }} className="stack-mobile">
        <div style={card}>
          <p style={{ fontSize: "0.7rem", fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>Before</p>
          <p style={{ fontSize: "0.9375rem", color: C.navy, margin: 0, lineHeight: 1.55 }}>
            <strong>{total}</strong> mentions across <strong>{monthsWith}</strong> of the last {p.baseline.length} months.
          </p>
          <p style={{ fontSize: "0.7rem", color: C.muted, margin: "0.5rem 0 0" }}>read {fmtDate(p.readAt)}</p>
        </div>
        <div style={card}>
          <p style={{ fontSize: "0.7rem", fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>After four weeks</p>
          <p style={{ fontSize: "0.9375rem", color: C.navy, margin: 0, lineHeight: 1.55 }}>
            {p.after ? <>Named in <strong>{p.after.namedIn}</strong> of {p.after.of} answers.</> : blank}
          </p>
        </div>
      </div>
      <div style={card}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.navy, margin: "0 0 0.5rem" }}>Questions newly named in</p>
        {p.newlyNamed ? <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>{p.newlyNamed.map((q) => <li key={q} style={{ fontSize: "0.875rem", color: C.navy }}>{q}</li>)}</ul> : <p style={{ fontSize: "0.875rem", margin: 0 }}>{blank}</p>}
      </div>
      <div style={card}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.navy, margin: "0 0 0.5rem" }}>Share of voice, week by week</p>
        {p.shareOfVoiceWeekly ? (
          <div style={{ display: "flex", gap: "0.375rem", alignItems: "flex-end", height: 48 }}>
            {p.shareOfVoiceWeekly.map((v, i) => <div key={i} style={{ flex: 1, height: `${Math.max(4, v)}%`, background: C.purple, borderRadius: 3 }} title={`week ${i + 1}: ${v}%`} />)}
          </div>
        ) : <p style={{ fontSize: "0.875rem", margin: 0 }}>{blank}</p>}
      </div>
    </div>
  );
}
