"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { EngineBreakdown, Market, RunScanResponse } from "@/lib/scan";
import { ENGINE_SPECS, isEngine } from "@/lib/scan/engines";

import { C, DomainScreen, ResultScreen, RunningScreen, TopicScreen, btn, field, label } from "./screens";
import Turnstile from "./Turnstile";

/**
 * The live funnel: domain -> topic -> running -> free result -> email gate.
 *
 * The gated result is genuinely absent, not hidden. Until the email is given
 * the browser holds the teaser only: no leaderboard, no full source list. The
 * unlock response is the first time that data crosses the wire.
 */

type Phase = "domain" | "topic" | "running" | "result";

type ByEngine = { engine: string; asked: number; answered: number; named: number };

type Teaser = {
  brand: string | null;
  topic: string | null;
  market: Market | null;
  status: string;
  step: string | null;
  read_at: string | null;
  named: number;
  of: number;
  engines: string[] | null;
  engines_answered: string[] | null;
  by_engine: ByEngine[] | null;
  rank: number | null;
  brand_count: number;
  top_sources: { source: string; mentions: number; ai_search_volume: number | null; is_own_domain: boolean }[] | null;
  total_sources: number;
};

type FullPayload = {
  brands: { brand: string; mentions: number; is_subject: boolean }[];
  sources: { source: string; mentions: number; ai_search_volume: number | null; urls: string[] }[];
  gated_engines?: string[];
  gated_status?: string;
};

function engineLabels(keys: string[]): string {
  const names = keys.filter(isEngine).map((k) => ENGINE_SPECS[k].label);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function toBreakdown(rows: ByEngine[] | null): EngineBreakdown[] {
  return (rows ?? [])
    .filter((r) => isEngine(r.engine))
    .map((r) => ({
      engine: r.engine,
      label: ENGINE_SPECS[r.engine as keyof typeof ENGINE_SPECS].label,
      kind: ENGINE_SPECS[r.engine as keyof typeof ENGINE_SPECS].kind,
      asked: r.asked,
      answered: r.answered,
      named: r.named,
    }));
}

const STEP_INDEX: Record<string, number> = { questions: 0, reading: 1, sources: 2 };
const POLL_MS = 2500;
const SLOW_MS = 45_000;

function track(event: string, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event, ...props });
}

/** Teaser plus whatever has been unlocked, in the shape the screens render. */
function toResult(t: Teaser, domain: string, full: FullPayload | null): RunScanResponse {
  const top = t.top_sources?.[0];
  const subject = full?.brands.find((b) => b.is_subject);
  const totalMentions = full?.brands.reduce((a, b) => a + b.mentions, 0) ?? 0;

  return {
    scan_id: "",
    platform: "google",
    read_at: (t.read_at ?? new Date().toISOString()).slice(0, 10),
    topic: t.topic ?? "",
    market: t.market ?? "UK",
    brand: {
      name: t.brand ?? domain,
      named_in: t.named,
      of: t.of,
      rank: t.rank,
      of_brands: t.brand_count || null,
      // Share of voice needs the whole leaderboard, so it stays blank until unlock.
      share_of_voice:
        subject && totalMentions > 0 ? Math.round((subject.mentions / totalMentions) * 100) : null,
    },
    engines: toBreakdown(t.by_engine),
    top_source: top ? { domain: top.source, brand_present: top.is_own_domain } : null,
    leaderboard:
      full?.brands.map((b) => ({ brand: b.brand, mentions: b.mentions, ai_search_volume: null })) ?? [],
    sources: (full?.sources ?? t.top_sources ?? []).map((s) => ({
      domain: s.source,
      mentions: s.mentions,
      ai_search_volume: s.ai_search_volume,
    })),
    history: [],
    gated: !full,
    // Every engine answering nothing is a real finding, not an error.
    empty: t.of > 0 && (t.by_engine ?? []).every((e) => e.answered === 0),
    reason:
      t.of > 0 && (t.by_engine ?? []).every((e) => e.answered === 0)
        ? "None of the engines produced an answer for these questions yet."
        : null,
  };
}

