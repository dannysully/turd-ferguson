import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import {
  classifyBrands,
  describeAnthropicError,
  extractBrands,
  generateQuestions,
  QUESTION_COUNT,
} from "./anthropic";
import { brandKey, displayNamesFor, namesBrand } from "./brand-name";
import { readEngine } from "./dataforseo";
import { type Market, normalizeDomain } from "./domain";
// The words this file writes into `scans.step`, so a typo here is a compile
// error rather than a progress bar that freezes on the waiting screen.
import { STEP } from "./run-steps";
import { type Engine, isEngine, type OrganicHit } from "./engines";
import { classifySources } from "./sources";

/**
 * Whole-run ceiling. Past this the scan is marked failed rather than left
 * hanging - which is what it says, and at five minutes it could not do.
 *
 * Every route that starts a pass declares maxDuration = 300, so the platform
 * stops the invocation at five minutes too. That sentence is held by
 * `src/app/api/run-duration.test.mts` rather than by this comment - it derives
 * the pass-starting routes from the call graph, because two of the five reach
 * the pipeline through `completeUnlock` and name nothing here. A ceiling equal
 * to the one above it never fires: the function was killed mid-read first, the catch that
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
 * Per-phase elapsed, in whole milliseconds. Danny, 20 Sep 12:10, item 3.
 *
 * Nothing in this pipeline was timed, so every judgement about where a scan
 * spends its time - including the two changes made alongside this one - was
 * read off the call graph. That is enough to remove a dependency that provably
 * is not real and not enough to know which phase dominates.
 *
 * Owned by the caller and mutated in place, for the same reason `Spend` is: a
 * pass that throws has still spent the time it spent, and the phases that did
 * finish are exactly what you want to look at when one did not. Written to
 * `scans.step_ms` on both exits.
 *
 * The keys are finer than `RUN_STEPS`. The progress bar has three captions and
 * the whole question is what happens inside the third, so these are phases, not
 * steps, and they are expected to change as the pipeline does - which is why
 * the column is jsonb rather than one column each.
 */
type Timings = Record<string, number>;

/**
 * Time one phase into the map and return whatever it returned.
 *
 * Wraps rather than bracketing each call with two `Date.now()` reads, because a
 * phase that throws must still record what it cost before rethrowing - and a
 * hand-written start/end pair silently records nothing on exactly the runs
 * worth looking at. `finally` is the whole point of this function.
 */
async function timed<T>(into: Timings, key: string, run: () => Promise<T>): Promise<T> {
  const at = Date.now();
  try {
    return await run();
  } finally {
    into[key] = (into[key] ?? 0) + (Date.now() - at);
  }
}

/**
 * The map as it goes into the column: the phases, plus `total`.
 *
 * `total` is wall clock from the top of the pass, not the sum of the phases,
 * and the difference between the two is the point. The phases do not tile the
 * run - the database reads and writes between them are untimed, and since
 * 20 September 2026 `sources` overlaps `extract` and `classify` rather than
 * following them, so the parts can legitimately add up to more than the whole.
 * Summing them would hide both facts. An operator comparing `total` against the
 * sum is reading exactly the thing worth reading.
 *
 * Rounded to whole milliseconds because that is the resolution `Date.now()`
 * has, and a fractional figure would imply one it does not.
 */
function sealTimings(t: Timings, startedAt: number): Timings {
  return { ...t, total: Date.now() - startedAt };
}

/**
 * Add what this pass billed to the three spend columns, in the database.
 *
 * One rule for every exit: a pass adds what it billed, whether it returned or
 * threw. Added rather than set because three runs write these columns - the
 * free pass, the gated pass, and the free pass again when a visitor confirms a
 * second time after a failed one. A set let that retry overwrite the first
 * attempt's cost with its own, so reads that had been paid for twice counted
 * once.
 *
 * The addition happens in the update rather than here. This used to read the
 * totals, add to them and hand them back to the caller's update, which is only
 * a set with extra steps when two passes overlap: both read the same figure,
 * both add their own spend, and the second write lands on top of the first, so
 * the column advances by one pass's spend however many there were. The two
 * passes are not hypothetically concurrent - the gated one starts when the
 * visitor clicks the link in their verification email, and nothing sequences
 * that against a free pass being retried.
 *
 * `note_scan_spend` does it in one statement, so the row is locked for the
 * addition and neither pass can lose the other's. It needs no read at all,
 * which also retires the case the previous fix could only refuse: a read that
 * failed became `0 + this pass's spend` and erased what the earlier pass had
 * recorded, and the mitigation was to omit the columns and lose this pass's
 * addition instead. There is nothing to read now.
 *
 * Both matter past tidiness. `spentSince` and `anthropicCallsSince` sum these
 * columns to enforce the day's dollar and model-call ceilings, so a lost write
 * under-reports the day - and the busier the day, the more overlap there is to
 * lose. That is the one direction a ceiling must not fail in.
 *
 * Never throws, and answers whether the spend is on the row: both callers run
 * it on a path that is already ending, one of them inside a catch, and turning
 * a lost bill into a second error would replace a recorded failure with an
 * unhandled one. A false is logged, and the caller's catch gets one more go at
 * it.
 */
