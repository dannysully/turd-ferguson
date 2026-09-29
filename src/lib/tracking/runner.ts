import "server-only";

import { enginesFor } from "@/config/pricing";
import { type TierKey } from "@/components/TierName";
import { extractBrands } from "@/lib/scan/anthropic";
import { brandKey, namesSubject, subjectKeys } from "@/lib/scan/brand-name";
import { readEngine, readKeywordPosition } from "@/lib/scan/dataforseo";
import { type Market } from "@/lib/scan/domain";
import { type Citation, type Engine, knownEngines } from "@/lib/scan/engines";
import { recordModelCallDebit } from "@/lib/scan/spend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { selectAll } from "@/lib/supabase/page";

import {
  RUN_SIGNATURE_HEADER,
  TRACKING_STALL_MS,
  liveOn,
  readTrackingSettings,
  refuseRun,
  runOutcome,
  shouldTrack,
  signRun,
  trackingDay,
} from "./decide.ts";

/**
 * The daily alwaystracked runner - T1 of
 * docs/tracked-dashboard-2026-09-29/BRIEF.md (Danny, 29 Sep 2026).
 *
 * `/api/cron/track` calls `dispatchTrackingRuns` once a day; each client's run
 * is handed to its own `/api/track/run` invocation, which calls
 * `runTrackingDay`. Every decision that can be made without a socket is in
 * `decide.ts`, where it is tested.
 *
 * The reads are the scan's own: `readEngine` for each question on each of the
 * tier's engines, `readKeywordPosition` for each keyword, `namesSubject` for
 * "named" (plus the client's brand aliases - one matcher, BRIEF decision 5)
 * and `extractBrands` for who else is named, batched per engine the way the
 * scan batches it rather than one call per answer.
 */

/** The scan pipeline's pool size, for the same reason: the tail sets the finish, not the burst. */
const CONCURRENCY = 28;

/** Against the 300s function ceiling, as the scan budgets itself. */
const RUN_BUDGET_MS = 270_000;

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return typeof status === "number" && (status === 429 || status >= 500);
}

function message(err: unknown): string {
  return err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300);
}

/** Today's tracking spend so far, across every client, off the run rows. */
async function trackingSpentOn(day: string): Promise<number> {
  const db = supabaseAdmin();
  const rows = await selectAll<{ dfs_cost: number | string | null }>((from, to) =>
    db.from("tracking_runs").select("dfs_cost").eq("run_date", day).order("id", { ascending: true }).range(from, to),
  );
  return rows.reduce((total, r) => total + Number(r.dfs_cost ?? 0), 0);
}

async function trackingSettings() {
  const { data, error } = await supabaseAdmin()
    .from("app_settings")
    .select("key, value")
    .in("key", ["tracking_enabled", "tracking_daily_cost_cap_usd"]);
  if (error) throw new Error(`could not read the tracking settings: ${error.message}`);
  return readTrackingSettings((data ?? []) as { key: string; value: unknown }[]);
}

/** Fire one run's invocation and do not wait for it. Also the admin "Run now" path (T2). */
export async function dispatchTrackingRun(runId: string, origin: string): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET is not set");
  const body = JSON.stringify({ runId });
  // The run route answers 202 at once and does the work after its response, in
  // its own invocation, so this await is a handshake, not the run. Awaited
  // because a fire-and-forget fetch can be frozen with this function before it
  // leaves. A dispatch that never lands leaves the row queued; "Run now" (T2)
  // posts it again.
  const res = await fetch(`${origin}/api/track/run`, {
    method: "POST",
    headers: { "content-type": "application/json", [RUN_SIGNATURE_HEADER]: signRun(body, secret) },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status !== 202) throw new Error(`the run route answered ${res.status} for run ${runId}`);
}

/**
 * Insert today's run row for every client that should be tracked, and hand
 * each one to its own invocation. Returns how many were dispatched.
 */
