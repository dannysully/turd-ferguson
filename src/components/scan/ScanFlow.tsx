"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MICRO, SHELL, T } from "@/config/tokens";
import type {
  EngineAnswer,
  EngineBreakdown,
  Market,
  RunScanResponse,
  ScanOpportunity,
  ScanQuestion,
} from "@/lib/scan";
import { ENGINE_SPECS, isEngine } from "@/lib/scan/engines";

import ConfirmScreen from "./ConfirmScreen";
import HeroSequence from "./HeroSequence";
import ResultView from "./ResultView";
import { btn, field, label } from "./screens";

/**
 * The scan, on its own page, from confirm to report.
 *
 * Four screens rather than one panel that changes, which is what the flow
 * boards describe: a confirm step wide enough to show fourteen questions, the
 * run, the free result, and the report an address unlocks. The token is in the
 * URL, so a reload, a second device or the link in the email all land on the
 * same scan rather than an empty form.
 *
 * The gated half is genuinely absent, not hidden: until the address is given
 * the browser holds the teaser only, and the unlock response is the first time
 * the leaderboard and the full source list cross the wire.
 */

type Phase = "confirm" | "running" | "result";

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
  top_sources:
    | {
        source: string;
        mentions: number;
        ai_search_volume: number | null;
        is_own_domain: boolean;
        kind?: string | null;
        note?: string | null;
      }[]
    | null;
  total_sources: number;
  /** The questions asked, with tallies. Free - see Prompts in ResultDashboard. */
  questions: ScanQuestion[] | null;
};

type FullPayload = {
  brands: { brand: string; mentions: number; is_subject: boolean }[];
  sources: { source: string; mentions: number; ai_search_volume: number | null; urls: string[]; kind?: string | null; note?: string | null }[];
  /** Per-question engine detail, including what each one actually said. */
  questions?: { idx: number; engines: EngineAnswer[] }[];
  /** The gated finding: pages feeding answers the brand is absent from. */
  opportunities?: ScanOpportunity[];
  gated_engines?: string[];
  gated_status?: string;
};

function engineLabels(keys: string[]): string {
  const names = keys.filter(isEngine).map((k) => ENGINE_SPECS[k].label);
  if (names.length <= 1) return names[0] ?? "";
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
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
/**
 * When to admit this is running long. It has to sit above a normal finish or
 * it cries wolf on every scan - at 45s it fired about a minute before the
 * average run completed, which taught people the message means nothing.
 */
const SLOW_MS = 150_000;

function track(event: string, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event, ...props });
}

/**
 * The unlock payload, as the screens need it.
 *
 * Written once because it was written three times and one of them was wrong:
 * every reader picked brands, sources and questions off the response and left
 * `opportunities` behind, which is the one thing the email address buys. The
 * table that renders it has shipped since 9d54925 and has never had a row in
 * it, because nothing ever put the rows into state.
 */
function asFull(data: {
  brands?: FullPayload["brands"];
  sources?: FullPayload["sources"];
  questions?: FullPayload["questions"];
  opportunities?: ScanOpportunity[];
}): FullPayload {
  return {
    brands: data.brands ?? [],
    sources: data.sources ?? [],
    questions: data.questions ?? [],
    opportunities: data.opportunities ?? [],
  };
}

/** Teaser plus whatever has been unlocked, in the shape the screens render. */
function toResult(t: Teaser, domain: string, full: FullPayload | null): RunScanResponse {
  const top = t.top_sources?.[0];
  const subject = full?.brands.find((b) => b.is_subject);
  const totalMentions = full?.brands.reduce((a, b) => a + b.mentions, 0) ?? 0;
  const silent = t.of > 0 && (t.by_engine ?? []).every((e) => e.answered === 0);

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
      kind: s.kind ?? null,
      note: s.note ?? null,
    })),
    history: [],
    questions: (t.questions ?? []).map((q) => {
      const detail = full?.questions?.find((d) => d.idx === q.idx);
      return detail ? { ...q, answers: detail.engines } : q;
    }),
    opportunities: full?.opportunities ?? undefined,
    gated: !full,
    // Every engine answering nothing is a real finding, not an error.
    empty: silent,
    reason: silent ? "None of the engines produced an answer for these questions yet." : null,
  };
}

/**
 * What stands in for the report while an address is being proven.
 *
 * It names the address, because the commonest failure is a typo nobody can see
 * once the form has gone, and it offers a resend, because with verification in
 * front of the result a message that does not arrive is the whole visit lost.
 */
