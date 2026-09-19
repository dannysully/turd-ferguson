import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import {
  classifyBrands,
  describeAnthropicError,
  extractBrands,
  generateQuestions,
  QUESTION_COUNT,
} from "./anthropic";
import { brandKey, pickDisplayName } from "./brand-name";
import { readEngine, readSearchVolumes } from "./dataforseo";
import { type Market, normalizeDomain } from "./domain";
import { type Engine, isEngine, namesBrand, type OrganicHit } from "./engines";
import { classifySources } from "./sources";

/** Whole-run ceiling. Past this the scan is marked failed rather than left hanging. */
const RUN_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * How many engine reads run at once. Each read is one billed call and some
 * engines document execution times up to 120 seconds, so this is the knob that
 * decides whether a five-engine scan finishes inside the run timeout.
 *
 * Sized to the free pass: fourteen questions across four engines is 56 reads,
 * so 28 clears them in two passes of the pool rather than the six it took at
 * ten, which is most of the two minutes a scan used to sit there. DataForSEO
 * allows 2000 calls a minute, so the burst is not the constraint; the tail is.
 * Past about this point the slowest single read sets the finish time and more
 * concurrency buys nothing.
 */
const CONCURRENCY = 28;

export type ScanRow = {
  id: string;
  domain: string;
  brand_name: string | null;
  positioning: string | null;
  topic: string | null;
  topic_variants: string[] | null;
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
  /** Google only. null is a measurement: not in the top twenty. undefined: not measured. */
  googleRank?: number | null;
  error: string | null;
  cost: number;
};

