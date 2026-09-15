import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { describeAnthropicError, extractBrands, generateQuestions, QUESTION_COUNT } from "./anthropic";
import { readEngine, readSearchVolumes } from "./dataforseo";
import type { Market } from "./domain";
import { type Engine, isEngine, namesBrand } from "./engines";

/** Whole-run ceiling. Past this the scan is marked failed rather than left hanging. */
const RUN_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * How many engine reads run at once. Each read is one billed call and some
 * engines document execution times up to 120 seconds, so this is the knob that
 * decides whether a five-engine scan finishes inside the run timeout.
 */
const CONCURRENCY = 10;

export type ScanRow = {
  id: string;
  domain: string;
  brand_name: string | null;
  positioning: string | null;
  topic: string | null;
  market: Market | null;
  engines: string[] | null;
  gated_engines: string[] | null;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return typeof status === "number" && status >= 500;
}

type Answer = {
  questionId: string;
  question: string;
  engine: Engine;
  answered: boolean;
  brandNamed: boolean;
  prose: string;
  citations: { source_domain: string; url: string | null; title: string | null; position: number }[];
  error: string | null;
  cost: number;
};


type StoredQuestion = { id: string; idx: number; question: string };

/**
 * Ask every engine every question, store the answers, the citations and the
 * per-engine leaderboard. Shared by the free pass and the email-gated pass so
 * both phases measure the same way over the same questions.
 *
 * Returns what it spent and which engines produced at least one answer.
 */
async function readAndStore(input: {
  scanId: string;
  brand: string;
  market: Market;
  engines: Engine[];
  questions: StoredQuestion[];
  checkDeadline: () => void;
}): Promise<{ dfsCalls: number; dfsCost: number; anthropicCalls: number; answered: Engine[] }> {
  const db = supabaseAdmin();
  const { scanId, brand, market, engines, questions, checkDeadline } = input;

  let dfsCalls = 0;
  let dfsCost = 0;
  let anthropicCalls = 0;

  // Every question against every engine, flattened so one queue paces the lot.
  const jobs = questions.flatMap((q) => engines.map((engine) => ({ q, engine })));

  const answers = await mapWithConcurrency(jobs, CONCURRENCY, async ({ q, engine }): Promise<Answer> => {
    checkDeadline();
    const base = {
      questionId: q.id,
      question: q.question,
      engine,
      prose: "",
      citations: [] as Answer["citations"],
    };

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const read = await readEngine(engine, q.question, market);
        dfsCalls += 1;
        dfsCost += read.cost;

        // Google claiming an Overview that did not arrive is worth one retry.
        const claimedButAbsent =
          !read.answered && (read.raw as { claimed_but_absent?: boolean } | null)?.claimed_but_absent;
        if (claimedButAbsent && attempt === 0) continue;

        return {
          ...base,
          answered: read.answered,
          brandNamed: read.answered && namesBrand(read.prose, brand),
          prose: read.prose,
          citations: read.citations,
          error: null,
          cost: read.cost,
        };
      } catch (err) {
        if (attempt === 0 && isRetryable(err)) continue;
        return {
          ...base,
          answered: false,
          brandNamed: false,
          error: err instanceof Error ? err.message.slice(0, 300) : String(err),
          cost: 0,
        };
      }
    }
    return { ...base, answered: false, brandNamed: false, error: "no answer", cost: 0 };
  });

  const answered = [...new Set(answers.filter((a) => a.answered).map((a) => a.engine))];

  // Every engine failing means we measured nothing at all.
  if (answered.length === 0 && answers.every((a) => a.error)) {
    throw new Error(answers.find((a) => a.error)?.error ?? "no engine could be reached");
  }

  const { error: aErr } = await db.from("scan_answers").insert(
    answers.map((a) => ({
      scan_id: scanId,
      question_id: a.questionId,
      engine: a.engine,
      answered: a.answered,
      brand_named: a.brandNamed,
      error: a.error,
      cost: a.cost,
    })),
  );
  if (aErr) throw new Error(`could not store the answers: ${aErr.message}`);

  const citations = answers.flatMap((a) =>
    a.citations.map((c) => ({
      scan_id: scanId,
      question_id: a.questionId,
      engine: a.engine,
      source_domain: c.source_domain,
      url: c.url,
      title: c.title,
      position: c.position,
    })),
  );
  if (citations.length) {
    const { error: cErr } = await db.from("scan_citations").insert(citations);
    if (cErr) throw new Error(`could not store the sources: ${cErr.message}`);
  }

  // One brand extraction per engine, so the leaderboard reads per engine as
  // well as overall. Engines that answered nothing are skipped rather than
  // recorded as a zero.
  const brandRows: { scan_id: string; engine: Engine; brand: string; mentions: number; is_subject: boolean }[] = [];
  const subjectKey = brand.trim().toLowerCase();

  for (const engine of engines) {
    const prose = answers
      .filter((a) => a.engine === engine && a.answered)
      .map((a) => a.prose)
      .filter(Boolean)
      .join("\n\n---\n\n");
    if (!prose.trim()) continue;

    const extracted = await extractBrands(prose);
    anthropicCalls += 1;
    checkDeadline();

    for (const b of extracted) {
      if (b.brand.trim().toLowerCase() === subjectKey) continue;
      brandRows.push({ scan_id: scanId, engine, brand: b.brand.trim(), mentions: b.mentions, is_subject: false });
    }

    // The subject gets a row for every engine that answered, at zero when it
    // was never named. A measured zero is the strongest finding on the page.
    const namedCount = answers.filter((a) => a.engine === engine && a.brandNamed).length;
    const claimed = extracted.find((b) => b.brand.trim().toLowerCase() === subjectKey)?.mentions;
    brandRows.push({ scan_id: scanId, engine, brand, mentions: claimed ?? namedCount, is_subject: true });
  }

  if (brandRows.length) {
    const { error: bErr } = await db.from("scan_brands").upsert(brandRows, { onConflict: "scan_id,engine,brand" });
    if (bErr) throw new Error(`could not store the leaderboard: ${bErr.message}`);
  }

  return { dfsCalls, dfsCost, anthropicCalls, answered };
}

