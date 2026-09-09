"use client";

import { useActionState, useState } from "react";
import { submitScanRequest, type ScanState } from "@/app/actions/scan";

/**
 * Three steps in place: domain, then topic and market, then email.
 *
 * The scan backend is not live, so step three submits the request and tells
 * the reader the report is coming. No leaderboard, no share of voice, no
 * "named in N of M" - showing any of those before they are measured would
 * break the same page's own rule that we never fill a gap with a model.
 *
 * The brand name in step two is parsed from the domain the reader typed, not
 * read from their site, and the copy says so.
 */

const C = {
  navy: "#0B1220",
  purple: "#7C3AED",
  body: "#4B5563",
  border: "#E5E7EB",
  soft: "#F8F7FF",
  white: "#ffffff",
};

const initial: ScanState = { status: "idle" };

/** Strip scheme, www and TLD, then title-case what is left. */
function brandFromDomain(raw: string): string {
  const host = raw
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .trim();
  const stem = host.split(".")[0] ?? host;
  return stem
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const DOMAIN_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i;

const field: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1rem",
  fontSize: "1rem",
  color: C.navy,
  background: C.white,
  border: `1.5px solid ${C.border}`,
  borderRadius: "12px",
  fontFamily: "inherit",
  outline: "none",
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: C.navy,
  marginBottom: "0.5rem",
};

export default function ScanForm({ compact = false }: { compact?: boolean }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [domain, setDomain] = useState("");
  const [topic, setTopic] = useState("");
  const [market, setMarket] = useState("UK");
  const [domainError, setDomainError] = useState("");
  const [state, formAction, pending] = useActionState(submitScanRequest, initial);

  const brand = brandFromDomain(domain);

  function goToTopic(e: React.FormEvent) {
    e.preventDefault();
    const value = domain.trim();
    if (!DOMAIN_RE.test(value)) {
      setDomainError("Enter a domain, like client-domain.com");
      return;
    }
    setDomainError("");
    setStep(2);
  }

  function goToEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setStep(3);
  }

  /* Submitted */
  if (state.status === "success") {
    return (
      <div style={{
        background: C.soft,
        border: `1px solid ${C.border}`,
        borderRadius: "16px",
        padding: "1.75rem",
        maxWidth: "480px",
      }}>
        <p style={{ fontWeight: 700, fontSize: "1rem", color: C.navy, marginBottom: "0.5rem" }}>
          Thanks. Your report is on its way.
        </p>
        <p style={{ fontSize: "0.875rem", color: C.body, lineHeight: 1.65 }}>
          We will run <strong style={{ color: C.navy }}>{brand || domain}</strong> against{" "}
          <strong style={{ color: C.navy }}>{topic}</strong> in the {market} and send the results to{" "}
          {state.email}. Reports are produced by hand while the scan is being finished, so it will
          not be instant - expect it within one working day.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: compact ? "440px" : "480px" }}>
      {/* Step indicator - three states, so the reader knows what is coming */}
      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.25rem" }} aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            style={{
              height: "3px",
              flex: 1,
              borderRadius: "2px",
              background: n <= step ? C.purple : C.border,
              transition: "background 0.2s ease",
            }}
          />
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={goToTopic} noValidate>
          <label htmlFor="scan-domain" style={label}>Your client&apos;s domain</label>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
            <input
              id="scan-domain"
              name="domain"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="client-domain.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              style={{ ...field, flex: "1 1 220px" }}
              aria-invalid={Boolean(domainError)}
              aria-describedby={domainError ? "scan-domain-error" : undefined}
            />
            <button type="submit" className="btn-primary" style={{ border: "none", cursor: "pointer", padding: "0.875rem 2rem" }}>
              Check
            </button>
          </div>
          {domainError && (
            <p id="scan-domain-error" style={{ fontSize: "0.8125rem", color: "#B91C1C", marginTop: "0.5rem" }}>
              {domainError}
            </p>
          )}
        </form>
      )}

      {step === 2 && (
        <form onSubmit={goToEmail} noValidate>
          <p style={{ fontSize: "0.9375rem", color: C.navy, fontWeight: 600, marginBottom: "1rem", lineHeight: 1.5 }}>
            We read <span style={{ color: C.purple }}>{brand}</span> from the domain. Which topic should we check them against?
          </p>

          <label htmlFor="scan-topic" style={label}>Topic</label>
          <input
            id="scan-topic"
            type="text"
            placeholder="invoice factoring"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{ ...field, marginBottom: "0.75rem" }}
          />

          <fieldset style={{ border: "none", padding: 0, margin: "0 0 0.75rem" }}>
            <legend style={label}>Market</legend>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {["UK", "US"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMarket(m)}
                  aria-pressed={market === m}
                  style={{
                    padding: "0.5rem 1.125rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    color: market === m ? C.white : C.navy,
                    background: market === m ? C.purple : C.white,
                    border: `1.5px solid ${market === m ? C.purple : C.border}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </fieldset>

          <p style={{ fontSize: "0.8125rem", color: C.body, lineHeight: 1.6, marginBottom: "1.25rem" }}>
            Write the topic the way a buyer would say it, not the way you would pitch it. It decides
            every question we ask.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" className="btn-primary" style={{ border: "none", cursor: "pointer", padding: "0.875rem 2rem" }} disabled={!topic.trim()}>
              Run the check
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{ background: "none", border: "none", color: C.body, fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "0.875rem 0" }}
            >
              Back
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form action={formAction}>
          <input type="hidden" name="domain" value={domain} />
          <input type="hidden" name="topic" value={topic} />
          <input type="hidden" name="market" value={market} />

          <p style={{ fontSize: "0.9375rem", color: C.navy, fontWeight: 600, marginBottom: "0.625rem", lineHeight: 1.5 }}>
            Where should we send the report?
          </p>
          <p style={{ fontSize: "0.875rem", color: C.body, lineHeight: 1.65, marginBottom: "1.25rem" }}>
            The full leaderboard for <strong style={{ color: C.navy }}>{topic}</strong>, every source the
            engines cite for it, and history back to August 2025.
          </p>

          <label htmlFor="scan-email" style={label}>Your email</label>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
            <input
              id="scan-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@agency.com"
              style={{ ...field, flex: "1 1 220px" }}
            />
            <button type="submit" className="btn-primary" style={{ border: "none", cursor: "pointer", padding: "0.875rem 2rem" }} disabled={pending}>
              {pending ? "Sending" : "Show me"}
            </button>
          </div>

          {state.status === "error" && (
            <p role="alert" style={{ fontSize: "0.8125rem", color: "#B91C1C", marginTop: "0.625rem", lineHeight: 1.55 }}>
              {state.message}
            </p>
          )}

          <p style={{ fontSize: "0.8125rem", color: C.body, marginTop: "0.875rem", lineHeight: 1.6 }}>
            No card. Your scan is saved as your first client.
          </p>
          <button
            type="button"
            onClick={() => setStep(2)}
            style={{ background: "none", border: "none", color: C.body, fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "0.625rem 0 0" }}
          >
            Back
          </button>
        </form>
      )}
    </div>
  );
}
