"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import Turnstile from "@/components/scan/Turnstile";
import { MICRO, T } from "@/config/tokens";
import { MAX_COVERAGE_BYTES } from "@/lib/coverage/csv";

/**
 * The campaign form, which now runs.
 *
 * The page it sits in carried a "Not open yet" panel and four disabled inputs
 * until the run path existed, and the reason that panel was there is the reason
 * this component looks the way it does: there is still no email field. A
 * reading opens on its own link, which needs nothing from the visitor, so
 * nothing is collected that we cannot use. The address goes in when the backend
 * can send - proposal 6, together with its line in the privacy policy.
 *
 * The coverage file is read in the browser and posted as text. It is a list of
 * URLs - 500 of them is perhaps 30KB - so a multipart upload would be a second
 * request shape on this site for no benefit, and the server bounds the body
 * before it parses it either way.
 */

const field: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "14px",
  color: T.ink,
  background: T.surface,
  border: `1px solid ${T.line}`,
  borderRadius: "10px",
  padding: "11px 13px",
};

const labelStyle: React.CSSProperties = { ...MICRO, display: "block", marginBottom: "6px" };

export default function CoverageForm() {
  const router = useRouter();
  const [brand, setBrand] = useState("");
  const [domain, setDomain] = useState("");
  const [topic, setTopic] = useState("");
  const [segment, setSegment] = useState("");
  const [market, setMarket] = useState<"UK" | "US">("UK");
  const [csv, setCsv] = useState("");
  const [fileNote, setFileNote] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setCsv("");
      setFileNote("");
      return;
    }
    // Bounded here as well as on the server. The server's limit is the one that
    // counts; this one exists so a visitor who picks the wrong file is told
    // before they wait for an upload that will be refused.
    if (file.size > MAX_COVERAGE_BYTES) {
      setCsv("");
      setFileNote("");
      setError("That file is too large. A list of URLs, not the articles themselves.");
      return;
    }
    const text = await file.text();
    setCsv(text);
    setError("");
    setFileNote(file.name);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/coverage-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brand, domain, topic, segment, market, coverageCsv: csv, turnstileToken }),
      });
      const json = (await res.json()) as { token?: string; message?: string };
      if (!res.ok || !json.token) {
        // The server's own sentence, which knows why it refused. A generic
        // "something went wrong" here would replace "you have used today's
        // free benchmarks" with nothing the reader can act on.
        setError(json.message ?? "We could not start that benchmark. Please try again.");
        return;
      }
      router.push(`/coverage-check/${json.token}`);
    } catch {
      setError("We could not reach the benchmark. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div style={MICRO}>The campaign</div>
      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <label htmlFor="cc-brand" style={labelStyle}>
            Brand name
          </label>
          <input
            id="cc-brand"
            style={field}
            placeholder="Your client"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="cc-domain" style={labelStyle}>
            Client domain
          </label>
          <input
            id="cc-domain"
            style={field}
            placeholder="clientdomain.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="cc-topic" style={labelStyle}>
            What the campaign is about
          </label>
          <input
            id="cc-topic"
            style={field}
            placeholder="same-day settlement"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
          />
          <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: T.soft, lineHeight: 1.5 }}>
            A capability or a claim, not a headline. &ldquo;Same-day settlement&rdquo;, not &ldquo;Brand announces
            exciting news&rdquo;.
          </p>
        </div>
        <div>
          <label htmlFor="cc-segment" style={labelStyle}>
            Who it is for <span style={{ fontWeight: 400, color: T.soft }}>optional</span>
          </label>
          <input
            id="cc-segment"
            style={field}
            placeholder="independent retailers"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
          />
          <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: T.soft, lineHeight: 1.5 }}>
            Sharpens the buying question. Without it we ask the broader form, which is a weaker question but still a
            real one.
          </p>
        </div>
        <div>
          <label htmlFor="cc-market" style={labelStyle}>
            Market
          </label>
          <select
            id="cc-market"
            style={field}
            value={market}
            onChange={(e) => setMarket(e.target.value === "US" ? "US" : "UK")}
          >
            <option value="UK">United Kingdom</option>
            <option value="US">United States</option>
          </select>
        </div>
        <div>
          <label htmlFor="cc-coverage" style={labelStyle}>
            Coverage <span style={{ fontWeight: 400, color: T.soft }}>optional</span>
          </label>
          <input id="cc-coverage" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={onFile} style={{ ...field, padding: "9px 11px" }} />
          <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: T.soft, lineHeight: 1.5 }}>
            {fileNote
              ? `${fileNote} - every source the engines cite is matched against it.`
              : "A CSV of the URLs you placed. Any column will do; we find the links."}
          </p>
        </div>
      </div>

      <Turnstile onToken={setTurnstileToken} />

      {error && (
        <p style={{ margin: "12px 0 0", fontSize: "13px", color: T.badFg, lineHeight: 1.55 }}>{error}</p>
      )}

      <button
        type="submit"
        className="btn-primary"
        disabled={busy}
        style={{
          width: "100%",
          marginTop: "14px",
          fontSize: "15px",
          fontWeight: 600,
          fontFamily: "inherit",
          color: "#ffffff",
          background: T.accent,
          border: "none",
          borderRadius: "10px",
          padding: "13px 20px",
          cursor: busy ? "default" : "pointer",
        }}
      >
        {busy ? "Starting the reading" : "Take the reading"}
      </button>
      <p style={{ margin: "10px 0 0", fontSize: "12.5px", color: T.soft, lineHeight: 1.55 }}>
        Free, and no email. The reading opens on its own link, which keeps working - so you can send it on or come
        back to it.
      </p>
    </form>
  );
}