function VerifyPending(p: { email: string; note: string; busy: boolean; onResend: () => void }) {
  return (
    <div>
      <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: T.ink, margin: "0 0 0.5rem" }}>Check your inbox</p>
      <p style={{ fontSize: "0.875rem", color: T.soft, margin: "0 0 1rem", lineHeight: 1.6 }}>
        The full report is one click away. We have sent a link to <strong style={{ color: T.ink }}>{p.email}</strong> -
        opening it unlocks the leaderboard and every source, on this device or any other.
      </p>
      <p style={{ fontSize: "0.8125rem", color: T.soft, margin: "0 0 0.75rem", lineHeight: 1.6 }}>
        Nothing yet? It can take a minute, and it is worth a look in spam.
      </p>
      <button
        type="button"
        onClick={p.onResend}
        disabled={p.busy}
        style={{
          fontSize: "0.875rem",
          fontWeight: 600,
          color: T.accent,
          background: "transparent",
          border: "1px solid " + T.line,
          borderRadius: 8,
          padding: "0.5rem 0.9rem",
          cursor: p.busy ? "default" : "pointer",
          opacity: p.busy ? 0.6 : 1,
        }}
      >
        {p.busy ? "Sending" : "Send it again"}
      </button>
      {p.note ? (
        <p aria-live="polite" style={{ fontSize: "0.8125rem", color: T.soft, margin: "0.75rem 0 0" }}>
          {p.note}
        </p>
      ) : null}
    </div>
  );
}