export async function dispatchTrackingRuns(origin: string, now: Date = new Date()): Promise<{
  day: string;
  dispatched: number;
  skipped: number;
  refused?: string;
}> {
  const db = supabaseAdmin();
  const day = trackingDay(now);

  const refusal = refuseRun(await trackingSettings(), await trackingSpentOn(day));
  if (refusal) return { day, dispatched: 0, skipped: 0, refused: refusal };

  const { data: clients, error: cErr } = await db
    .from("client_domains")
    .select("id, status, started_on, tier")
    .eq("status", "active");
  if (cErr) throw new Error(`could not read the tracked clients: ${cErr.message}`);

  const { data: questions, error: qErr } = await db
    .from("tracked_questions")
    .select("client_domain_id, added_on, stopped_on")
    .is("stopped_on", null);
  if (qErr) throw new Error(`could not read the tracked questions: ${qErr.message}`);

  const live = new Map<string, number>();
  for (const q of questions ?? []) {
    if (!liveOn(q as { added_on: string; stopped_on: string | null }, day)) continue;
    const id = q.client_domain_id as string;
    live.set(id, (live.get(id) ?? 0) + 1);
  }

  let dispatched = 0;
  let skipped = 0;
  for (const c of clients ?? []) {
    const client = {
      id: c.id as string,
      status: c.status as string | null,
      started_on: c.started_on as string | null,
      activeQuestions: live.get(c.id as string) ?? 0,
    };
    if (!shouldTrack(client, day)) {
      skipped += 1;
      continue;
    }
    // One row per client per day, unique; a second cron call inserts nothing.
    const { data: inserted, error: iErr } = await db
      .from("tracking_runs")
      .upsert(
        { client_domain_id: client.id, run_date: day, engines: [...enginesFor((c.tier as TierKey) ?? "tracked")] },
        { onConflict: "client_domain_id,run_date", ignoreDuplicates: true },
      )
      .select("id");
    if (iErr) {
      console.warn(`[track] could not open today's run for ${client.id}: ${iErr.message}`);
      continue;
    }
    const runId = inserted?.[0]?.id as string | undefined;
    if (!runId) continue;
    try {
      await dispatchTrackingRun(runId, origin);
      dispatched += 1;
    } catch (err) {
      console.warn(`[track] could not dispatch run ${runId}: ${message(err)}`);
    }
  }
  return { day, dispatched, skipped };
}

type AnswerRow = {
  question_id: string;
  engine: Engine;
  answered: boolean;
  named: boolean;
  response_text: string | null;
  citations: Citation[];
  cost: number;
  failed: boolean;
};

/**
 * One client's day: claim the run, read every live question on the tier's
 * engines and every live keyword, write the rows, close the run.
 *
 * Idempotent by the claim: only a `queued` row moves to `running`, so a run
 * already running or finished is skipped, however many times it is posted.
 */
