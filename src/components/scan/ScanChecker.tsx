"use client";

import { useEffect, useRef, useState } from "react";
import { runScanAction, signUpAction, startScanAction } from "@/app/actions/checker";
import type { Market, RunScanResponse, StartScanResponse } from "@/lib/scan";
import ResultDashboard, { Finding } from "./ResultDashboard";

/**
 * Domain -> topic and market -> running -> result, replacing itself in place.
 * No navigation, no modal. Every error and empty case in the brief renders
 * here. The block reserves its height so the page does not shift as it fills.
 */

const C = { navy: "#0B1220", purple: "#7C3AED", body: "#4B5563", soft: "#F8F7FF", border: "#E5E7EB", white: "#ffffff", muted: "#9CA3AF", red: "#B91C1C" };

type Step = "domain" | "topic" | "running" | "result";
type Err = { kind: "unreachable" | "rate_limited" | "api_down" | "invalid"; message: string } | null;

const STEPS = ["Building the questions buyers ask", "Reading what the engines answered", "Finding the sources they cited"];
const STEP_MS = 700;
const SLOW_MS = 12000;

/* Five events, no third-party script. Pushes to dataLayer when one exists. */
function track(event: string, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event, ...props });
}

const field: React.CSSProperties = { width: "100%", padding: "0.875rem 1rem", fontSize: "1rem", color: C.navy, background: C.white, border: `1.5px solid ${C.border}`, borderRadius: "12px", fontFamily: "inherit", outline: "none" };
const label: React.CSSProperties = { display: "block", fontSize: "0.8125rem", fontWeight: 600, color: C.navy, marginBottom: "0.5rem" };
const btn: React.CSSProperties = { border: "none", cursor: "pointer", padding: "0.875rem 2rem" };
const quiet: React.CSSProperties = { background: "none", border: "none", color: C.body, fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "0.875rem 0" };

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ScanChecker({ compact = false }: { compact?: boolean }) {
  const [step, setStep] = useState<Step>("domain");
  const [err, setErr] = useState<Err>(null);
  const [domain, setDomain] = useState("");
  const [start, setStart] = useState<StartScanResponse | null>(null);
  const [brandName, setBrandName] = useState("");
  const [topic, setTopic] = useState("");
  const [market, setMarket] = useState<Market>("UK");
  const [result, setResult] = useState<RunScanResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [slow, setSlow] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [emailDone, setEmailDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState("");

  const headingRef = useRef<HTMLHeadingElement>(null);

  /* Focus lands on the new heading, not the top of the document */
  useEffect(() => { headingRef.current?.focus(); }, [step, err]);

  async function onDomain(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    const res = await startScanAction(domain);
    setBusy(false);
    if (!res.ok) { setErr(res); setAnnounce(res.message); return; }
    track("domain_entered");
    setStart(res.data);
    setBrandName(res.data.brand ?? "");
    setTopic(res.data.suggested_topic ?? "");
    setStep("topic");
    setAnnounce("Step 2 of 3. Confirm the topic and market.");
  }

  /* Unreachable domain: the user supplies the brand name and we carry on */
  function onBrandSupplied(e: React.FormEvent) {
    e.preventDefault();
    if (!brandName.trim()) return;
    setErr(null);
    setStart({ scan_id: "", brand: brandName.trim(), suggested_topic: null, markets: ["UK", "US"] });
    setStep("topic");
    setAnnounce("Step 2 of 3. Confirm the topic and market.");
  }

  async function onRun(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || !start) return;
    const edited = topic.trim() !== (start.suggested_topic ?? "");
    track("category_confirmed", { edited });
    setErr(null); setStep("running"); setProgress(0); setSlow(false);
    setAnnounce("Checking. This takes about a minute.");

    const t1 = setTimeout(() => setProgress(1), STEP_MS);
    const t2 = setTimeout(() => setProgress(2), STEP_MS * 2);
    const tSlow = setTimeout(() => setSlow(true), SLOW_MS);

    /* Minimum display time so the steps read as work, not a flash */
    const [res] = await Promise.all([
      runScanAction({ scan_id: start.scan_id || domain, topic: topic.trim(), market }),
      delay(STEP_MS * 3),
    ]);
    clearTimeout(t1); clearTimeout(t2); clearTimeout(tSlow);

    if (!res.ok) { setErr(res); setStep("topic"); setAnnounce(res.message); return; }
    setResult(res.data);
    setStep("result");
    track("result_shown", { empty: res.data.empty });
    setAnnounce(res.data.empty ? "No result for this topic yet." : "Results ready.");
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const email = (new FormData(form).get("email") as string) ?? "";
    setEmailErr(""); setBusy(true);
    const res = await signUpAction({ scan_id: start?.scan_id ?? "", email, domain, topic, market });
    setBusy(false);
    if (!res.ok) { setEmailErr(res.message); return; }
    track("email_submitted");
    setEmailDone(true);
    setAnnounce("Thanks. Your report is on its way.");
  }

  const h = (text: string) => (
    <h2 ref={headingRef} tabIndex={-1} style={{ fontSize: "1rem", fontWeight: 700, color: C.navy, margin: "0 0 1rem", outline: "none", lineHeight: 1.45 }}>{text}</h2>
  );

  const errorBlock = err && err.kind !== "invalid" && (
    <div role="alert" style={{ background: "rgba(185,28,28,0.06)", border: "1px solid rgba(185,28,28,0.25)", borderRadius: "12px", padding: "1rem 1.125rem", marginBottom: "1rem" }}>
      {err.kind === "unreachable" && (
        <form onSubmit={onBrandSupplied}>
          <p style={{ fontSize: "0.9375rem", color: C.navy, margin: "0 0 0.75rem", lineHeight: 1.55 }}>
            We could not load {domain}. Check it and try again, or tell us the brand name yourself.
          </p>
          <label htmlFor="scan-brand" style={label}>What is the brand called?</label>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
            <input id="scan-brand" value={brandName} onChange={(e) => setBrandName(e.target.value)} style={{ ...field, flex: "1 1 200px" }} />
            <button type="submit" className="btn-primary" style={btn}>Continue</button>
          </div>
        </form>
      )}
      {err.kind === "rate_limited" && (
        <p style={{ fontSize: "0.9375rem", color: C.navy, margin: 0, lineHeight: 1.55 }}>
          You have run five checks this hour. <a href="/contact" style={{ color: C.purple, fontWeight: 600 }}>Open an account</a> and run as many as you like.
        </p>
      )}
      {err.kind === "api_down" && (
        <p style={{ fontSize: "0.9375rem", color: C.navy, margin: 0, lineHeight: 1.55 }}>
          Something broke at our end, not yours. Try again in a minute.
        </p>
      )}
    </div>
  );

  const emailForm = (
    <form onSubmit={onEmail}>
      <label htmlFor="scan-email" style={label}>Your email</label>
      <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
        <input id="scan-email" name="email" type="email" required autoComplete="email" placeholder="you@agency.com" style={{ ...field, flex: "1 1 220px" }} />
        <button type="submit" className="btn-primary" style={btn} disabled={busy}>{busy ? "Sending" : "Show me"}</button>
      </div>
      {emailErr && <p role="alert" style={{ fontSize: "0.8125rem", color: C.red, marginTop: "0.5rem" }}>{emailErr}</p>}
      <p style={{ fontSize: "0.8125rem", color: C.body, marginTop: "0.75rem", lineHeight: 1.6 }}>One scan, no charge. Ongoing tracking is a paid plan.</p>
    </form>
  );

  return (
    <div style={{ maxWidth: compact ? "480px" : "720px", minHeight: compact ? "220px" : "300px" }}>
      <div aria-live="polite" className="sr-only">{announce}</div>

      {/* Step indicator */}
      {step !== "result" && (
        <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.25rem" }} aria-hidden="true">
          {["domain", "topic", "running"].map((s, i) => {
            const idx = ["domain", "topic", "running"].indexOf(step);
            return <div key={s} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= idx ? C.purple : C.border }} />;
          })}
        </div>
      )}

      {errorBlock}

      {/* ── State 1: domain ── */}
      {step === "domain" && (
        <form onSubmit={onDomain} noValidate>
          <label htmlFor="scan-domain" style={label}>Your client&apos;s domain</label>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
            <input id="scan-domain" name="domain" inputMode="url" autoComplete="url" placeholder="client-domain.com"
              value={domain} onChange={(e) => setDomain(e.target.value)} style={{ ...field, flex: "1 1 220px" }}
              aria-invalid={err?.kind === "invalid"} aria-describedby={err?.kind === "invalid" ? "scan-domain-err" : undefined} />
            <button type="submit" className="btn-primary" style={btn} disabled={busy}>{busy ? "Checking" : "Check"}</button>
          </div>
          {err?.kind === "invalid" && <p id="scan-domain-err" style={{ fontSize: "0.8125rem", color: C.red, marginTop: "0.5rem" }}>{err.message}</p>}
          {!compact && (
            <p style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
              <a href="/example" style={{ color: C.body, textDecoration: "underline", textUnderlineOffset: 3 }}>See a full example first</a>
            </p>
          )}
        </form>
      )}

      {/* ── State 2: topic and market ── */}
      {step === "topic" && start && (
        <form onSubmit={onRun} noValidate>
          {start.brand
            ? h(`We read ${start.brand} from the domain. Which topic should we check them against?`)
            : h("Which topic should we check them against?")}
          {!start.brand && (
            <>
              <label htmlFor="scan-brand2" style={label}>What is the brand called?</label>
              <input id="scan-brand2" value={brandName} onChange={(e) => setBrandName(e.target.value)} style={{ ...field, marginBottom: "0.75rem" }} />
            </>
          )}
          <label htmlFor="scan-topic" style={label}>Topic</label>
          <input id="scan-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="b2b seo agency" style={{ ...field, marginBottom: "0.75rem" }} />
          <fieldset style={{ border: "none", padding: 0, margin: "0 0 0.75rem" }}>
            <legend style={label}>Market</legend>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["UK", "US"] as Market[]).map((m) => (
                <button key={m} type="button" onClick={() => setMarket(m)} aria-pressed={market === m}
                  style={{ padding: "0.5rem 1.125rem", fontSize: "0.875rem", fontWeight: 600, fontFamily: "inherit", color: market === m ? C.white : C.navy, background: market === m ? C.purple : C.white, border: `1.5px solid ${market === m ? C.purple : C.border}`, borderRadius: "10px", cursor: "pointer" }}>
                  {m}
                </button>
              ))}
            </div>
          </fieldset>
          <p style={{ fontSize: "0.8125rem", color: C.body, lineHeight: 1.6, marginBottom: "1.25rem" }}>
            Write the topic the way a buyer would say it, not the way you would pitch it. It decides every question we ask.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" className="btn-primary" style={btn} disabled={!topic.trim() || (!start.brand && !brandName.trim())}>Run the check</button>
            <button type="button" onClick={() => { setStep("domain"); setErr(null); }} style={quiet}>Back</button>
          </div>
        </form>
      )}

      {/* ── Running: three named steps, never a bare spinner ── */}
      {step === "running" && (
        <div>
          {h("Checking " + (start?.brand ?? brandName ?? domain))}
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {STEPS.map((s, i) => {
              const state = i < progress ? "done" : i === progress ? "active" : "todo";
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
          {slow && <p style={{ fontSize: "0.8125rem", color: C.body, marginTop: "1rem" }}>This is taking longer than usual. Still working on it.</p>}
        </div>
      )}

      {/* ── State 3: result ── */}
      {step === "result" && result && (
        <div>
          {result.empty ? (
            <div>
              {h(`The engines have not been asked enough about ${result.topic} in ${result.market === "UK" ? "the UK" : "the US"} for us to rank brands yet.`)}
              <p style={{ fontSize: "0.9375rem", color: C.body, lineHeight: 1.65, marginBottom: "1.25rem" }}>
                That is worth knowing on its own. Give us an email and we will start asking them this week - your first reading is the baseline.
              </p>
              {emailDone ? <p style={{ fontWeight: 600, color: C.navy }}>Thanks. We will be in touch when the first reading lands.</p> : emailForm}
            </div>
          ) : (
            <div>
              <div ref={undefined}><h2 ref={headingRef} tabIndex={-1} className="sr-only">Results</h2></div>
              <div style={{ marginBottom: "1.5rem" }}><Finding r={result} /></div>

              {/* Gated block: real content rendered, then blurred, with the form over it */}
              <div style={{ position: "relative" }}>
                <div className="scan-gated" aria-hidden="true">
                  <ResultDashboard r={result} sourceLimit={compact ? 4 : 8} />
                </div>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "1.5rem", boxShadow: "0 12px 40px rgba(11,18,32,0.14)", width: "100%", maxWidth: "440px" }}>
                    {emailDone ? (
                      <>
                        <p style={{ fontWeight: 700, color: C.navy, marginBottom: "0.5rem" }}>Thanks. Your report is on its way.</p>
                        <p style={{ fontSize: "0.875rem", color: C.body, lineHeight: 1.6, margin: 0 }}>The full source list and history for {result.topic}, by email within one working day.</p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontWeight: 700, color: C.navy, marginBottom: "0.5rem" }}>See everything behind this.</p>
                        <p style={{ fontSize: "0.875rem", color: C.body, lineHeight: 1.6, marginBottom: "1rem" }}>
                          The full source list and the history for {result.topic}. Then upload the coverage you have already earned and find out which pieces are doing the work.
                        </p>
                        {emailForm}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
