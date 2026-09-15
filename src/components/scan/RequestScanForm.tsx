"use client";

import { useState } from "react";

import { requestScan } from "@/app/actions/waitlist";

import { C, btn, field, label } from "./screens";

/**
 * What the domain field does while the live scan is switched off.
 *
 * No score, no leaderboard, no empty-state verdict: nothing is measured, so
 * nothing is reported. The alternative, a fixture-backed dashboard, told real
 * visitors things about their brand that were never checked.
 */
export default function RequestScanForm({
  compact = false,
  initialDomain = "",
}: {
  compact?: boolean;
  initialDomain?: string;
}) {
  const [domain, setDomain] = useState(initialDomain);
  const [topic, setTopic] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await requestScan({ domain, email, topic });
      if (res.ok) setDone(true);
      else setError(res.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        style={{
          background: C.soft,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: "1.5rem",
        }}
      >
        <p style={{ fontSize: "1rem", fontWeight: 700, color: C.navy, margin: "0 0 0.5rem" }}>
          Got it. We will run {domain} and send it over.
        </p>
        <p style={{ fontSize: "0.9375rem", color: C.body, margin: 0, lineHeight: 1.65 }}>
          You will get the questions we asked, which engines named them, and every source those
          engines cited. If anything is urgent, reply to the email and it reaches a person.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor="rq-domain" style={label}>
        Your client&apos;s domain
      </label>
      <input
        id="rq-domain"
        name="domain"
        inputMode="url"
        autoComplete="url"
        placeholder="client-domain.com"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        style={field}
        required
      />

      <label htmlFor="rq-topic" style={{ ...label, marginTop: "0.875rem" }}>
        What should we check them for?
      </label>
      <input
        id="rq-topic"
        name="topic"
        placeholder="fractional cfo"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        style={field}
      />

      <label htmlFor="rq-email" style={{ ...label, marginTop: "0.875rem" }}>
        Where should the report go?
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

      {error && <p style={{ fontSize: "0.8125rem", color: C.red, marginTop: "0.5rem" }}>{error}</p>}

      <button
        type="submit"
        className="btn-primary"
        style={{ ...btn, marginTop: "1rem", width: compact ? "100%" : undefined }}
        disabled={busy}
      >
        {busy ? "Sending" : "Request the check"}
      </button>

      <p style={{ fontSize: "0.8125rem", color: C.muted, marginTop: "0.875rem", lineHeight: 1.6 }}>
        Automatic checks are switched on shortly. Until then a person runs it and sends the same
        report, usually within a working day. One check, no charge.
      </p>
    </form>
  );
}
