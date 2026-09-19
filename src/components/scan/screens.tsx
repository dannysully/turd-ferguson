"use client";

import type { Market } from "@/lib/scan";
import { T } from "@/config/tokens";

/**
 * The two screens that come before a scan has a token: the domain field, and
 * the topic form the no-credentials fallback uses.
 *
 * Everything else that lived here - the running screen, the result, the
 * coverage and tracking walkthroughs - belonged to /example, which Danny
 * removed on 19 September 2026. The flow's own screens are ConfirmScreen,
 * HeroSequence and ResultView, built from the boards.
 *
 * The C palette object went with them. It was the pre-redesign navy set,
 * latterly mapped key by key onto the tokens; nothing maps now, these read
 * T directly, and the token migration is finished.
 *
 * readOnly renders the screen non-interactive but styled exactly as live.
 */

export const field: React.CSSProperties = { width: "100%", padding: "0.875rem 1rem", fontSize: "1rem", color: T.ink, background: T.surface, border: `1.5px solid ${T.line}`, borderRadius: "12px", fontFamily: "inherit", outline: "none" };
/* A micro-label, per the boards: 12px/600 on soft, sentence case. */
export const label: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.002em", color: T.soft, marginBottom: "7px" };
export const btn: React.CSSProperties = { border: "none", cursor: "pointer", padding: "0.875rem 2rem" };
const quiet: React.CSSProperties = { background: "none", border: "none", color: T.soft, fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "0.875rem 0" };


const ro = (readOnly?: boolean) => (readOnly ? { readOnly: true, tabIndex: -1, "aria-readonly": true as const } : {});

/* ── 1. Domain ── */
export function DomainScreen(p: {
  value: string; onChange?: (v: string) => void; onSubmit?: (e: React.FormEvent) => void;
  error?: string; busy?: boolean; readOnly?: boolean; id?: string;
  /** Server action for the no-JS path. With JS, onSubmit prevents default and handles it. */
  action?: (formData: FormData) => void | Promise<void>;
}) {
  const id = p.id ?? "scan-domain";
  return (
    <form action={p.action} onSubmit={p.onSubmit ?? ((e) => e.preventDefault())} noValidate>
      <label htmlFor={id} style={label}>Domain</label>
      <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
        <input id={id} name="domain" inputMode="url" autoComplete="url" placeholder="example.com"
          value={p.value} onChange={(e) => p.onChange?.(e.target.value)} style={{ ...field, flex: "1 1 220px" }}
          aria-invalid={Boolean(p.error)} aria-describedby={p.error ? `${id}-err` : undefined} {...ro(p.readOnly)} />
        <button type="submit" className="btn-primary" style={btn} disabled={p.busy || p.readOnly} tabIndex={p.readOnly ? -1 : undefined}>
          {p.busy ? "Checking" : "Check"}
        </button>
      </div>
      {p.error && <p id={`${id}-err`} style={{ fontSize: "0.8125rem", color: T.badFg, marginTop: "0.5rem" }}>{p.error}</p>}
    </form>
  );
}

/* ── 2. Topic and market ── */
// headingRef is destructured out of the props bag rather than read as
// p.headingRef. The React Compiler treats a ref held anywhere in an object
// as making every read of that object a ref access, so leaving it in `p`
// flagged p.onBack, p.readOnly and even module-level style constants as
// refs accessed during render.
export function TopicScreen({ headingRef, ...p }: {
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
      <h2 ref={headingRef} tabIndex={-1} style={{ fontSize: "1rem", fontWeight: 700, color: T.ink, margin: "0 0 1rem", outline: "none", lineHeight: 1.45 }}>
        {p.brand ? <>We read <span style={{ color: T.accent }}>{p.brand}</span> from the domain.</> : "Tell us what to check."}
      </h2>
      {!p.brand && (
        <>
          <label htmlFor={`${id}-brand`} style={label}>What is the brand called?</label>
          <input id={`${id}-brand`} value={p.brandName ?? ""} onChange={(e) => p.onBrandName?.(e.target.value)} style={{ ...field, marginBottom: "0.75rem" }} {...ro(p.readOnly)} />
        </>
      )}
      <label htmlFor={`${id}-topic`} style={label}>
        What keyword are you targeting?{" "}
        <span style={{ fontWeight: 400, color: T.faint }}>This informs the questions we check.</span>
      </label>
      <input id={`${id}-topic`} value={p.topic} onChange={(e) => p.onTopic?.(e.target.value)} placeholder="b2b seo agency" style={{ ...field, marginBottom: "0.75rem" }} {...ro(p.readOnly)} />
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 0.75rem" }}>
        <legend style={label}>Market</legend>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["UK", "US"] as Market[]).map((m) => (
            <button key={m} type="button" onClick={() => p.onMarket?.(m)} aria-pressed={p.market === m} disabled={p.readOnly} tabIndex={p.readOnly ? -1 : undefined}
              style={{ padding: "0.5rem 1.125rem", fontSize: "0.875rem", fontWeight: 600, fontFamily: "inherit", color: p.market === m ? T.surface : T.ink, background: p.market === m ? T.accent : T.surface, border: `1.5px solid ${p.market === m ? T.accent : T.line}`, borderRadius: "10px", cursor: p.readOnly ? "default" : "pointer" }}>
              {m}
            </button>
          ))}
        </div>
      </fieldset>
      <p style={{ fontSize: "0.8125rem", color: T.soft, lineHeight: 1.6, marginBottom: "1.25rem" }}>
        Write it the way a buyer would say it, not the way you would pitch it. It decides every question we ask.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="btn-primary" style={btn} disabled={!canRun || p.readOnly} tabIndex={p.readOnly ? -1 : undefined}>Run the check</button>
        {p.onBack && !p.readOnly && <button type="button" onClick={p.onBack} style={quiet}>Back</button>}
      </div>
    </form>
  );
}







