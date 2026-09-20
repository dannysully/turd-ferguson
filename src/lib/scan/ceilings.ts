import "server-only";

import { type CeilingOpts, type CeilingReads, type Count, type Refusal, decideCeilings } from "./ceilings-decide.ts";
import { anthropicCallsSince, spentSince } from "./spend";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * The ceilings every paid pass passes through, in one place.
 *
 * These were written inline in /api/scan/start and they are moved here, not
 * copied, for a reason the campaign benchmark migration argues at length: a
 * reading IS a scan row, so it inherits the scan's ceilings. A second route
 * with its own transcription of them would be a second set to keep in step -
 * and the day this repo spent finding holes in the first set is the argument
 * against having two. Every hole found since is in this file, once:
 *
 *  - a ceiling whose read failed used to be a ceiling that was simply off;
 *  - the daily dollar cap cannot see a model call, so calls have their own;
 *  - a pass that died still spent, so spend ceilings count failures;
 *  - a visitor's own allowance does not, because our bug is not their scan.
 *
 * ## This file is now the reads, and `ceilings-decide.ts` is the decision
 *
 * Split on 20 September 2026, behaviour unchanged, for the reason written at
 * the top of that file: `server-only` plus `@/lib/supabase/admin` meant Node's
 * runner could not load this module, so the one function guarding every dollar
 * the site spends had no executor at all. What is left here is five queries and
 * the mapping from a PostgREST answer to what the decision layer reads:
 *
 *  - a count comes back as a number, or as the reason it did not, when `error`
 *    is set. `?? 0` on a failed count is what said "nothing has run today" as a
 *    fact whenever the read did not answer, and the cap it guarded was simply
 *    off for as long as that lasted;
 *  - `spentSince` and `anthropicCallsSince` throw on a failed read, so they are
 *    passed through untouched. That reaches the route as a 500, which is also a
 *    refusal.
 *
 * Nothing here writes; a caller that gets null still has to do its own insert,
 * and a caller that gets a refusal has spent some reads and no money.
 */
export type { CeilingOpts, Refusal };

export async function checkCeilings(
  opts: CeilingOpts & {
    /** The start of the rolling day, as an ISO string. */
    since: string;
    /** The caller, already hashed. See hashIp - a raw address never reaches here. */
    ipHash: string;
  },
): Promise<Refusal | null> {
  const { since, ipHash } = opts;
  const db = supabaseAdmin();

  /** A PostgREST head-count as the decision layer reads it: a number, or why not. */
  const counted = (res: { count: number | null; error: { message: string } | null }): Count =>
    res.error ? { failed: res.error.message } : (res.count ?? 0);

  const reads: CeilingReads = {
    async todayScans() {
      return counted(
        await db
          .from("scans")
          .select("id", { count: "exact", head: true })
          .eq("is_tracking_run", false)
          .gte("created_at", since),
      );
    },

    // Spend is capped as well as volume: adding engines changes the cost of a
    // scan by an order of magnitude, so a count alone is no longer a safe limit.
    spentToday: () => spentSince(since, { excludeTrackingRuns: true }),

    // Checked at the first door rather than inside the Anthropic client: this is
    // the cheapest place to refuse, because every model call downstream belongs
    // to a pass that started here.
    modelCallsToday: () => anthropicCallsSince(since),

    /**
     * Scans that failed are not counted, decided by Danny on 20 September 2026:
     * "If our pass failed, that is ours. Do not charge a retry against their
     * allowance." A row only reaches status 'failed' once the pipeline has
     * started and died - a domain we cannot reach is refused with a 422 before
     * any row is inserted - so every row this excludes is one of ours, not a
     * scan the visitor got the benefit of.
     */
    async ipScans() {
      return counted(
        await db
          .from("scans")
          .select("id", { count: "exact", head: true })
          .eq("ip_hash", ipHash)
          .neq("status", "failed")
          .gte("created_at", since),
      );
    },

    async ipCampaigns() {
      return counted(
        await db
          .from("campaigns")
          .select("id", { count: "exact", head: true })
          .eq("ip_hash", ipHash)
          .gte("created_at", since),
      );
    },
  };

  return decideCeilings(opts, reads, (message) => console.warn(message));
}
