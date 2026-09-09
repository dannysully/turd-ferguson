"use client";

import type { HistoryPoint, Market, RunScanResponse, SourceEntry } from "@/lib/scan";
import type { CoveragePiece, Tracking } from "@/lib/scan/illustrative";
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
  /** Server action for the no-JS path. With JS, onSubmit prevents default and handles it. */
  action?: (formData: FormData) => void | Promise<void>;
}) {
  const id = p.id ?? "scan-domain";
  return (
    <form action={p.action} onSubmit={p.onSubmit ?? ((e) => e.preventDefault())} noValidate>
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

/* ── 6a. Coverage upload: the screen before matching ── */
export function CoverageUploadScreen(p: { file: { name: string; rows: number } }) {
  const tab = (t: string, on: boolean) => (
    <span key={t} style={{ padding: "0.4rem 0.875rem", fontSize: "0.8125rem", fontWeight: 600, borderRadius: "8px", color: on ? C.white : C.body, background: on ? C.navy : "transparent" }}>{t}</span>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      <div style={{ display: "inline-flex", gap: "0.25rem", padding: "0.25rem", background: C.white, border: `1px solid ${C.border}`, borderRadius: "10px", alignSelf: "flex-start" }} role="tablist" aria-label="Upload method">
        {tab("Drag and drop", true)}{tab("Upload CSV", false)}{tab("Paste URLs", false)}
      </div>

      <div style={{ border: `2px dashed rgba(124,58,237,0.45)`, background: "rgba(124,58,237,0.04)", borderRadius: "16px", padding: "2rem 1.5rem", textAlign: "center" }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true" style={{ margin: "0 auto 0.75rem", display: "block" }}>
          <path d="M18 24V9M11 16l7-7 7 7" stroke={C.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 24v4a3 3 0 0 0 3 3h18a3 3 0 0 0 3-3v-4" stroke={C.purple} strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p style={{ fontWeight: 700, color: C.navy, margin: "0 0 0.375rem", fontSize: "1rem" }}>Drop your coverage here</p>
        <p style={{ fontSize: "0.8125rem", color: C.body, margin: 0, lineHeight: 1.6, maxWidth: "440px", marginInline: "auto" }}>
          A CSV with a <code style={{ fontFamily: "monospace", fontSize: "0.75rem", background: C.white, padding: "0.1rem 0.35rem", borderRadius: 4 }}>url</code> column, or one URL per line. We resolve redirects and match every URL against the sources the engines cited.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "0.75rem 1rem" }}>
        <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(34,197,94,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 600, color: C.navy, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.file.name}</p>
          <p style={{ fontSize: "0.75rem", color: C.muted, margin: 0 }}>{p.file.rows} rows · columns found: url, title, published, status</p>
        </div>
      </div>

      <p style={{ fontSize: "0.8125rem", color: C.body, margin: 0, lineHeight: 1.6 }}>
        Mark a piece <strong style={{ color: C.navy }}>upcoming</strong> and we record a baseline reading before it publishes, so it has a real before.
      </p>
      <button type="button" className="btn-primary" style={{ ...btn, alignSelf: "flex-start" }} disabled tabIndex={-1}>Match against cited sources</button>
    </div>
  );
}

/* ── 6b. Coverage after matching ── */
export function CoverageScreen(p: { pieces: CoveragePiece[]; owners: SourceEntry[]; readAt: string }) {
  const card: React.CSSProperties = { background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "1.25rem" };
  const cited = p.pieces.filter((x) => x.cited);
  /* Upcoming pieces first: the baseline-before-publish state is the one worth showing */
  const notCited = p.pieces.filter((x) => !x.cited).sort((a, b) => Number(b.status === "upcoming") - Number(a.status === "upcoming"));
  const themes = Array.from(new Set(p.pieces.map((x) => x.theme))).map((t) => ({
    theme: t, total: p.pieces.filter((x) => x.theme === t).length, cited: p.pieces.filter((x) => x.theme === t && x.cited).length,
  }));
  const badge = (text: string, tone: "green" | "grey" | "amber") => (
    <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: "999px", whiteSpace: "nowrap",
      color: tone === "green" ? "#15803D" : tone === "amber" ? "#B45309" : C.body,
      background: tone === "green" ? "rgba(34,197,94,0.12)" : tone === "amber" ? "rgba(245,158,11,0.12)" : "#F3F4F6" }}>{text}</span>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }} className="stack-mobile">
        {[[p.pieces.length, "pieces uploaded"], [cited.length, "cited by the engines"], [notCited.length, "not cited"]].map(([n, l]) => (
          <div key={String(l)} style={card}>
            <p style={{ fontSize: "1.75rem", fontWeight: 800, color: C.navy, letterSpacing: "-0.03em", lineHeight: 1, margin: "0 0 0.25rem", fontVariantNumeric: "tabular-nums" }}>{n}</p>
            <p style={{ fontSize: "0.75rem", color: C.body, margin: 0 }}>{l}</p>
          </div>
        ))}
      </div>

      <div style={card}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.navy, margin: "0 0 0.75rem" }}>The pieces doing the work</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
          {cited.map((x) => (
            <li key={x.title} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem", alignItems: "start", padding: "0.625rem 0", borderTop: `1px solid ${C.border}` }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: C.navy, margin: "0 0 0.2rem", lineHeight: 1.4 }}>{x.title}</p>
                <p style={{ fontSize: "0.75rem", color: C.muted, margin: 0 }}>{x.domain} · {fmtDate(x.published)} · {x.theme}</p>
              </div>
              <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {badge("cited", "green")}{badge(x.hasLink ? "with link" : "no link", "grey")}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div style={card}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.navy, margin: "0 0 0.75rem" }}>Not cited <span style={{ color: C.muted, fontWeight: 500 }}>· {notCited.length}</span></p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
          {notCited.slice(0, 6).map((x) => (
            <li key={x.title} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem", alignItems: "center", padding: "0.5rem 0", borderTop: `1px solid ${C.border}` }}>
              <p style={{ fontSize: "0.8125rem", color: C.body, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.title} <span style={{ color: C.muted }}>· {x.domain}</span></p>
              <div style={{ display: "flex", gap: "0.375rem" }}>
                {x.status === "upcoming" ? badge("upcoming · baseline recorded", "amber") : badge(x.theme, "grey")}
              </div>
            </li>
          ))}
        </ul>
        {notCited.length > 6 && <p style={{ fontSize: "0.75rem", color: C.muted, margin: "0.625rem 0 0" }}>and {notCited.length - 6} more</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }} className="stack-mobile">
        <div style={card}>
          <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.navy, margin: "0 0 0.625rem" }}>By theme</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <tbody>
              {themes.map((t) => (
                <tr key={t.theme} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "0.4rem 0", color: C.navy }}>{t.theme}</td>
                  <td style={{ padding: "0.4rem 0", textAlign: "right", color: C.body, fontVariantNumeric: "tabular-nums" }}>{t.cited} of {t.total} cited</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={card}>
          <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.navy, margin: "0 0 0.625rem" }}>Sources that own the commercial questions</p>
          <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {p.owners.map((s) => <li key={s.domain} style={{ fontSize: "0.8125rem", color: C.navy }}>{s.domain} <span style={{ color: C.muted }}>· {s.mentions}</span></li>)}
          </ol>
          <p style={{ fontSize: "0.7rem", color: C.muted, margin: "0.625rem 0 0" }}>read {fmtDate(p.readAt)}</p>
        </div>
      </div>
    </div>
  );
}