export default function ScanFlow(p: {
  token: string;
  domain: string;
  brand: string | null;
  positioning: string | null;
  topic: string;
  market: Market;
  variants: string[];
  /** The scan status as the server read it, which decides where we open. */
  status: string;
  /** The engines this scan reads, frozen onto the row at start. */
  engines: string[];
  gatedEngines: string[];
  /** The result, read on the server for a scan that has already finished. */
  initialTeaser?: Teaser | null;
  /** The unlocked half, read on the server for a scan that has been unlocked. */
  initialFull?: {
    brands?: FullPayload["brands"];
    sources?: FullPayload["sources"];
    questions?: FullPayload["questions"];
    opportunities?: ScanOpportunity[];
  } | null;
}) {
  const [phase, setPhase] = useState<Phase>(
    p.status === "complete" ? "result" : p.status === "queued" || p.status === "running" ? "running" : "confirm",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [progress, setProgress] = useState(0);
  const [slow, setSlow] = useState(false);

  const [teaser, setTeaser] = useState<Teaser | null>(p.initialTeaser ?? null);
  const [full, setFull] = useState<FullPayload | null>(p.initialFull ? asFull(p.initialFull) : null);
  const [gatedEngines, setGatedEngines] = useState<string[]>(p.gatedEngines);
  const [gatedStatus, setGatedStatus] = useState<string>("none");
  /**
   * How many placement opportunities are waiting behind the gate. Fetched on
   * its own, from a route that returns counts and nothing else, so a locked
   * screen can say what it is holding without the domains ever reaching it.
   */
  const [oppCount, setOppCount] = useState<number | null>(null);

  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState("");
  /** Set once an address has been given but not yet proven. */
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState("");

  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [phase]);

  const loadTeaser = useCallback(async (): Promise<Teaser> => {
    const res = await fetch("/api/scan/" + p.token, { cache: "no-store" });
    if (!res.ok) throw new Error("could not load the result");
    return (await res.json()) as Teaser;
  }, [p.token]);

  // ---- arriving at a finished scan ----
  // The teaser always loads. The full payload only exists once this scan has
  // been unlocked, and a 403 there is the ordinary case rather than a failure:
  // it means the visitor gets the gate, which is correct.
  useEffect(() => {
    if (phase !== "result" || teaser) return;
    let stop = false;

    (async () => {
      try {
        const t = await loadTeaser();
        if (stop) return;
        setTeaser(t);
      } catch {
        if (!stop) setError("We could not load that result.");
        return;
      }

      try {
        const res = await fetch("/api/scan/" + p.token + "/full", { cache: "no-store" });
        if (!res.ok || stop) return;
        const data = await res.json();
        setFull(asFull(data));
        setGatedEngines(data.gated_engines ?? p.gatedEngines);
        setGatedStatus(data.gated_status ?? "none");
      } catch {
        // No full payload is the gated state, which renders fine.
      }
    })();

    return () => {
      stop = true;
    };
  }, [phase, teaser, loadTeaser, p.token, p.gatedEngines]);

  // ---- the run: poll the real status, never a fake timer ----
  useEffect(() => {
    if (phase !== "running") return;
    let stop = false;

    const slowTimer = setTimeout(() => setSlow(true), SLOW_MS);

    async function poll() {
      if (stop) return;
      try {
        const res = await fetch("/api/scan/" + p.token + "/status", { cache: "no-store" });
        const data = await res.json();

        if (data.step && data.step in STEP_INDEX) setProgress(STEP_INDEX[data.step]);

        if (data.status === "complete") {
          setProgress(3);
          setTeaser(await loadTeaser());
          setPhase("result");
          track("scan_completed", { cached: false });
          return;
        }
        if (data.status === "failed") {
          setError(data.error ?? "We could not finish that check.");
          setPhase("confirm");
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
  }, [phase, p.token, loadTeaser]);

  // ---- what the gate is holding: the count, never the rows ----
  useEffect(() => {
    if (phase !== "result" || full || oppCount !== null) return;
    let stop = false;
    (async () => {
      try {
        const res = await fetch("/api/scan/" + p.token + "/opportunities", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number; ready?: boolean };
        if (!stop && data.ready) setOppCount(data.count ?? 0);
      } catch {
        // The gate reads fine without a number. Falling back to the generic
        // copy is better than blocking the screen on a count.
      }
    })();
    return () => {
      stop = true;
    };
  }, [p.token, phase, full, oppCount]);

  // ---- after unlock: the engines the email bought are still running ----
  useEffect(() => {
    if (!full) return;
    if (gatedStatus !== "queued" && gatedStatus !== "running") return;
    let stop = false;

    async function poll() {
      if (stop) return;
      try {
        const res = await fetch("/api/scan/" + p.token + "/status", { cache: "no-store" });
        const data = await res.json();
        setGatedStatus(data.gated_status ?? "none");

        if (data.gated_status === "complete") {
          // Re-read the teaser so the per-engine breakdown now includes them.
          setTeaser(await loadTeaser());
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
  }, [p.token, full, gatedStatus, loadTeaser]);

  // ---- step 1: the confirmed category, market and question set ----
  async function onRun(input: {
    topic: string;
    market: Market;
    questions: { question: string; kind: string }[];
  }): Promise<string | null> {
    setBusy(true);
    setError("");
    try {
      const headers = new Headers();
      headers.set("content-type", "application/json");
      const res = await fetch("/api/scan/" + p.token + "/confirm", {
        method: "POST",
        headers,
        body: JSON.stringify({
          topic: input.topic,
          market: input.market,
          topic_variants: p.variants,
          questions: input.questions,
        }),
      });
      const data = await res.json();
      if (!res.ok) return data.message ?? "We could not start that check.";

      if (data.status === "complete") {
        setPhase("result");
        return null;
      }
      setProgress(0);
      setSlow(false);
      setPhase("running");
      track("scan_confirmed", { topic: input.topic, market: input.market, questions: input.questions.length });
      return null;
    } catch {
      return "We could not reach the checker. Please try again.";
    } finally {
      setBusy(false);
    }
  }

  // ---- the gate ----
  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailErr("");
    setBusy(true);

    try {
      const headers = new Headers();
      headers.set("content-type", "application/json");
      const res = await fetch("/api/scan/" + p.token + "/unlock", {
        method: "POST",
        headers,
        body: JSON.stringify({ email, marketing_ok: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailErr(data.message ?? "We could not unlock that just now.");
        return;
      }
      // Verification on: the address is recorded but nothing opens until the
      // link in the email is clicked.
      if (data.verification_sent) {
        setPendingEmail(data.email ?? email);
        track("scan_verification_sent", {});
        return;
      }

      setFull(asFull(data));
      setGatedEngines(data.gated_engines ?? gatedEngines);
      setGatedStatus(data.gated_status ?? "none");
      track("scan_unlocked", {});
    } catch {
      setEmailErr("We could not reach the checker. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setBusy(true);
    setResendNote("");
    try {
      const res = await fetch("/api/scan/" + p.token + "/resend", { method: "POST" });
      const data = await res.json();
      setResendNote(
        res.ok
          ? (data.message ?? "Sent. It should land in a moment.")
          : (data.message ?? "That did not go through. Try again shortly."),
      );
    } catch {
      setResendNote("We could not reach the checker. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  const result = teaser ? toResult(teaser, p.domain, full) : null;
  const sourceCount = teaser?.total_sources ?? 0;
  const engineNames = engineLabels(gatedEngines);

  const stepLabel =
    phase === "confirm"
      ? "Step 1 of 3 - confirm"
      : phase === "running"
        ? "Step 2 of 3 - running"
        : full
          ? "Step 3 of 3 - report"
          : "Step 2 of 3 - result";

  const gateHeading = oppCount
    ? oppCount + (oppCount === 1 ? " page" : " pages") + " you could be placed into"
    : gatedEngines.length
      ? "Unlock the full report, plus " + engineNames
      : "See who is winning, and where to get placed";

  /* The count leads when we have it: a gate that names what is behind it is
     worth crossing, and a blurred table with no number is just a blurred
     table. What it must not say is that these pages cite a competitor - the
     derivation does not establish that, however well it would sell. */
  const gateBody = oppCount
    ? (oppCount === 1 ? "One page is" : oppCount + " pages are") +
      " already feeding the answers you are missing from, and " +
      (oppCount === 1 ? "it is" : "they are") +
      " somewhere an article can run. Ranked by how many answers a placement would put you into, with the" +
      " questions behind each one - plus the full leaderboard and all " +
      sourceCount +
      " sources cited for " +
      (result?.topic ?? "this category") +
      (gatedEngines.length ? ", and the same questions put through " + engineNames : "") +
      "."
    : gatedEngines.length
      ? "We will run the same " +
        (result?.brand.of ?? 14) +
        " questions through " +
        engineNames +
        " as well, then show you the full leaderboard and all " +
        sourceCount +
        " sources cited for " +
        (result?.topic ?? "this category") +
        "."
      : "The full leaderboard - " +
        (result?.brand.of_brands ? "all " + result.brand.of_brands + " brands" : "every brand") +
        " these engines name for " +
        (result?.topic ?? "this category") +
        ", ranked - and all " +
        sourceCount +
        " sources they cite. The source list is the useful half: those are the pages already being read back to" +
        " your buyers, and the ones worth being on.";

  return (
    <div>
      <div style={{ borderBottom: "1px solid " + T.line }}>
        <div style={{ ...SHELL, padding: "14px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={MICRO}>{p.brand ?? p.domain}</span>
          <div style={{ flexGrow: 1 }} />
          <span style={MICRO}>{stepLabel}</span>
        </div>
      </div>

      <div style={{ ...SHELL, padding: "40px 24px 0" }}>
        <p aria-live="polite" className="sr-only">
          {phase === "running" ? "Checking. This usually takes about a minute." : ""}
        </p>

        {phase === "confirm" ? (
          <ConfirmScreen
            token={p.token}
            domain={p.domain}
            brand={p.brand}
            positioning={p.positioning}
            initialTopic={p.topic}
            initialMarket={p.market}
            variants={p.variants}
            onRun={onRun}
            running={busy}
          />
        ) : null}

        {phase === "confirm" && error ? (
          <p role="alert" style={{ fontSize: "13px", color: T.badFg, marginTop: "16px" }}>
            {error}
          </p>
        ) : null}

        {phase === "running" ? (
          <HeroSequence
            domain={p.domain}
            engines={p.engines}
            step={progress}
            slow={slow}
            headingRef={headingRef}
          />
        ) : null}

        {phase === "result" && result && full && gatedEngines.length > 0 ? (
          <p
            style={{
              fontSize: "0.8125rem",
              color: gatedStatus === "failed" ? T.badFg : T.soft,
              background: gatedStatus === "failed" ? "transparent" : T.wash,
              border: "1px solid " + (gatedStatus === "failed" ? T.line : T.washLine),
              borderRadius: 12,
              padding: "0.75rem 1rem",
              margin: "0 0 1rem",
              lineHeight: 1.6,
            }}
          >
            {gatedStatus === "queued" || gatedStatus === "running"
              ? "Now running the same questions through " +
                engineNames +
                ". This takes another minute or two, and the results appear here."
              : gatedStatus === "complete"
                ? engineNames + " are included below."
                : "We could not reach " + engineNames + " this time. Everything above is unaffected."}
          </p>
        ) : null}

        {phase === "result" && result ? (
          <ResultView
            r={result}
            domain={p.domain}
            totalSources={sourceCount}
            unlocked={Boolean(full)}
            gate={
              pendingEmail ? (
                <VerifyPending email={pendingEmail} note={resendNote} busy={busy} onResend={onResend} />
              ) : (
                <form onSubmit={onEmail} noValidate>
                  <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: T.ink, margin: "0 0 0.5rem" }}>
                    {gateHeading}
                  </p>
                  <p style={{ fontSize: "0.875rem", color: T.soft, margin: "0 0 1rem", lineHeight: 1.6 }}>
                    {gateBody}
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
                  {emailErr ? (
                    <p style={{ fontSize: "0.8125rem", color: T.badFg, marginTop: "0.5rem" }}>{emailErr}</p>
                  ) : null}
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ ...btn, width: "100%", marginTop: "0.875rem" }}
                    disabled={busy}
                  >
                    {busy ? "Unlocking" : "Send me the full report"}
                  </button>
                  <p style={{ fontSize: "0.75rem", color: T.faint, marginTop: "0.75rem", lineHeight: 1.5 }}>
                    One scan, no charge. Ongoing tracking comes with a plan.
                  </p>
                </form>
              )
            }
          />
        ) : null}

        {phase === "result" && !result && error ? (
          <p role="alert" style={{ fontSize: "13px", color: T.badFg }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