/** Where the subject sits in Google's organic results, or null if outside the top twenty. */
function rankOf(organic: OrganicHit[] | undefined, subject: string): number | null | undefined {
  if (!organic?.length) return undefined;
  const want = normalizeDomain(subject);
  const hit = organic.find((o) => o.domain === want || o.domain.endsWith(`.${want}`));
  return hit ? hit.rank : null;
}


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
  /** The subject's domain, for its Google rank. */
  domain: string;
  brand: string;
  /** The category, and what the subject sells. Both steer who counts as a
   *  competitor, so the leaderboard is judged against the right category. */
  topic: string;
  positioning: string | null;
  market: Market;
  engines: Engine[];
  questions: StoredQuestion[];
  checkDeadline: () => void;
  /** Called once the reads are in and the citation work begins, so the screen
   *  can move off "reading" rather than sitting on it for the whole run. */
  onSources?: () => Promise<void>;
}): Promise<{ dfsCalls: number; dfsCost: number; anthropicCalls: number; answered: Engine[] }> {
  const db = supabaseAdmin();
  const { scanId, domain, brand, topic, positioning, market, engines, questions, checkDeadline, onSources } =
    input;

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
          googleRank: engine === "google_aio" ? rankOf(read.organic, domain) : undefined,
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

  // Every read is in. What follows - storing citations and extracting the
  // leaderboard - is the third step the screen names, so say so.
  await onSources?.();

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
      // Captured on every run, including runs nobody ever claims, because the
      // free pass happens before an email exists. The purge sweep reclaims it.
      response_text: a.prose || null,
    })),
  );
  if (aErr) throw new Error(`could not store the answers: ${aErr.message}`);

  // The Google read is a full SERP, so the subject's organic position came back
  // with every Overview. Keeping it is free. Only a measured value is written.
  for (const a of answers) {
    if (a.engine !== "google_aio" || a.googleRank === undefined) continue;
    await db.from("scan_questions").update({ google_rank: a.googleRank }).eq("id", a.questionId);
  }

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
  const subjectKey = brandKey(brand);

  // One extraction per engine, run together. Serially this was four Anthropic
  // round trips bolted onto the end of every scan, all of them independent.
  const extractions = await Promise.all(
    engines.map(async (engine) => {
      const blocks = answers
        .filter((a) => a.engine === engine && a.answered)
        .map((a) => a.prose)
        .filter(Boolean);
      if (!blocks.length) return null;
      const out = await extractBrands(blocks, { topic, brand });
      return { engine, extracted: out.brands, calls: out.calls, failedBatches: out.failedBatches };
    }),
  );
  anthropicCalls += extractions.reduce((n, r) => n + (r?.calls ?? 0), 0);

  // extractBrands swallows a bad batch now rather than failing the run, so the
  // count is the only way a partial leaderboard shows up. The trade is
  // deliberate: every engine read on this scan is already paid for by the time
  // the extraction runs, and losing the lot to one truncated response is worse
  // than a leaderboard that is short a few names.
  const failedExtractions = extractions.reduce((n, r) => n + (r?.failedBatches ?? 0), 0);
  if (failedExtractions) {
    console.warn(`[scan] ${scanId} leaderboard: ${failedExtractions} prose batch(es) failed to extract`);
  }
  checkDeadline();

  // One spelling per brand, chosen across the whole scan rather than per
  // engine. Deciding per engine would leave ChatGPT's "London Ski Co." and
  // Gemini's "London Ski Co" as two rows again, because the leaderboard
  // groups on the stored text.
  const variants = new Map<string, Map<string, number>>();
  for (const row of extractions) {
    if (!row) continue;
    for (const b of row.extracted) {
      const name = b.brand.trim();
      const key = brandKey(name);
      if (!key || key === subjectKey) continue;
      const seen = variants.get(key) ?? new Map<string, number>();
      seen.set(name, (seen.get(name) ?? 0) + b.mentions);
      variants.set(key, seen);
    }
  }
  const displayFor = new Map([...variants].map(([key, seen]) => [key, pickDisplayName(seen)]));

  /**
   * Which of those names are actually competitors.
   *
   * Extraction is broad on purpose - it reads prose and returns the companies
   * named in it. That is the wrong list for a leaderboard: on an analytics
   * consultant's scan it returned Shopify, Meta, Upwork, WordPress, LinkedIn,
   * Screaming Frog and Tealium, and the report read "13th of 124 brands",
   * which counted proper nouns rather than suppliers.
   *
   * Judged once for the whole scan, not per engine, so a name cannot be a
   * competitor on ChatGPT and not on Gemini, and so nothing is paid for twice.
   *
   * A name that is not judged a supplier does not enter, and neither does a
   * name that was never judged at all - the same rule sources.ts applies when
   * it keeps an unassessed domain out of the opportunity list. Ranking a shop
   * platform as a competitor to a consultancy is a claim the report cannot
   * stand behind, and an empty list is a visible failure where a wrong one is
   * not.
   */
  const suppliers = new Set<string>();
  if (displayFor.size) {
    const judged = await classifyBrands({ topic, brand, positioning, names: [...displayFor.values()] });
    anthropicCalls += judged.calls;
    // Keyed through brandKey, not on the returned string. The prompt asks for
    // the name back exactly as given, but a model that returns "Screaming
    // frog" for "Screaming Frog" would miss the lookup and silently drop a
    // real competitor - the one direction this filter must not fail in.
    // brandKey folds exactly the differences that are punctuation and case,
    // and displayFor's key is already brandKey of its own display name.
    const verdict = new Map(judged.brands.map((j) => [brandKey(j.name), j]));
    for (const key of displayFor.keys()) {
      if (verdict.get(key)?.supplier) suppliers.add(key);
    }
    // classifyBrands swallows a bad batch so the others still land, so the
    // count is the only way this shows up. Logged even when nothing failed:
    // a leaderboard that suddenly halves is worth being able to see.
    console.info(
      `[scan] ${scanId} leaderboard: ${suppliers.size} of ${displayFor.size} names kept as suppliers` +
        (judged.failedBatches ? `, ${judged.failedBatches} batch(es) failed to classify` : ""),
    );
  }
  checkDeadline();

  const brandRows: { scan_id: string; engine: Engine; brand: string; mentions: number; is_subject: boolean }[] = [];
  for (const row of extractions) {
    if (!row) continue;
    const { engine, extracted } = row;

    // Merge within the engine too: one engine can spell it both ways in one
    // answer set, and (scan_id, engine, brand) is unique.
    const perEngine = new Map<string, number>();
    for (const b of extracted) {
      const key = brandKey(b.brand);
      if (!key || key === subjectKey) continue;
      if (!suppliers.has(key)) continue;
      perEngine.set(key, (perEngine.get(key) ?? 0) + b.mentions);
    }
    for (const [key, mentions] of perEngine) {
      brandRows.push({
        scan_id: scanId,
        engine,
        brand: displayFor.get(key) ?? key,
        mentions,
        is_subject: false,
      });
    }

    // The subject gets a row for every engine that answered, at zero when it
    // was never named. A measured zero is the strongest finding on the page.
    const namedCount = answers.filter((a) => a.engine === engine && a.brandNamed).length;
    const claimed = extracted
      .filter((b) => brandKey(b.brand) === subjectKey)
      .reduce((n, b) => n + b.mentions, 0);
    brandRows.push({ scan_id: scanId, engine, brand, mentions: claimed || namedCount, is_subject: true });
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
      .select("id, domain, brand_name, positioning, topic, topic_variants, market, engines, gated_engines")
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
    /**
     * The confirm screen may have written these already.
     *
     * It previews the set, lets whole clusters and single questions go, and
     * stores what is left. Regenerating here would throw that away and ask a
     * different set from the one the visitor approved - and they would have no
     * way of knowing, because the report only ever shows what was asked.
     */
    const { data: confirmedRows } = await db
      .from("scan_questions")
      .select("id, idx, question")
      .eq("scan_id", scanId)
      .order("idx", { ascending: true });

    let ordered = confirmedRows ?? [];

    if (!ordered.length) {
      const generated = await generateQuestions({
        topic: scan.topic,
        topicVariants: scan.topic_variants ?? [],
        market,
        brand,
        positioning: scan.positioning,
      });
      spend.anthropicCalls += 1;
      checkDeadline();

      const rows = generated.map(function (q, i) {
        return { scan_id: scanId, idx: i, question: q.question, kind: q.kind };
      });
      const { data: questionRows, error: qErr } = await db
        .from("scan_questions")
        .insert(rows)
        .select("id, idx, question");
      if (qErr || !questionRows?.length) throw new Error(`could not store the questions: ${qErr?.message}`);

      ordered = [...questionRows].sort((a, b) => a.idx - b.idx);
    }

    // --- Step 2: "Reading what the engines answered" ---
    await db.from("scans").update({ step: "reading" }).eq("id", scanId);
    // --- Step 3: "Finding the sources they cited" ---
    // readAndStore raises this itself, the moment the reads are in and the
    // citation work starts. Setting it here would be a lie: the reads are the
    // long part and the screen would show the last step for the whole of it.
    const read = await readAndStore({
      scanId,
      domain: scan.domain,
      brand,
      topic: scan.topic,
      positioning: scan.positioning,
      market,
      engines,
      questions: ordered,
      checkDeadline,
      onSources: async () => {
        await db.from("scans").update({ step: "sources" }).eq("id", scanId);
      },
    });
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

    // What kind of site each source is: competitor, review site, somewhere an
    // article could be placed. One call, and never a reason to fail the scan.
    try {
      const kinds = await classifySources(scanId);
      spend.anthropicCalls += kinds.anthropicCalls;
    } catch (err) {
      console.warn(`[scan] source kinds skipped for ${scanId}:`, err instanceof Error ? err.message : err);
    }

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
      .select("id, domain, brand_name, positioning, topic, topic_variants, market, engines, gated_engines")
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
      domain: scan.domain,
      brand: scan.brand_name ?? scan.domain,
      topic: scan.topic ?? "",
      positioning: scan.positioning,
      market: scan.market,
      engines,
      questions: questionRows,
      checkDeadline,
    });

    // The second pass cites sources the first did not. Label the new ones.
    let kindCalls = 0;
    try {
      kindCalls = (await classifySources(scanId)).anthropicCalls;
    } catch (err) {
      console.warn(`[scan] source kinds skipped for ${scanId}:`, err instanceof Error ? err.message : err);
    }

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
        anthropic_calls: (current?.anthropic_calls ?? 0) + read.anthropicCalls + kindCalls,
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
