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
import { readEngine, readSearchVolumes, volumeKey } from "./dataforseo";
import { type Market, normalizeDomain } from "./domain";
import { type Engine, isEngine, namesBrand, type OrganicHit } from "./engines";
import { classifySources } from "./sources";

/**
 * Whole-run ceiling. Past this the scan is marked failed rather than left
 * hanging - which is what it says, and at five minutes it could not do.
 *
 * Every route that starts a pass declares maxDuration = 300, so the platform
 * stops the invocation at five minutes too. A ceiling equal to the one above
 * it never fires: the function was killed mid-read first, the catch that
 * writes status failed never ran, and the scan sat at running with a step it
 * would never leave. The result screen polls that status every 2.5 seconds
 * with no end, so the visitor got a spinner that says "this one is taking a
 * while" and then nothing, for ever.
 *
 * Thirty seconds of headroom is far more than the failure path needs - it is
 * one read and one write - but the pass can only notice the deadline between
 * jobs, so the margin also has to cover a read that is already in flight.
 * That is what the budget passed to readEngine is for: no single read is
 * allowed to outlive the deadline any more, so the gap between the deadline
 * passing and the pass throwing is bounded rather than up to 130 seconds.
 */
const RUN_TIMEOUT_MS = 4.5 * 60 * 1000;

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
 * What a pass has billed so far.
 *
 * Deliberately mutable and owned by the caller. A pass that throws has still
 * spent whatever it spent up to the throw, and `daily_cost_cap_usd` reads
 * `dfs_cost` off the scan row - so the total has to survive the throw and
 * reach that column, which a return value cannot do.
 */
type Spend = { dfsCalls: number; dfsCost: number; anthropicCalls: number };

/**
 * The three spend columns, with this pass's spend added to what is already on
 * the row.
 *
 * One rule for every exit: a pass adds what it billed, whether it returned or
 * threw. Added rather than set because three runs write these columns - the
 * free pass, the gated pass, and the free pass again when a visitor confirms a
 * second time after a failed one. A set let that retry overwrite the first
 * attempt's cost with its own, so reads that had been paid for twice counted
 * once.
 */
/**
 * A read that failed must not be added to as though it returned zero.
 *
 * The error was discarded, so a database that did not answer became
 * `0 + this pass's spend` - and because the caller writes that total back, the
 * cost already recorded by the earlier pass was erased. The function written to
 * stop a retry overwriting the first attempt's cost did exactly that whenever
 * its own read failed.
 *
 * It matters beyond tidiness: `spentSince` and `anthropicCallsSince` sum these
 * columns to enforce the day's ceilings, and a ceiling that reads a total which
 * has had earlier spend erased from it under-reports - which is the one
 * direction a ceiling must not fail in, and the busier the day the more of it
 * there is to erase.
 *
 * So a failed read omits the columns rather than guessing at them. This pass's
 * spend is then missing from the row, which the log says out loud, and what was
 * already measured survives. Losing an addition is recoverable; erasing a
 * record is not.
 *
 * The better fix is a database-side increment - `update scans set dfs_cost =
 * dfs_cost + $1` through an RPC, the way note_preview_call already reserves -
 * because that needs no read at all and also closes the case this cannot: two
 * passes reading the same total concurrently and each writing its own sum back.
 * That is additive DDL and therefore ours to do; it is written up in worklog.md
 * as the next job on this path rather than bolted onto a fix that had to ship.
 */
async function billedOnto(
  scanId: string,
  spend: Spend,
): Promise<{ dfs_calls: number; dfs_cost: number; anthropic_calls: number } | Record<string, never>> {
  const { data: current, error } = await supabaseAdmin()
    .from("scans")
    .select("dfs_calls, dfs_cost, anthropic_calls")
    .eq("id", scanId)
    .single();
  if (error) {
    console.warn(
      "[scan] could not read the spend already on " + scanId +
        ", so this pass's spend is not recorded rather than overwriting it: " + error.message,
    );
    return {};
  }
  return {
    dfs_calls: (current?.dfs_calls ?? 0) + spend.dfsCalls,
    dfs_cost: Number(current?.dfs_cost ?? 0) + spend.dfsCost,
    anthropic_calls: (current?.anthropic_calls ?? 0) + spend.anthropicCalls,
  };
}