/* ── 7. Tracking: four weeks on, the report you send a client ── */
export function TrackingScreen(p: { brand: string; topic: string; market: Market; tracking: Tracking; baseline: HistoryPoint[] }) {
  const t = p.tracking;
  const card: React.CSSProperties = { background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "1.25rem" };
  const ord = (n: number) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const maxSov = Math.max(...t.weekly.map((w) => w.shareOfVoice), 1);
  const up = t.after.namedIn - t.before.namedIn;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Report header - white label */}
      <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", minWidth: 0 }}>
          <div aria-label="Your agency logo" style={{ width: 44, height: 44, borderRadius: 10, border: `1.5px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: C.muted, textAlign: "center", lineHeight: 1.2, flexShrink: 0 }}>your<br />logo</div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: C.navy, margin: 0 }}>AI visibility report · {p.brand}</p>
            <p style={{ fontSize: "0.75rem", color: C.muted, margin: 0 }}>{p.topic} · {p.market} · {fmtDate(t.before.readAt)} to {fmtDate(t.after.readAt)}</p>
          </div>
        </div>
        <button type="button" className="btn-primary" style={{ ...btn, padding: "0.625rem 1.25rem", fontSize: "0.8125rem" }} disabled tabIndex={-1}>Download report (PDF)</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }} className="stack-mobile">
        {[["Before", t.before], ["After four weeks", t.after]].map(([lbl, v]) => {
          const x = v as Tracking["before"];
          return (
            <div key={String(lbl)} style={card}>
              <p style={{ fontSize: "0.7rem", fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>{String(lbl)}</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, color: C.navy, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 0.25rem", fontVariantNumeric: "tabular-nums" }}>Named in {x.namedIn} of {x.of}</p>
              <p style={{ fontSize: "0.8125rem", color: C.body, margin: 0 }}>{ord(x.rank)} of {x.ofBrands} brands</p>
              <p style={{ fontSize: "0.7rem", color: C.muted, margin: "0.5rem 0 0" }}>read {fmtDate(x.readAt)}</p>
            </div>
          );
        })}
      </div>

      <div style={{ ...card, background: "rgba(34,197,94,0.06)", borderColor: "rgba(34,197,94,0.25)" }}>
        <p style={{ fontSize: "0.9375rem", color: C.navy, margin: 0, lineHeight: 1.55 }}>
          <strong>+{up}</strong> question{up === 1 ? "" : "s"} newly named in. Rank {ord(t.before.rank)} to {ord(t.after.rank)}. Share of voice {t.weekly[0].shareOfVoice}% to {t.weekly[t.weekly.length - 1].shareOfVoice}%.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }} className="stack-mobile">
        <div style={card}>
          <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.navy, margin: "0 0 0.5rem" }}>Questions newly named in</p>
          <ul style={{ margin: 0, paddingLeft: "1.125rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {t.newlyNamed.map((q) => <li key={q} style={{ fontSize: "0.8125rem", color: C.navy, lineHeight: 1.45 }}>{q}</li>)}
          </ul>
          <p style={{ fontSize: "0.8125rem", color: C.body, margin: "0.75rem 0 0" }}>No longer named: <strong style={{ color: C.navy }}>{t.noLongerNamed.length === 0 ? "none" : t.noLongerNamed.length}</strong></p>
        </div>
        <div style={card}>
          <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.navy, margin: "0 0 0.5rem" }}>Newly citing sources</p>
          <ul style={{ margin: 0, paddingLeft: "1.125rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {t.newlyCitingSources.map((d) => <li key={d} style={{ fontSize: "0.8125rem", color: C.navy }}>{d}</li>)}
          </ul>
        </div>
      </div>

      <div style={card}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.navy, margin: "0 0 0.75rem" }}>Share of voice, week by week</p>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${t.weekly.length}, 1fr)`, gap: "0.75rem", alignItems: "end" }}>
          {t.weekly.map((w) => (
            <div key={w.week} style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: C.navy, margin: "0 0 0.25rem", fontVariantNumeric: "tabular-nums" }}>{w.shareOfVoice}%</p>
              <div style={{ height: 72, display: "flex", alignItems: "flex-end" }}>
                <div style={{ width: "100%", height: `${(w.shareOfVoice / maxSov) * 100}%`, background: C.purple, borderRadius: "6px 6px 3px 3px" }} />
              </div>
              <p style={{ fontSize: "0.7rem", color: C.muted, margin: "0.375rem 0 0" }}>{w.week}</p>
              <p style={{ fontSize: "0.65rem", color: C.muted, margin: 0 }}>{w.namedIn} of {t.before.of}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