/**
 * Stage C, the free pass. Three named steps, then complete.
 *
 * Reads only the engines frozen onto the scan at start. Perplexity and Claude
 * are deliberately not here: they are what the email buys, and they run in
 * runGatedScan over the very same questions so the two passes compare.
 */
export async function runScan(scanId: string): Promise<void> {
  const db = supabaseAdmin();
  const deadline = Date.now() + RUN_TIMEOUT_MS;
  const checkDeadline = () => {
    if (Date.now() > deadline) throw new Error("the scan took too long and was stopped");
  };

  let spend = { dfsCalls: 0, dfsCost: 0, anthropicCalls: 0 };

  try {
    const { data: scan, error } = await db
      .from("scans")
      .select("id, domain, brand_name, positioning, topic, market, engines, gated_engines")
      .eq("id", scanId)
      .single<ScanRow>();
    if (error || !scan) throw new Error(`scan ${scanId} not found`);
    if (!scan.topic || !scan.market) throw new Error("the topic was never confirmed");

    const brand = scan.brand_name ?? scan.domain;
    const market = scan.market;
    const engines = (scan.engines ?? []).filter(isEngine);
    if (!engines.length) throw new Error("no engines were selected for this scan");

    await db
      .from("scans")
      .update({ status: "running", step: "questions", started_at: new Date().toISOString() })
      .eq("id", scanId);

    // --- Step 1: "Building the questions buyers ask" ---
    const generated = await generateQuestions({
      topic: scan.topic,
      market,
      brand,
      positioning: scan.positioning,
    });
    spend.anthropicCalls += 1;
    checkDeadline();

    const { data: questionRows, error: qErr } = await db
      .from("scan_questions")
      .insert(generated.map((q, i) => ({ scan_id: scanId, idx: i, question: q.question, kind: q.kind })))
      .select("id, idx, question");
    if (qErr || !questionRows?.length) throw new Error(`could not store the questions: ${qErr?.message}`);

    const ordered = [...questionRows].sort((a, b) => a.idx - b.idx);

    // --- Step 2: "Reading what the engines answered" ---
    await db.from("scans").update({ step: "reading" }).eq("id", scanId);
    const read = await readAndStore({ scanId, brand, market, engines, questions: ordered, checkDeadline });
    spend = {
      dfsCalls: spend.dfsCalls + read.dfsCalls,
      dfsCost: spend.dfsCost + read.dfsCost,
      anthropicCalls: spend.anthropicCalls + read.anthropicCalls,
    };

    // One call for the whole set. A missing volume stays null, never zero.
    try {
      const sv = await readSearchVolumes(ordered.map((q) => q.question), market);
      spend.dfsCalls += 1;
      spend.dfsCost += sv.cost;
      for (const q of ordered) {
        await db
          .from("scan_questions")
          .update({ search_volume: sv.volumes.get(q.question) ?? null })
          .eq("id", q.id);
      }
    } catch {
      // Search volume is a column, not a reason to fail the scan.
    }
    checkDeadline();

    // --- Step 3: "Finding the sources they cited" is done inside readAndStore ---
    await db
      .from("scans")
      .update({
        status: "complete",
        step: null,
        completed_at: new Date().toISOString(),
        engines_answered: read.answered,
        dfs_calls: spend.dfsCalls,
        dfs_cost: spend.dfsCost,
        anthropic_calls: spend.anthropicCalls,
      })
      .eq("id", scanId);
  } catch (err) {
    const message = describeAnthropicError(err);
    await supabaseAdmin()
      .from("scans")
      .update({
        status: "failed",
        step: null,
        error: message.slice(0, 500),
        dfs_calls: spend.dfsCalls,
        dfs_cost: spend.dfsCost,
        anthropic_calls: spend.anthropicCalls,
      })
      .eq("id", scanId);
  }
}