export default function LiveScanChecker({ compact = false }: { compact?: boolean }) {
  const [phase, setPhase] = useState<Phase>("domain");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const [domain, setDomain] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [topic, setTopic] = useState("");
  const [topicUnknown, setTopicUnknown] = useState(false);
  const [market, setMarket] = useState<Market>("UK");

  const [progress, setProgress] = useState(0);
  const [slow, setSlow] = useState(false);

  const [teaser, setTeaser] = useState<Teaser | null>(null);
  const [full, setFull] = useState<FullPayload | null>(null);
  const [gatedEngines, setGatedEngines] = useState<string[]>([]);
  const [gatedStatus, setGatedStatus] = useState<string>("none");

  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState("");

  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [phase]);

  const loadTeaser = useCallback(async (t: string) => {
    const res = await fetch(`/api/scan/${t}`, { cache: "no-store" });
    if (!res.ok) throw new Error("could not load the result");
    return (await res.json()) as Teaser;
  }, []);

  // ---- step 01 ----
  async function onDomain(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    track("scan_started", { domain });

    try {
      const res = await fetch("/api/scan/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain, market, turnstileToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
        return;
      }

      setToken(data.token);
      setBrandName(data.brand_name ?? "");
      setGatedEngines(data.gated_engines ?? []);

      // A cached complete scan skips straight to the result.
      if (data.status === "complete") {
        setTeaser(await loadTeaser(data.token));
        setPhase("result");
        track("scan_completed", { cached: true });
        return;
      }

      setTopic(data.suggested_topic ?? "");
      setTopicUnknown(!data.suggested_topic);
      setPhase("topic");
    } catch {
      setError("We could not reach the checker. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // ---- step 02 ----
  async function onTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setBusy(true);

    try {
      const res = await fetch(`/api/scan/${token}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, market }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "We could not start that check.");
        return;
      }
      setProgress(0);
      setSlow(false);
      setPhase("running");
      track("scan_confirmed", { topic, market });
    } catch {
      setError("We could not reach the checker. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // ---- step 03: poll the real status, never a fake timer ----
  useEffect(() => {
    if (phase !== "running" || !token) return;
    let stop = false;

    const slowTimer = setTimeout(() => setSlow(true), SLOW_MS);

    async function poll() {
      if (stop) return;
      try {
        const res = await fetch(`/api/scan/${token}/status`, { cache: "no-store" });
        const data = await res.json();

        if (data.step && data.step in STEP_INDEX) setProgress(STEP_INDEX[data.step]);

        if (data.status === "complete") {
          setProgress(3);
          setTeaser(await loadTeaser(token!));
          setPhase("result");
          track("scan_completed", { cached: false });
          return;
        }
        if (data.status === "failed") {
          setError(data.error ?? "We could not finish that check.");
          setPhase("domain");
          return;
        }
      } catch {
        // A dropped poll is not a failed scan. Try again on the next tick.
      }
      if (!stop) setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      stop = true;
      clearTimeout(slowTimer);
    };
  }, [phase, token, loadTeaser]);

  // ---- after unlock: the engines the email bought are still running ----
  useEffect(() => {
    if (!token || !full) return;
    if (gatedStatus !== "queued" && gatedStatus !== "running") return;
    let stop = false;

    async function poll() {
      if (stop) return;
      try {
        const res = await fetch(`/api/scan/${token}/status`, { cache: "no-store" });
        const data = await res.json();
        setGatedStatus(data.gated_status ?? "none");

        if (data.gated_status === "complete") {
          // Re-read the teaser so the per-engine breakdown now includes them.
          setTeaser(await loadTeaser(token!));
          return;
        }
        if (data.gated_status === "failed") return;
      } catch {
        // A dropped poll is not a failure. Try again on the next tick.
      }
      if (!stop) setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      stop = true;
    };
  }, [token, full, gatedStatus, loadTeaser]);

  // ---- step 05 ----
  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setEmailErr("");
    setBusy(true);

    try {
      const res = await fetch(`/api/scan/${token}/unlock`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, marketing_ok: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailErr(data.message ?? "We could not unlock that just now.");
        return;
      }
      setFull({ brands: data.brands ?? [], sources: data.sources ?? [] });
      setGatedEngines(data.gated_engines ?? gatedEngines);
      setGatedStatus(data.gated_status ?? "none");
      track("scan_unlocked", {});
    } catch {
      setEmailErr("We could not reach the checker. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const result = teaser ? toResult(teaser, domain, full) : null;

  return (
    <div style={{ minHeight: compact ? undefined : "320px" }}>
      <p aria-live="polite" className="sr-only">
        {phase === "running" ? "Checking, this takes about a minute." : ""}
      </p>

      {phase === "domain" && (
        <>
          <DomainScreen
            value={domain}
            onChange={setDomain}
            onSubmit={onDomain}
            error={error}
            busy={busy}
            exampleLink={!compact}
          />
          <Turnstile onToken={setTurnstileToken} />
        </>
      )}

      {phase === "topic" && (
        <>
          {topicUnknown && (
            <p style={{ fontSize: "0.875rem", color: C.body, margin: "0 0 0.875rem", lineHeight: 1.6 }}>
              The site did not make the category obvious, so we have left this blank rather than guess.
              Tell us how a buyer would describe what they sell.
            </p>
          )}
          <TopicScreen
            brand={brandName || domain}
            topic={topic}
            onTopic={setTopic}
            market={market}
            onMarket={setMarket}
            onSubmit={onTopic}
            onBack={() => {
              setPhase("domain");
              setError("");
            }}
            headingRef={headingRef}
          />
          {error && <p style={{ fontSize: "0.8125rem", color: C.red, marginTop: "0.75rem" }}>{error}</p>}
        </>
      )}

      {phase === "running" && (
        <RunningScreen brandLabel={brandName || domain} progress={progress} slow={slow} headingRef={headingRef} />
      )}

      {phase === "result" && result && full && gatedEngines.length > 0 && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: gatedStatus === "failed" ? C.red : C.body,
            background: gatedStatus === "failed" ? "transparent" : "rgba(124,58,237,0.06)",
            border: `1px solid ${gatedStatus === "failed" ? C.border : "rgba(124,58,237,0.2)"}`,
            borderRadius: 12,
            padding: "0.75rem 1rem",
            margin: "0 0 1rem",
            lineHeight: 1.6,
          }}
        >
          {gatedStatus === "queued" || gatedStatus === "running"
            ? `Now running the same questions through ${engineLabels(gatedEngines)}. This takes another minute or two, and the results appear here.`
            : gatedStatus === "complete"
              ? `${engineLabels(gatedEngines)} are included below.`
              : `We could not reach ${engineLabels(gatedEngines)} this time. Everything above is unaffected.`}
        </p>
      )}

      {phase === "result" && result && (
        <ResultScreen
          result={result}
          gated={!full}
          compact={compact}
          headingRef={headingRef}
          gate={
            <form onSubmit={onEmail} noValidate>
              <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: C.navy, margin: "0 0 0.5rem" }}>
                {gatedEngines.length
                  ? `Add ${engineLabels(gatedEngines)}, and see every source`
                  : "See the full leaderboard and every source"}
              </p>
              <p style={{ fontSize: "0.875rem", color: C.body, margin: "0 0 1rem", lineHeight: 1.6 }}>
                {gatedEngines.length ? (
                  <>
                    We will run the same {result.brand.of ?? 14} questions through{" "}
                    {engineLabels(gatedEngines)} as well, then show you the full leaderboard and all{" "}
                    {teaser?.total_sources ?? 0} sources cited for {result.topic}.
                  </>
                ) : (
                  <>
                    {result.brand.of_brands ?? "All"} brands the engines mention, and all{" "}
                    {teaser?.total_sources ?? 0} sources they cite for {result.topic}.
                  </>
                )}
              </p>
              <label htmlFor="scan-email" style={label}>
                Work email
              </label>
              <input
                id="scan-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={field}
                aria-invalid={Boolean(emailErr)}
              />
              {emailErr && <p style={{ fontSize: "0.8125rem", color: C.red, marginTop: "0.5rem" }}>{emailErr}</p>}
              <button
                type="submit"
                className="btn-primary"
                style={{ ...btn, width: "100%", marginTop: "0.875rem" }}
                disabled={busy}
              >
                {busy ? "Unlocking" : "Show me the rest"}
              </button>
              <p style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.75rem", lineHeight: 1.5 }}>
                One scan, no charge. Ongoing tracking is a paid plan.
              </p>
            </form>
          }
        />
      )}
    </div>
  );
}