/**
 * Ask every engine every question, store the answers, the citations and the
 * per-engine leaderboard. Shared by the free pass and the email-gated pass so
 * both phases measure the same way over the same questions.
 *
 * Returns which engines produced at least one answer. What it spent goes onto
 * `input.spend` as it is billed, never into the return value: every read here
 * is paid for the moment it is made, and this function can throw after dozens
 * of them - on the deadline, or on a failed insert. Returning the total meant
 * a scan that failed at read 40 of 60 recorded a cost of zero, and the cap
 * that sums those costs let the next visitor start another one. A cap that
 * under-reports the day fails open, which is the one direction it must not
 * fail in.
 */
async function readAndStore(input: {
  scanId: string;
  /** Incremented in place as each call is billed. See `Spend`. */
  spend: Spend;
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
  /**
   * What is left of the run. Passed down to every read so none of them can
   * outlive the deadline: the pass can only test the clock between jobs, so
   * without this the gap between the deadline passing and the pass giving up
   * is however long the read already in flight decides to take.
   */
  remainingMs: () => number;
  /** Called once the reads are in and the citation work begins, so the screen
   *  can move off "reading" rather than sitting on it for the whole run. */
  onSources?: () => Promise<void>;
}): Promise<{
  answered: Engine[];
  /**
   * A model batch failed while the leaderboard was being built, so names are
   * missing from it. The counts this function stores are all still measured -
   * what this flags is that the population behind a *rank* is short.
   */
  leaderboardPartial: boolean;
}> {
  const db = supabaseAdmin();
  const { scanId, spend, domain, brand, topic, positioning, market, engines, questions, checkDeadline, onSources, remainingMs } =
    input;

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
        /**
         * Counted before the await, for the same reason the search volume call
         * below is: post() is the part DataForSEO bills, and everything that
         * can throw after it happens once that request has already gone out.
         * firstTask() throws on a task that came back non-20000 - quota, auth,
         * bad params - and the run budget aborts a read the engine may well
         * have executed and billed regardless of whether we waited for it.
         *
         * Counted on the way back, both of those were a call made, paid for,
         * and recorded in no column. This is the defect the search volume call
         * already fixed, at up to 56 reads a scan rather than one, and it is
         * the same thing model_call_debits exists to stop on the Anthropic
         * side - billed work that reaches no column.
         *
         * The cost cannot move up with it. Only the response knows what the
         * task cost, so a read that throws still leaves dfs_cost short by
         * whatever it billed; dfs_calls is the column that can be made true,
         * so it is. That asymmetry is why the two lines are now apart.
         */
        spend.dfsCalls += 1;
        const read = await readEngine(engine, q.question, market, remainingMs());
        spend.dfsCost += read.cost;

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

  /**
   * Upserted rather than inserted, and the conflict target is the constraint
   * that was making a retry impossible.
   *
   * scan_answers is unique on (question_id, engine). A pass that stored its
   * answers and then threw - on the deadline, on the citation insert, on the
   * leaderboard write - leaves the scan failed with those rows still on it.
   * The result screen sends that visitor back to confirm with the error, and
   * the confirm route lets a failed scan through by design. So the second run
   * re-asked every question on every engine, paid for all of it, and then died
   * on a duplicate key with "could not store the answers" - and so did the
   * third. The one thing a visitor could do about a failed scan could never
   * work, and it billed a full set of reads every time they tried it.
   *
   * Replacing is the right meaning rather than a way around the constraint:
   * the row is one engine answer to one question, this pass has just re-read
   * it, and the new read is the current one. The constraint stays and still
   * does its job, which is one answer per question per engine.
   */
  const { error: aErr } = await db.from("scan_answers").upsert(
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
    { onConflict: "question_id,engine" },
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
  /**
   * Citations have no unique key, so a retried pass adds to what the failed
   * one left rather than replacing it. Every reader already dedupes them on
   * (source_domain, question_id, engine) - scan_teaser selects distinct,
   * buildUnlockPayload keys a counted set, deriveOpportunities keys
   * seenAnswer - so no count doubles. What does survive is a source the
   * abandoned read cited and the current answers do not, which is why this is
   * a question in blocked.md rather than a delete taken here: clearing a
   * scan own rows is still a delete, and that line is Danny to draw.
   */
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
  spend.anthropicCalls += extractions.reduce((n, r) => n + (r?.calls ?? 0), 0);

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
  let failedJudgements = 0;
  if (displayFor.size) {
    const judged = await classifyBrands({ topic, brand, positioning, names: [...displayFor.values()] });
    spend.anthropicCalls += judged.calls;
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
    failedJudgements = judged.failedBatches;
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

  /**
   * Either half of the leaderboard build can lose a batch, and both lose it the
   * same way: the batch's names are simply absent from what follows.
   *
   * Extraction losing one means brands nobody ever heard of; judgement losing
   * one means brands that were extracted and then never assessed, which
   * `suppliers` excludes by design. Both leave the leaderboard short, and a
   * rank counted against a short population flatters the subject - the one
   * direction a number on a marketing report must not be wrong in.
   */
  return {
    answered,
    leaderboardPartial: failedExtractions > 0 || failedJudgements > 0,
  };
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
  const remainingMs = () => deadline - Date.now();

  // Accumulated as it is billed rather than totalled at the end, so the catch
  // below writes what this scan actually cost even when it never finished.
  const spend: Spend = { dfsCalls: 0, dfsCost: 0, anthropicCalls: 0 };
  let spendPersisted = false;

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

    /**
     * Claim the row rather than announce it.
     *
     * The confirm route already claims queued with a filtered update, so this
     * is defence in depth rather than a live race - but it is the difference
     * between "the one caller is careful" and "a second pass cannot start".
     * The next caller added will not know it has to claim first, and the
     * failure is silent and expensive: two pipelines on one scan id bill every
     * engine read twice and write a second set of answers and citations, which
     * inflates the leaderboard and every source count derived from it.
     *
     * .select() is what makes it readable. PostgREST answers an UPDATE that
     * matched no rows with a 2xx, so without it a lost claim and a won one are
     * the same result - the same trap that was fixed in the unlock path.
     *
     * Nothing has been billed at this point, so returning here costs nothing
     * and must not mark the scan failed: the run that won the claim is still
     * going, and this one has no business writing a status over it.
     */
    const { data: claimed, error: claimErr } = await db
      .from("scans")
      .update({ status: "running", step: "questions", started_at: new Date().toISOString() })
      .eq("id", scanId)
      .eq("status", "queued")
      .select("id");
    if (claimErr) throw new Error(`could not claim scan ${scanId}: ${claimErr.message}`);
    if (!claimed?.length) {
      console.warn(`[scan] ${scanId} is not queued, so this pass is a duplicate and stops here`);
      return;
    }

    // --- Step 1: "Building the questions buyers ask" ---
    /**
     * The confirm screen may have written these already.
     *
     * It previews the set, lets whole clusters and single questions go, and
     * stores what is left. Regenerating here would throw that away and ask a
     * different set from the one the visitor approved - and they would have no
     * way of knowing, because the report only ever shows what was asked.
     */
    const { data: confirmedRows, error: confirmedErr } = await db
      .from("scan_questions")
      .select("id, idx, question")
      .eq("scan_id", scanId)
      .order("idx", { ascending: true });

    /**
     * A read that failed is not a scan with no questions confirmed.
     *
     * The error was discarded, so a database that did not answer became an
     * empty list, and an empty list is the signal for the branch below: write a
     * fresh set and ask that instead. That is the one thing the comment above
     * says must not happen - the visitor pruned a set on the confirm screen,
     * and the report only ever shows what was asked, so a scan that quietly
     * substituted its own questions is not detectable from the outside by
     * anyone. It also pays for a question set nobody asked for.
     *
     * Failing the scan is the honest end. The screen offers a re-run, the
     * confirmed rows are still on the table, and the next attempt reads them.
     */
    if (confirmedErr) {
      throw new Error("could not read the confirmed questions: " + confirmedErr.message);
    }

    let ordered = confirmedRows ?? [];

    if (!ordered.length) {
      // Billed onto the accumulator as the requests go out, not returned on the
      // way through. withRetry makes up to three, and a set that threw on the
      // last of them used to record none of the ones already paid for.
      const qBilled = { calls: 0 };
      let generated;
      try {
        generated = await generateQuestions({
          topic: scan.topic,
          topicVariants: scan.topic_variants ?? [],
          market,
          brand,
          positioning: scan.positioning,
        }, qBilled);
      } finally {
        spend.anthropicCalls += qBilled.calls;
      }
      checkDeadline();

      const rows = generated.questions.map(function (q, i) {
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
      spend,
      domain: scan.domain,
      brand,
      topic: scan.topic,
      positioning: scan.positioning,
      market,
      engines,
      questions: ordered,
      checkDeadline,
      remainingMs,
      onSources: async () => {
        await db.from("scans").update({ step: "sources" }).eq("id", scanId);
      },
    });

    // One call for the whole set. A missing volume stays null, never zero.
    //
    // The call is counted before the await rather than after it. post() is the
    // part DataForSEO bills, and firstTask() throws on a task that came back
    // non-20000 - quota, auth, bad params - which happens after that request
    // has already gone out. Counting on the way out meant a task error billed
    // a call this row never recorded, and both the admin page and
    // daily_cost_cap_usd read these columns. The cost itself is only known
    // from the response, so it stays inside.
    if (ordered.length) spend.dfsCalls += 1;
    try {
      const sv = await readSearchVolumes(ordered.map((q) => q.question), market);
      spend.dfsCost += sv.cost;
      for (const q of ordered) {
        await db
          .from("scan_questions")
          .update({ search_volume: sv.volumes.get(volumeKey(q.question)) ?? null })
          .eq("id", q.id);
      }
    } catch (err) {
      // Search volume is a column, not a reason to fail the scan - but it has
      // to say so out loud. This catch used to be empty, and a silent one is
      // worse here than anywhere else in the pipeline: a scan with every
      // volume null is exactly what the report renders when the questions
      // genuinely have no volume, so a broken dependency and a legitimate
      // result are the same page. The only place the difference could show up
      // is this line.
      console.warn(
        `[scan] search volume skipped for ${scanId}:`,
        err instanceof Error ? err.message : err,
      );
    }
    checkDeadline();

    // What kind of site each source is: competitor, review site, somewhere an
    // article could be placed. One call, and never a reason to fail the scan.
    // Billed onto the accumulator as the requests go out. classifySources
    // stores its rows last and throws if that fails, so a count read off the
    // return value was lost exactly when the catch below swallowed it - calls
    // made, paid for, and invisible to the day ceiling.
    const sourceCalls = { calls: 0 };
    try {
      await classifySources(scanId, sourceCalls);
    } catch (err) {
      console.warn(`[scan] source kinds skipped for ${scanId}:`, err instanceof Error ? err.message : err);
    }
    spend.anthropicCalls += sourceCalls.calls;

    await db
      .from("scans")
      .update({
        status: "complete",
        step: null,
        completed_at: new Date().toISOString(),
        engines_answered: read.answered,
        leaderboard_partial: read.leaderboardPartial,
        ...(await billedOnto(scanId, spend)),
      })
      .eq("id", scanId);
    spendPersisted = true;
  } catch (err) {
    const message = describeAnthropicError(err);
    await supabaseAdmin()
      .from("scans")
      .update({
        status: "failed",
        step: null,
        error: message.slice(0, 500),
        ...(spendPersisted ? {} : await billedOnto(scanId, spend)),
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
  const remainingMs = () => deadline - Date.now();

  // This pass re-asks every question on two more engines, so a failure part
  // way through can be dozens of reads that were paid for. Accumulated here
  // and written on the way out through either exit.
  const spend: Spend = { dfsCalls: 0, dfsCost: 0, anthropicCalls: 0 };
  let spendPersisted = false;

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

    // The same claim as the free pass, and for the same reason. The unlock path
    // claims queued before it gets here, so this is the second lock rather than
    // the first - but a gated pass re-asks every question on every gated
    // engine, so a duplicate is dozens of reads paid for twice.
    const { data: gatedClaimed, error: gatedClaimErr } = await db
      .from("scans")
      .update({ gated_status: "running" })
      .eq("id", scanId)
      .eq("gated_status", "queued")
      .select("id");
    if (gatedClaimErr) throw new Error(`could not claim the gated pass for ${scanId}: ${gatedClaimErr.message}`);
    if (!gatedClaimed?.length) {
      console.warn(`[scan] ${scanId} gated pass is not queued, so this pass is a duplicate and stops here`);
      return;
    }

    const read = await readAndStore({
      scanId,
      spend,
      domain: scan.domain,
      brand: scan.brand_name ?? scan.domain,
      topic: scan.topic ?? "",
      positioning: scan.positioning,
      market: scan.market,
      engines,
      questions: questionRows,
      checkDeadline,
      remainingMs,
    });

    // The second pass cites sources the first did not. Label the new ones.
    const gatedSourceCalls = { calls: 0 };
    try {
      await classifySources(scanId, gatedSourceCalls);
    } catch (err) {
      console.warn(`[scan] source kinds skipped for ${scanId}:`, err instanceof Error ? err.message : err);
    }
    // Same reason as the free pass: the count has to survive the throw the
    // catch above is here to absorb.
    spend.anthropicCalls += gatedSourceCalls.calls;

    // Spend from both passes accumulates on the same row, so the admin page and
    // the daily cost cap see the true cost of this scan.
    const { data: current, error: currentErr } = await db
      .from("scans")
      .select("engines_answered")
      .eq("id", scanId)
      .single();

    /**
     * A read that failed must not become an empty list here.
     *
     * engines_answered is a union with what is already on the row, and the error
     * was discarded - so a read that did not answer collapsed to `[]` and the
     * update wrote the gated engines *over* the free pass's. The report renders
     * this column, so an unlocked scan would have told the reader that the
     * engines they watched answer during the run had not answered at all, on the
     * one report somebody gave an address for.
     *
     * Omitted rather than guessed. Leaving the column alone keeps what the free
     * pass measured and loses only this pass's addition, which the log names;
     * writing the union of a list we could not read would publish a fact we do
     * not have.
     */
    if (currentErr) {
      console.warn(
        "[scan] could not read engines_answered for " + scanId + ", leaving it as the free pass left it: " +
          currentErr.message,
      );
    }

    await db
      .from("scans")
      .update({
        gated_status: "complete",
        gated_completed_at: new Date().toISOString(),
        ...(currentErr
          ? {}
          : { engines_answered: [...new Set([...(current?.engines_answered ?? []), ...read.answered])] }),
        // Set, never cleared. The gated pass re-reads the same questions on two
        // more engines; it cannot recover names a failed batch lost on the free
        // pass, so a clean second pass is not evidence the leaderboard is whole.
        ...(read.leaderboardPartial ? { leaderboard_partial: true } : {}),
        ...(await billedOnto(scanId, spend)),
      })
      .eq("id", scanId);
    spendPersisted = true;
  } catch (err) {
    const message = describeAnthropicError(err);
    // What this pass had already paid for when it failed. Without it a failed
    // gated pass was free as far as the cap could see, and this is the
    // expensive pass - every question again, on two more engines. The guard
    // stops a throw raised after the update above from billing the day twice.
    await supabaseAdmin()
      .from("scans")
      .update({
        gated_status: "failed",
        gated_error: message.slice(0, 500),
        ...(spendPersisted ? {} : await billedOnto(scanId, spend)),
      })
      .eq("id", scanId);
  }
}

export { QUESTION_COUNT };