/**
 * The email-gated pass: the engines an address unlocks, over the questions the
 * free pass already asked. Reusing the questions is the whole point - a
 * different question set would make the engines incomparable.
 *
 * Failure here never touches the free result, which the visitor has already
 * been shown. It records gated_status = failed and leaves the rest standing.
 */
export async function runGatedScan(scanId: string): Promise<void> {
  const db = supabaseAdmin();
  const deadline = Date.now() + RUN_TIMEOUT_MS;
  const checkDeadline = () => {
    if (Date.now() > deadline) throw new Error("the deeper check took too long and was stopped");
  };

  try {
    const { data: scan, error } = await db
      .from("scans")
      .select("id, domain, brand_name, positioning, topic, market, engines, gated_engines")
      .eq("id", scanId)
      .single<ScanRow>();
    if (error || !scan) throw new Error(`scan ${scanId} not found`);
    if (!scan.market) throw new Error("the market was never confirmed");

    const engines = (scan.gated_engines ?? []).filter(isEngine);
    if (!engines.length) {
      await db.from("scans").update({ gated_status: "complete" }).eq("id", scanId);
      return;
    }

    const { data: questionRows } = await db
      .from("scan_questions")
      .select("id, idx, question")
      .eq("scan_id", scanId)
      .order("idx", { ascending: true });
    if (!questionRows?.length) throw new Error("the free pass left no questions to re-ask");

    await db.from("scans").update({ gated_status: "running" }).eq("id", scanId);

    const read = await readAndStore({
      scanId,
      brand: scan.brand_name ?? scan.domain,
      market: scan.market,
      engines,
      questions: questionRows,
      checkDeadline,
    });

    // Spend from both passes accumulates on the same row, so the admin page and
    // the daily cost cap see the true cost of this scan.
    const { data: current } = await db
      .from("scans")
      .select("dfs_calls, dfs_cost, anthropic_calls, engines_answered")
      .eq("id", scanId)
      .single();

    await db
      .from("scans")
      .update({
        gated_status: "complete",
        gated_completed_at: new Date().toISOString(),
        engines_answered: [...new Set([...(current?.engines_answered ?? []), ...read.answered])],
        dfs_calls: (current?.dfs_calls ?? 0) + read.dfsCalls,
        dfs_cost: Number(current?.dfs_cost ?? 0) + read.dfsCost,
        anthropic_calls: (current?.anthropic_calls ?? 0) + read.anthropicCalls,
      })
      .eq("id", scanId);
  } catch (err) {
    const message = describeAnthropicError(err);
    await supabaseAdmin()
      .from("scans")
      .update({ gated_status: "failed", gated_error: message.slice(0, 500) })
      .eq("id", scanId);
  }
}

export { QUESTION_COUNT };
