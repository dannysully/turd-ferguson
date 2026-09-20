import "server-only";

import type { Market } from "@/lib/scan/domain";
import type { Engine } from "@/lib/scan/engines";
import { supabaseAdmin } from "@/lib/supabase/admin";

import type { CoverageRow } from "./csv";
import { coveragePrompts } from "./prompts";

/**
 * Starting a campaign benchmark: the campaign, its coverage list, and the first
 * reading.
 *
 * ## A reading is a scans row, and that is the whole design
 *
 * `20260920010000_campaign_benchmark.sql` argues this at length and the code
 * here is what it buys. Nothing in this file reads an engine, counts a
 * citation, bills a call or enforces a ceiling, because `runScan` already does
 * every one of those against a scans row - and Danny's answers 4 and 5 pointed
 * the benchmark at the scan's own engine set and the scan's own limits on
 * purpose. What is left is four inserts.
 *
 * The one thing that makes it a benchmark rather than a scan is the question
 * set. `runScan` asks the row what questions it already has and generates a set
 * only when it finds none - the same door the confirm screen goes through when
 * a visitor prunes their questions. So the five fixed prompts are written here,
 * before the row is queued, and `runScan` reads them and asks those.
 *
 * ## The order of the four writes is the error handling
 *
 * campaign, coverage, scan at `pending_topic`, questions, and only then
 * `queued`. A benchmark that ran the generated fourteen-question set instead of
 * its own five would be wrong in the quietest possible way: it would finish, it
 * would cost four times as much, it would read as a result, and the promise the
 * whole feature rests on - the same five questions again after the campaign -
 * would be broken with nothing to show it. Inserting the questions while the
 * row is still `pending_topic` means a failure there leaves a row no pass will
 * ever claim, because `runScan` claims on `status = 'queued'`.
 *
 * Nothing is deleted on a failed step. An orphaned campaign row costs a row and
 * is counted against the caller's allowance by `checkCeilings`, which is the
 * right outcome anyway; deleting live rows is not ours to do.
 */

export class BenchmarkStoreError extends Error {
  /** Which of the four writes failed. Goes to the log, never to the visitor. */
  readonly step: string;
  constructor(step: string, message: string) {
    super(message);
    this.step = step;
    this.name = "BenchmarkStoreError";
  }
}

export type BenchmarkRequest = {
  brand: string;
  domain: string;
  topic: string;
  /** Optional. Without it the category question asks its broader form. */
  segment: string | null;
  market: Market;
  ipHash: string;
  /** Frozen onto the reading, exactly as a free scan freezes its own. */
  engines: Engine[];
  coverage: CoverageRow[];
};

export type BenchmarkStart = {
  /** The credential the reading is read back by. */
  token: string;
  campaignId: string;
  /** For the caller's `after(() => runScan(scanId))`. */
  scanId: string;
  /** How many placements were stored, so the page can say it without a re-read. */
  coverageStored: number;
};

export async function startBenchmark(req: BenchmarkRequest): Promise<BenchmarkStart> {
  const db = supabaseAdmin();

  const { data: campaign, error: campaignErr } = await db
    .from("campaigns")
    .insert({
      brand: req.brand,
      domain: req.domain,
      topic: req.topic,
      segment: req.segment,
      market: req.market,
      ip_hash: req.ipHash,
    })
    .select("id, public_token")
    .single();
  if (campaignErr || !campaign) {
    throw new BenchmarkStoreError("campaign", campaignErr?.message ?? "no campaign row came back");
  }

  /**
   * The coverage list, and a failure here is fatal rather than skipped.
   *
   * The reading's second finding is "which of the cited sources were yours",
   * and it is read off these rows. A benchmark that lost them would render
   * "none of the sources cited were from your coverage" to somebody who had
   * just uploaded a list of twenty placements - a false statement about their
   * campaign, produced by our failed insert, and indistinguishable on the page
   * from the real finding. Refusing before anything is paid for is the only
   * honest end.
   */
  if (req.coverage.length) {
    const { error: coverageErr } = await db.from("campaign_coverage").insert(
      req.coverage.map((row) => ({
        campaign_id: campaign.id,
        url: row.url,
        source_domain: row.source_domain,
      })),
    );
    if (coverageErr) throw new BenchmarkStoreError("coverage", coverageErr.message);
  }

  /**
   * The reading, born at `pending_topic` so that nothing can run it until its
   * questions are on the table. See the header: this is the step that stops a
   * benchmark quietly asking the generated set.
   */
  const { data: scan, error: scanErr } = await db
    .from("scans")
    .insert({
      campaign_id: campaign.id,
      domain: req.domain,
      brand_name: req.brand,
      topic: req.topic,
      market: req.market,
      status: "pending_topic",
      ip_hash: req.ipHash,
      engines: req.engines,
      /**
       * Empty, whatever the settings say. The gated pass is what an email
       * address buys on a free scan, and a benchmark takes no address - there
       * is no unlock path to this row, so a gated engine list on it would be a
       * promise with nothing behind it and an `engines` figure the reading
       * cannot stand behind.
       */
      gated_engines: [],
    })
    .select("id")
    .single();
  if (scanErr || !scan) {
    throw new BenchmarkStoreError("reading", scanErr?.message ?? "no scan row came back");
  }

  const prompts = coveragePrompts({
    brand: req.brand,
    topic: req.topic,
    segment: req.segment ?? undefined,
  });
  const { error: qErr } = await db.from("scan_questions").insert(
    prompts.map((p, idx) => ({
      scan_id: scan.id,
      idx,
      question: p.question,
      /**
       * The template's own axis, lowercased, rather than one of the scan's
       * generated kinds. `kind` is free text - the confirm route already files
       * a question it did not write as "custom" for the same reason - and
       * labelling "what has [brand] announced recently" as a `positioning`
       * question would file it under a heading it does not belong to.
       */
      kind: p.kind.toLowerCase(),
    })),
  );
  if (qErr) throw new BenchmarkStoreError("questions", qErr.message);

  /**
   * Queued last, and with `.select()` on it, because PostgREST answers an
   * update that matched no rows with a 2xx - so without it a row that never
   * left `pending_topic` and one that is now ready to run are the same result,
   * and the caller would start a pass that claims nothing and returns silently.
   */
  const { data: queued, error: queueErr } = await db
    .from("scans")
    .update({ status: "queued", queued_at: new Date().toISOString() })
    .eq("id", scan.id)
    .eq("status", "pending_topic")
    .select("id");
  if (queueErr || !queued?.length) {
    throw new BenchmarkStoreError("queue", queueErr?.message ?? "the reading did not leave pending_topic");
  }

  return {
    token: campaign.public_token as string,
    campaignId: campaign.id as string,
    scanId: scan.id as string,
    coverageStored: req.coverage.length,
  };
}