/**
 * A write whose failure is the end of the scan, with one retry and a log that
 * names what was lost.
 *
 * `c68db3b` swept the reads that answered as facts. These are the same defect
 * facing the other way: a PostgREST write returns its failure in `error` rather
 * than throwing, so an update whose result is discarded cannot be told from one
 * that landed - and the four that end a pass are the ones where that is not a
 * cosmetic difference.
 *
 * A scan whose `status: "complete"` write is lost has done every read, paid for
 * every one of them and stored every answer, and says `running` for ever. The
 * screen waits six minutes and then honestly sends the visitor back to confirm
 * to run it again - so a single dropped write turns a finished scan into a
 * second full scan, billed again, for a result already sitting in the table.
 *
 * The gated pass is worse, because there is no second run to fall back on. Its
 * claim is `.eq("gated_status", "queued")`, so a row left at `running` can never
 * be picked up again by anything - and that is the pass somebody gave an email
 * address for.
 *
 * Retried once because the failure this is most likely to see is a blip on a
 * single statement rather than a database that has gone away, and the whole
 * cost of the scan is already spent by the time we get here: one more attempt is
 * the cheapest thing in this function by several orders of magnitude. Logged at
 * `error` rather than `warn` when both attempts fail, because unlike everything
 * else in this file that degrades, this one strands a visitor.
 *
 * Never throws. Both callers are already at an exit and one of them is a catch.
 */
