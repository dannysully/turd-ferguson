"use client";

import { useState } from "react";

import { requestScan } from "@/app/actions/waitlist";
import { FREE_ENGINE_LABELS, listOf } from "@/config/scan-shape";
import { T } from "@/config/tokens";

import { DomainScreen, TopicScreen, btn, field, label } from "./screens";

/**
 * What the domain field does while the live scan is switched off.
 *
 * It mirrors the live flow's shape so the switch-over changes nothing the
 * visitor has to relearn: domain, then the keyword, then a step that asks for
 * an address. What it never does is report a result. Nothing is measured here,
 * so nothing is claimed.
 */
type Step = "domain" | "topic" | "email" | "done";

export default function RequestScanForm({ initialDomain = "" }: { initialDomain?: string }) {
  const [step, setStep] = useState<Step>("domain");
  const [domain, setDomain] = useState(initialDomain);
  const [topic, setTopic] = useState("");
  const [market, setMarket] = useState<"UK" | "US">("UK");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const DOMAIN = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i;

  function onDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!DOMAIN.test(domain.trim())) {
      setError("Enter a domain, like example.com");
      return;
    }
    setError("");
    setStep("topic");
  }

  function onTopic(e: React.FormEvent) {
    e.preventDefault();
    if (topic.trim().length < 2) {
      setError("Tell us the keyword in a few words.");
      return;
    }
    setError("");
    setStep("email");
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await requestScan({ domain, email, topic });
      if (res.ok) setStep("done");
      else setError(res.message);
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <div style={{ background: T.bg, border: `1px solid ${T.line}`, borderRadius: 16, padding: "1.5rem" }}>
        <p style={{ fontSize: "1rem", fontWeight: 700, color: T.ink, margin: "0 0 0.5rem" }}>
          Got it. We will run {domain} for {topic} and send it over.
        </p>
        <p style={{ fontSize: "0.9375rem", color: T.soft, margin: 0, lineHeight: 1.65 }}>
          You will get the questions we asked, which engines named them, and every source those
          engines cited. Reply to that email and it reaches a person.
        </p>
      </div>
    );
  }

  return (
    <div>
      {step === "domain" && (
        <DomainScreen value={domain} onChange={setDomain} onSubmit={onDomain} error={error} />
      )}

      {step === "topic" && (
        <>
          <TopicScreen
            brand={null}
            brandName={domain}
            onBrandName={setDomain}
            topic={topic}
            onTopic={setTopic}
            market={market}
            onMarket={setMarket}
            onSubmit={onTopic}
            onBack={() => {
              setStep("domain");
              setError("");
            }}
          />
          {error && <p role="alert" style={{ fontSize: "0.8125rem", color: T.badFg, marginTop: "0.75rem" }}>{error}</p>}
        </>
      )}

      {step === "email" && (
        <form onSubmit={onEmail} noValidate>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: T.ink, margin: "0 0 0.5rem", lineHeight: 1.45 }}>
            Automatic checks switch on shortly.
          </h2>
          {/* The engine names were typed here - "Google AI Overviews, ChatGPT
              and Gemini" - and had been wrong since 3586cbf moved Perplexity
              into the free set, so this promised three of the four engines the
              report actually carries while calling it "the same report".
              `typedEngines` in copy.test.mts could not see it: that sweep
              matches a *count* in front of the word "engines", and this line
              has no count in it. Derived now, from the same pair
              /coverage-check uses. */}
          <p style={{ fontSize: "0.9375rem", color: T.soft, margin: "0 0 1.125rem", lineHeight: 1.65 }}>
            Until they do, a person runs {domain} for {topic} against{" "}
            {listOf(FREE_ENGINE_LABELS)} and sends you the same report, usually within a working
            day. One check, no charge.
          </p>

          <label htmlFor="rq-email" style={label}>
            Where should it go?
          </label>
          <input
            id="rq-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@agency.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={field}
            required
          />
          {error && <p role="alert" style={{ fontSize: "0.8125rem", color: T.badFg, marginTop: "0.5rem" }}>{error}</p>}

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginTop: "1rem" }}>
            <button type="submit" className="btn-primary" style={btn} disabled={busy}>
              {busy ? "Sending" : "Send me the report"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("topic");
                setError("");
              }}
              style={{ background: "none", border: "none", color: T.soft, fontSize: "0.875rem", cursor: "pointer", fontFamily: "inherit" }}
            >
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