export async function runTrackingDay(runId: string): Promise<{ status: string; skipped?: string }> {
  const db = supabaseAdmin();
  const started = Date.now();
  const remainingMs = () => RUN_BUDGET_MS - (Date.now() - started);

  const { data: claimed, error: claimErr } = await db
    .from("tracking_runs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("status", "queued")
    .select("id, client_domain_id, run_date, engines");
  if (claimErr) throw new Error(`could not claim run ${runId}: ${claimErr.message}`);
  const run = claimed?.[0];
  if (!run) return { status: "skipped", skipped: "not queued - already running or finished" };

  const spend = { dfs: 0, calls: 0 };
  let domainForDebit: string | undefined;

  const close = async (fields: Record<string, unknown>) => {
    const { error } = await db
      .from("tracking_runs")
      .update({
        ...fields,
        dfs_cost: Number(spend.dfs.toFixed(4)),
        model_calls: spend.calls,
        finished_at: new Date().toISOString(),
        step_ms: { total: Date.now() - started },
      })
      .eq("id", runId);
    if (error) console.warn(`[track] could not close run ${runId}: ${error.message}`);
    await recordModelCallDebit({ calls: spend.calls, reason: "tracking_run", domain: domainForDebit });
  };

  try {
    const refusal = refuseRun(await trackingSettings(), await trackingSpentOn(run.run_date as string));
    if (refusal) {
      await close({ status: "failed", error: refusal });
      return { status: "failed", skipped: refusal };
    }

    const { data: client, error: clErr } = await db
      .from("client_domains")
      .select("id, domain, brand_name, topic, market, brand_aliases")
      .eq("id", run.client_domain_id)
      .single();
    if (clErr) throw new Error(`could not read the client: ${clErr.message}`);
    const domain = client.domain as string;
    domainForDebit = domain;
    const brand = (client.brand_name as string | null) ?? domain;
    const aliases = ((client.brand_aliases as string[] | null) ?? []).filter(Boolean);
    const market = client.market as Market;
    const day = run.run_date as string;

    const [{ data: qs, error: qErr }, { data: ks, error: kErr }] = await Promise.all([
      db.from("tracked_questions").select("id, text, added_on, stopped_on").eq("client_domain_id", client.id),
      db.from("tracked_keywords").select("id, keyword, added_on, stopped_on").eq("client_domain_id", client.id),
    ]);
    if (qErr) throw new Error(`could not read the questions: ${qErr.message}`);
    if (kErr) throw new Error(`could not read the keywords: ${kErr.message}`);
    const questions = (qs ?? []).filter((q) => liveOn(q as { added_on: string; stopped_on: string | null }, day));
    const keywords = (ks ?? []).filter((k) => liveOn(k as { added_on: string; stopped_on: string | null }, day));

    const engines = knownEngines(run.engines as string[] | null);
    const names = (prose: string) =>
      namesSubject(prose, brand, domain) || aliases.some((a) => namesSubject(prose, a));

    const jobs = questions.flatMap((q) => engines.map((engine) => ({ q, engine })));
    const answers = await mapWithConcurrency(jobs, CONCURRENCY, async ({ q, engine }): Promise<AnswerRow> => {
      const base = { question_id: q.id as string, engine, citations: [] as Citation[] };
      for (let attempt = 0; attempt < 2; attempt++) {
        if (remainingMs() < 5000) break;
        try {
          const read = await readEngine(engine, q.text as string, market, remainingMs());
          spend.dfs += read.cost;
          return {
            ...base,
            answered: read.answered,
            named: read.answered && names(read.prose),
            response_text: read.prose || null,
            citations: read.citations,
            cost: read.cost,
            failed: false,
          };
        } catch (err) {
          if (attempt === 0 && isRetryable(err)) continue;
          console.warn(`[track] ${runId} ${engine} read failed: ${message(err)}`);
          break;
        }
      }
      return { ...base, answered: false, named: false, response_text: null, cost: 0, failed: true };
    });

    const serp = await mapWithConcurrency(keywords, CONCURRENCY, async (k) => {
      if (remainingMs() < 5000) return { k, failed: true, rank: null, url: null, cost: 0 };
      try {
        const read = await readKeywordPosition(k.keyword as string, domain, market, remainingMs());
        spend.dfs += read.cost;
        return { k, failed: false, rank: read.rank ?? null, url: read.url, cost: read.cost };
      } catch (err) {
        console.warn(`[track] ${runId} keyword read failed: ${message(err)}`);
        return { k, failed: true, rank: null, url: null, cost: 0 };
      }
    });

    // Who else is named: one extraction per engine over that engine's answers,
    // as the scan does it, then attributed back to each answer with the same
    // matcher that decides "named". Never fatal - the reads are already paid for.
    const subject = subjectKeys(brand, domain);
    const others = new Map<Engine, string[]>();
    await Promise.all(
      engines.map(async (engine) => {
        const blocks = answers.filter((a) => a.engine === engine && a.answered && a.response_text).map((a) => a.response_text!);
        if (!blocks.length) return;
        try {
          const out = await extractBrands(blocks, { topic: (client.topic as string | null) ?? "", brand });
          spend.calls += out.calls;
          const seen = new Map<string, string>();
          for (const b of out.brands) {
            const key = brandKey(b.brand.trim());
            if (key && !subject.has(key) && !seen.has(key)) seen.set(key, b.brand.trim());
          }
          others.set(engine, [...seen.values()]);
        } catch (err) {
          console.warn(`[track] ${runId} ${engine} brand extraction failed: ${message(err)}`);
        }
      }),
    );

    const answerRows = answers.map((a) => ({
      run_id: runId,
      client_domain_id: client.id,
      run_date: day,
      question_id: a.question_id,
      engine: a.engine,
      answered: a.answered,
      named: a.named,
      response_text: a.response_text,
      brands: a.response_text ? (others.get(a.engine) ?? []).filter((n) => namesSubject(a.response_text!, n)) : [],
      citations: a.citations,
      cost: Number(a.cost.toFixed(4)),
    }));
    if (answerRows.length) {
      const { error } = await db.from("tracking_answers").upsert(answerRows, { onConflict: "run_id,question_id,engine" });
      if (error) throw new Error(`could not store the answers: ${error.message}`);
    }

    const serpRows = serp
      .filter((s) => !s.failed)
      .map((s) => ({
        run_id: runId,
        client_domain_id: client.id,
        run_date: day,
        keyword_id: s.k.id,
        position: s.rank,
        url: s.url,
        cost: Number(s.cost.toFixed(4)),
      }));
    if (serpRows.length) {
      const { error } = await db.from("tracking_serp").upsert(serpRows, { onConflict: "run_id,keyword_id" });
      if (error) throw new Error(`could not store the keyword positions: ${error.message}`);
    }

    const reads = answers.length + serp.length;
    const failed = answers.filter((a) => a.failed).length + serp.filter((s) => s.failed).length;
    const status = runOutcome(reads, failed);
    await close({ status, error: failed ? `${failed} of ${reads} reads failed` : null });
    return { status };
  } catch (err) {
    await close({ status: "failed", error: message(err) });
    throw err;
  }
}

/**
 * Close tracking runs the platform killed: `running` for longer than
 * TRACKING_STALL_MS, marked failed. Called from the stall reaper's cron.
 * Compare-and-swap on status, and `.select("id")` so a reap that did nothing
 * is distinguishable from one that closed a run.
 */
export async function reapStalledTrackingRuns(now: number = Date.now()): Promise<{ ids: string[] }> {
  const cutoff = new Date(now - TRACKING_STALL_MS).toISOString();
  const { data, error } = await supabaseAdmin()
    .from("tracking_runs")
    .update({ status: "failed", error: "the run was stopped before it could record a result, and was closed by the stall sweep", finished_at: new Date(now).toISOString() })
    .eq("status", "running")
    .lt("started_at", cutoff)
    .select("id");
  if (error) throw new Error(`could not close stalled tracking runs: ${error.message}`);
  return { ids: (data ?? []).map((r) => r.id as string) };
}