async function endWrite(
  scanId: string,
  what: string,
  run: () => PromiseLike<{ error: { message: string } | null }>,
): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { error } = await run();
      if (!error) return;
      if (attempt === 2) {
        console.error(
          `[scan] could not write ${what} for ${scanId} after two attempts, so the row is ` +
            `stuck where the pass left it: ${error.message}`,
        );
      }
    } catch (err) {
      if (attempt === 2) {
        console.error(
          `[scan] could not write ${what} for ${scanId} after two attempts, so the row is ` +
            `stuck where the pass left it: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}

async function billSpend(scanId: string, spend: Spend): Promise<boolean> {
  // Nothing billed, nothing to record - and a round trip to add zero is still a
  // round trip that can fail and warn about it.
  if (!spend.dfsCalls && !spend.dfsCost && !spend.anthropicCalls) return true;
  try {
    const { data, error } = await supabaseAdmin().rpc("note_scan_spend", {
      p_scan: scanId,
      p_dfs_calls: spend.dfsCalls,
      p_dfs_cost: spend.dfsCost,
      p_anthropic_calls: spend.anthropicCalls,
    });
    if (error) throw new Error(error.message);
    // The function updates by primary key and returns what it wrote, so an
    // empty set means no such scan - nothing was billed, and reporting that as
    // recorded would be the under-report this function exists to stop.
    if (!Array.isArray(data) || !data.length) throw new Error("no scan row matched");
    return true;
  } catch (err) {
    console.warn(
      `[scan] could not bill ${spend.dfsCalls} read(s), $${spend.dfsCost} and ` +
        `${spend.anthropicCalls} model call(s) onto ${scanId}, so the day's ceilings are ` +
        `low by that much: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
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
  /** Written into per phase. See Timings. */
  timings: Timings;
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
  const { scanId, spend, domain, brand, topic, positioning, market, engines, questions, checkDeadline, onSources, remainingMs, timings } =
    input;

  // Every question against every engine, flattened so one queue paces the lot.
  const jobs = questions.flatMap((q) => engines.map((engine) => ({ q, engine })));

  const answers = await timed(timings, "reading", () =>
    mapWithConcurrency(jobs, CONCURRENCY, async ({ q, engine }): Promise<Answer> => {
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
    }),
  );

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
  //
  // A rank that fails to store is a blank cell on the report rather than a wrong
  // one, so this does not stop the scan - but the blank is indistinguishable
  // from a question the subject does not rank for at all, which is a real
  // finding, so the difference has to exist somewhere and the log is it.
  for (const a of answers) {
    if (a.engine !== "google_aio" || a.googleRank === undefined) continue;
    const { error: rankErr } = await db
      .from("scan_questions")
      .update({ google_rank: a.googleRank })
      .eq("id", a.questionId);
    if (rankErr) {
      console.warn(
        `[scan] could not store the Google rank for question ${a.questionId}: ${rankErr.message}`,
      );
    }
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
   * one left rather than replacing it. Every reader dedupes them on
   * (source_domain, question_id, engine) - scan_teaser selects distinct,
   * scan_source_coverage counts distinct source_domain, buildUnlockPayload
   * keys a counted set, deriveOpportunities keys seenAnswer, and the campaign
   * reading keys countCitedDomains - so no count doubles.
   *
   * That sentence named three readers as though they were all of them and was
   * wrong on 20 Sep: the campaign reading counted every physical row, so a
   * retried reading reported each source cited twice as often as it was and
   * sorted the table on the doubled number. It dedupes now. Anything added
   * that reads this table has to key on that triple or it inherits the same
   * bug - the table cannot enforce it, because it has no unique constraint.
   *
   * What does survive is a source the abandoned read cited and the current
   * answers do not, which is why this is a question in blocked.md rather than
   * a delete taken here: clearing a scan own rows is still a delete, and that
   * line is Danny to draw.
   */
  if (citations.length) {
    const { error: cErr } = await db.from("scan_citations").insert(citations);
    if (cErr) throw new Error(`could not store the sources: ${cErr.message}`);
  }

  /**
   * Source classification, started here and awaited at the foot of this
   * function - Danny, 20 Sep 12:10, item 3.
   *
   * It ran after `readAndStore` returned, which put it fourth in a line behind
   * `extractBrands` and `classifyBrands`. It has nothing to do with either: its
   * whole input is the citation rows, and those are in the database on the line
   * above. It was waiting on brand work for no reason, inside the phase the
   * progress bar holds at 85%.
   *
   * `classifyBrands` genuinely waits for every `extractBrands` - it judges the
   * whole name set in one call so a name cannot be a competitor on one engine
   * and not another - so that dependency stays. This one was never real.
   *
   * **The catch is attached here, not at the await.** A promise that rejects
   * while nothing is awaiting it is an unhandled rejection, which on this
   * runtime can take the process with it - so the never-fatal wrapper has to be
   * on the promise from the moment it exists, not on the `await` two hundred
   * lines below. It is the same never-fatal this had in `runScan`, moved with
   * the call: source kinds are a column, not a reason to lose a paid scan.
   */
  const sourceCalls = { calls: 0 };
  const sourceKinds = classifySources(scanId, sourceCalls).then(
    () => null,
    (err: unknown) => (err instanceof Error ? err.message : String(err)),
  );

  // One brand extraction per engine, so the leaderboard reads per engine as
  // well as overall. Engines that answered nothing are skipped rather than
  // recorded as a zero.
  const subjectKey = brandKey(brand);

  // One extraction per engine, run together. Serially this was four Anthropic
  // round trips bolted onto the end of every scan, all of them independent.
  const extractions = await timed(timings, "extract", () =>
    Promise.all(
      engines.map(async (engine) => {
        const blocks = answers
          .filter((a) => a.engine === engine && a.answered)
          .map((a) => a.prose)
          .filter(Boolean);
        if (!blocks.length) return null;
        const out = await extractBrands(blocks, { topic, brand });
        return { engine, extracted: out.brands, calls: out.calls, failedBatches: out.failedBatches };
      }),
    ),
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
  /**
   * The spellings this scan has already stored, so a second write cannot
   * introduce a second one. See displayNamesFor for what that costs when it
   * does - the unique key on scan_brands carries the spelling, so the row is
   * inserted beside the first rather than replacing it.
   *
   * Never fatal, and the direction is the same one the extraction and the
   * judgement above it already take: every engine read on this scan is paid for
   * by the time we get here, so a failed read falls back to picking from this
   * pass alone - which is exactly what happened before this existed - rather
   * than throwing all of it away. Logged, because that fallback is the case
   * that can split a leaderboard row and nothing else would say so.
   */
  let storedNames: string[] = [];
  if (variants.size) {
    const { data: priorBrands, error: priorErr } = await db
      .from("scan_brands")
      .select("brand")
      .eq("scan_id", scanId)
      .eq("is_subject", false);
    if (priorErr) {
      console.warn(
        `[scan] could not read the spellings already on ${scanId}, so this pass picks its own: ${priorErr.message}`,
      );
    } else {
      storedNames = (priorBrands ?? []).map((r) => r.brand as string);
    }
  }
  const displayFor = displayNamesFor(variants, storedNames);

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
    const judged = await timed(timings, "classify", () =>
      classifyBrands({ topic, brand, positioning, names: [...displayFor.values()] }),
    );
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
  /**
   * The source classification joins back here, having run alongside everything
   * above rather than after it.
   *
   * Billed whatever the outcome. `classifySources` stores its rows last and
   * throws if that write fails, so a count read off the return value was lost
   * exactly when the failure was swallowed - calls made, paid for, and
   * invisible to the day ceiling. The counter is mutated in place for that
   * reason and is read here rather than from a resolved value.
   */
  const sourceErr = await timed(timings, "sources", () => sourceKinds);
  spend.anthropicCalls += sourceCalls.calls;
  if (sourceErr) console.warn(`[scan] source kinds skipped for ${scanId}: ${sourceErr}`);

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

  // Same rule, for time: written on whichever exit this pass takes, so a scan
  // that failed still says which phase it was in when it did.
  const timings: Timings = {};
  const runStartedAt = Date.now();

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
    // Deduped, not just filtered. The job list below is
    // `questions.flatMap(q => engines.map(...))`, so a name that appears twice
    // on this row asks every question twice and pays twice for one answer.
    // `settings-merge.ts` stops a repeat reaching a new row; this is for rows
    // already written, and costs a Set either way.
    const engines = [...new Set((scan.engines ?? []).filter(isEngine))];
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
      .update({ status: "running", step: STEP.questions, started_at: new Date().toISOString() })
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
        // Bound outside the closure: `scan.topic` is narrowed to string by the
        // throw at the top of this function, and that narrowing does not
        // survive into a callback.
        const confirmedTopic = scan.topic;
        generated = await timed(timings, "questions", () =>
          generateQuestions({
            topic: confirmedTopic,
            topicVariants: scan.topic_variants ?? [],
            market,
            brand,
            positioning: scan.positioning,
          }, qBilled),
        );
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
    // A lost step marker is not a lost scan - the run carries on and finishes.
    // What it costs is the progress screen, which sits on the previous step for
    // the whole of the longest part of the run and so reads as a stall. Warned
    // rather than retried: it is cosmetic per scan, but every scan going quiet
    // at the same step is a signal, and a discarded error makes that invisible.
    const { error: stepErr } = await db.from("scans").update({ step: STEP.reading }).eq("id", scanId);
    if (stepErr) console.warn(`[scan] could not set the reading step for ${scanId}: ${stepErr.message}`);
    // --- Step 3: "Finding the sources they cited" ---
    // readAndStore raises this itself, the moment the reads are in and the
    // citation work starts. Setting it here would be a lie: the reads are the
    // long part and the screen would show the last step for the whole of it.
    const read = await readAndStore({
      timings,
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
        const { error: srcStepErr } = await db
          .from("scans")
          .update({ step: STEP.sources })
          .eq("id", scanId);
        if (srcStepErr) {
          console.warn(`[scan] could not set the sources step for ${scanId}: ${srcStepErr.message}`);
        }
      },
    });

    /**
     * The search volume step was here, and it came out on 20 September 2026 on
     * Danny's instruction: one DataForSEO call for the whole question set, plus
     * a write per question into `scan_questions.search_volume`.
     *
     * It was removed for time rather than for money. It sat inside `STEP.sources`
     * - the phase the progress bar holds at 85% - and it is a serial round trip
     * to a third party plus one `update` per question, all of it between the
     * engine reads finishing and the report being ready, for a number nothing on
     * the free result leads with.
     *
     * **The column stays.** Dropping it is destructive and is on the absolute
     * list in AGENTS.md; it is also the honest thing to do, because rows written
     * before today carry real measurements and a dropped column would turn those
     * into nothing while a kept one lets a reader see they stopped. Nothing
     * writes it from here on, so `search_volume` is null on every scan after
     * this commit and populated on every scan before it. `scan_teaser` still
     * sums it into `ai_search_volume`, which means that figure is null for new
     * scans - every reader of it already handles null, because a question with
     * no measurable volume always could return one.
     *
     * `request-shape.test.mts` holds the removal the way the engine-count sweep
     * holds its own: a removal rots back in, so the assertion is that nothing in
     * the pipeline calls this endpoint again, not merely that the lines are gone.
     */
    checkDeadline();

    // What kind of site each source is - competitor, review site, somewhere an
    // article could be placed - no longer runs here. It moved inside
    // readAndStore on 20 Sep 2026, started the moment the citations it reads
    // are stored and awaited at the end, so it overlaps the brand chain instead
    // of queueing behind it. Billing and the never-fatal wrapper moved with it.

    // Billed before the status is written, not with it. They are two statements
    // now that the addition happens in the database, and the order decides what
    // survives a process that dies between them: spend first leaves a bill
    // recorded against a scan still showing as running, which the day ceilings
    // read correctly; status first leaves a complete scan that cost nothing,
    // which is the direction a ceiling must not fail in.
    spendPersisted = await billSpend(scanId, spend);

    await endWrite(scanId, "the completed status", () =>
      db
        .from("scans")
        .update({
          status: "complete",
          step: null,
          completed_at: new Date().toISOString(),
          engines_answered: read.answered,
          leaderboard_partial: read.leaderboardPartial,
          step_ms: sealTimings(timings, runStartedAt),
        })
        .eq("id", scanId),
    );
  } catch (err) {
    const message = describeAnthropicError(err);
    // The guard stops a throw raised after the bill above from billing twice,
    // and a bill that failed up there gets one more attempt here.
    if (!spendPersisted) await billSpend(scanId, spend);
    // If this one is lost the scan says running rather than failed, so the
    // message describing what went wrong never reaches the screen that is
    // waiting to show it.
    //
    // `step_ms` rides with it rather than being written separately: the phases
    // that did finish are what you want on exactly the runs that did not, and a
    // second update here is a second thing that can be the one that is lost.
    await endWrite(scanId, "the failed status", () =>
      supabaseAdmin()
        .from("scans")
        .update({
          status: "failed",
          step: null,
          error: message.slice(0, 500),
          step_ms: sealTimings(timings, runStartedAt),
        })
        .eq("id", scanId),
    );
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

  // This pass re-asks every question on every gated engine, so a failure part
  // way through can be dozens of reads that were paid for. Accumulated here
  // and written on the way out through either exit.
  //
  // Not "two more engines", which is what this said until the count drifted.
  // `GATED_ENGINES` is empty in this tree and `app_settings.scan_engines_gated`
  // overrides it at runtime, so the size of this pass is a row nothing here can
  // read - see docs/blocked.md 28. `unlock.ts` and `spend.ts` state the same
  // fact derived; this was the one copy that typed it.
  const spend: Spend = { dfsCalls: 0, dfsCost: 0, anthropicCalls: 0 };
  let spendPersisted = false;
  // The gated pass times itself into its own map and does not write it: one
  // scans row would otherwise carry two runs' phases under one set of keys,
  // and the second would silently overwrite the first. What it is for today is
  // the log line at the end of this function.
  const timings: Timings = {};
  const runStartedAt = Date.now();

  try {
    const { data: scan, error } = await db
      .from("scans")
      .select("id, domain, brand_name, positioning, topic, topic_variants, market, engines, gated_engines")
      .eq("id", scanId)
      .single<ScanRow>();
    if (error || !scan) throw new Error(`scan ${scanId} not found`);
    if (!scan.market) throw new Error("the market was never confirmed");

    // Deduped for the same reason as the free pass above, and this is the
    // expensive one: every question again, on every name in this list.
    const engines = [...new Set((scan.gated_engines ?? []).filter(isEngine))];
    if (!engines.length) {
      // Nothing to run, but the row still has to say so. Lost, it leaves the
      // gated pass at running for ever with no work left to move it, and the
      // screen tells somebody who gave an address that engines are still going.
      await endWrite(scanId, "the completed gated status", () =>
        db.from("scans").update({ gated_status: "complete" }).eq("id", scanId),
      );
      return;
    }

    /**
     * A read that failed is not a free pass that left no questions.
     *
     * The error was discarded, so a database that did not answer arrived here
     * as an empty list and was reported as "the free pass left no questions to
     * re-ask" - a sentence about a scan whose questions are sitting on the
     * table, written into `gated_error` by the catch below. It is the same read
     * as the free pass's confirmed-questions one a few hundred lines up, which
     * `c68db3b` fixed.
     *
     * This used to close "and rendered on the report screen", which stopped
     * being true when `api/scan/[token]/status/route.ts` took both error
     * columns out of the poll - nothing selects `gated_error` anywhere in the
     * tree today. Corrected here rather than left, because the same species
     * one column over is what `coverage/reading-error.ts` is about: a comment
     * naming a reader that does not exist is how a reader that does exist goes
     * unnoticed. The sentence still matters - it is what the operator reads.
     *
     * This one was not missed by that sweep - it was excused by it, with an
     * entry in `reads.test.mts` reading "throws on the next line either way".
     * That is true of the control flow and was the wrong question: both
     * branches stopping is not the same as both branches being right, and what
     * the two throws SAY differs by a fact.
     *
     * It matters more here than it did there, because this state is terminal:
     * the gated claim is `.eq("gated_status", "queued")`, so nothing anywhere
     * can pick the row up once the catch writes `failed`. A blip on this one
     * read ends the pass somebody gave an email address for, and leaves behind
     * a reason that sends whoever reads it to look at a question set that is
     * not the problem.
     */
    const { data: questionRows, error: questionsErr } = await db
      .from("scan_questions")
      .select("id, idx, question")
      .eq("scan_id", scanId)
      .order("idx", { ascending: true });
    if (questionsErr) {
      throw new Error(`could not read the questions to re-ask: ${questionsErr.message}`);
    }
    if (!questionRows?.length) throw new Error("the free pass left no questions to re-ask");

    // The same claim as the free pass, and for the same reason. The unlock path
    // claims queued before it gets here, so this is the second lock rather than
    // the first - but a gated pass re-asks every question on every gated
    // engine, so a duplicate is dozens of reads paid for twice.
    //
    // The claim is also where the pass gets dated. gated_started_at is what
    // makes this pass's spend visible to both day ceilings while it is still
    // running rather than only once gated_completed_at lands - see activeWindow
    // in spend.ts. Stamping it here rather than in a second statement is the
    // point: this update is the compare-and-swap that already guarantees one
    // winner, so the date is written exactly once per pass and a duplicate that
    // loses the claim cannot re-date the row.
    const { data: gatedClaimed, error: gatedClaimErr } = await db
      .from("scans")
      .update({ gated_status: "running", gated_started_at: new Date().toISOString() })
      .eq("id", scanId)
      .eq("gated_status", "queued")
      .select("id");
    if (gatedClaimErr) throw new Error(`could not claim the gated pass for ${scanId}: ${gatedClaimErr.message}`);
    if (!gatedClaimed?.length) {
      console.warn(`[scan] ${scanId} gated pass is not queued, so this pass is a duplicate and stops here`);
      return;
    }

    const read = await readAndStore({
      timings,
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

    /**
     * The second pass cites sources the first did not, and they are labelled
     * inside `readAndStore` above rather than here.
     *
     * This was a `classifySources(scanId, ...)` of its own. When that call moved
     * into `readAndStore` on 20 September 2026 - started the moment the
     * citations are stored, so it overlaps the brand chain - this one became a
     * second run of the same work over the same rows, on the pass `spend.ts`
     * calls the biggest single spender in the system. Not a wrong label: a
     * duplicate paid model call per gated pass, absorbed by a never-fatal catch
     * and visible only as a number on the day ceiling.
     *
     * Worth saying plainly because of where it was found: the move was made for
     * the free pass and this is the other caller, four hundred lines away, and
     * nothing about the edit pointed at it. The timing log below is the reason
     * to look at both callers of anything this function starts.
     */

    console.info(
      `[scan] ${scanId} gated pass timings ${JSON.stringify(sealTimings(timings, runStartedAt))}`,
    );

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

    // Before the status write, for the reason given on the free pass's call.
    spendPersisted = await billSpend(scanId, spend);

    await endWrite(scanId, "the completed gated status", () =>
      db
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
        })
        .eq("id", scanId),
    );
  } catch (err) {
    const message = describeAnthropicError(err);
    // What this pass had already paid for when it failed. Without it a failed
    // gated pass was free as far as the cap could see, and this is the
    // expensive pass - every question again, on every gated engine. The guard
    // stops a throw raised after the bill above from billing the day twice.
    if (!spendPersisted) await billSpend(scanId, spend);
    await endWrite(scanId, "the failed gated status", () =>
      supabaseAdmin()
        .from("scans")
        .update({
          gated_status: "failed",
          gated_error: message.slice(0, 500),
        })
        .eq("id", scanId),
    );
  }
}

export { QUESTION_COUNT };
