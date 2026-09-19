import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { selectAll } from "@/lib/supabase/page";

/**
 * What the scans created since `since` have cost at DataForSEO.
 *
 * Both callers used to sum an unpaged select, which PostgREST caps at 1000
 * rows without saying so. A spend cap that reads a truncated set fails open -
 * it under-reports the day, and the busier the day the further under it
 * reads, which is the one direction a cap must not fail in.
 *
 * The two callers disagree about tracking runs and that is preserved here
 * rather than quietly settled: the start route excludes them because a
 * tracking run is not a visitor's free scan, and the unlock path counts
 * everything because it is protecting the day's budget as a whole. Whether
 * that is the intended pair of denominators is a product question, and it is
 * at least visible in one function now instead of implied by two call sites.
 */
export async function spentSince(
  since: string,
  opts: { excludeTrackingRuns: boolean },
): Promise<number> {
  const db = supabaseAdmin();
  const rows = await selectAll<{ dfs_cost: number | string | null }>((from, to) => {
    const q = db.from("scans").select("dfs_cost").gte("created_at", since);
    return (opts.excludeTrackingRuns ? q.eq("is_tracking_run", false) : q)
      .order("id", { ascending: true })
      .range(from, to);
  });
  return rows.reduce((total, r) => total + Number(r.dfs_cost ?? 0), 0);
}

/**
 * Model calls billed onto the scans created since `since`.
 *
 * daily_cost_cap_usd bounds DataForSEO spend and nothing bounded Anthropic
 * spend at all. The two are not interchangeable: the engine reads are what
 * the cap was written for, but a scan also pays for a brand read, a question
 * set, a brand extraction per engine, a leaderboard judgement and a source
 * classification, and every one of those is a model call that the dollar cap
 * cannot see. A loop that spends nothing at DataForSEO can spend all day at
 * Anthropic and trip no ceiling.
 *
 * Counted in calls rather than dollars on purpose. A dollar figure here would
 * be a price per call typed into this repo, which goes stale silently and
 * reads as measured when it is guessed; a call count is what the column
 * actually holds.
 *
 * Tracking runs are included. This is the whole day's model budget rather
 * than a visitor's allowance, and a tracking run spends it like anything
 * else.
 *
 * Paged for the same reason spentSince is: PostgREST caps a select at 1000
 * rows and says so nowhere, and a ceiling that reads a truncated set
 * under-reports exactly when the day is busy enough to matter.
 *
 * Two tables, because a call does not always have a scan to belong to.
 * /api/scan/start pays for the brand read before it inserts the row that would
 * carry the cost, so an attempt that dies in between bills nothing anywhere -
 * and the failure that causes it is the repeating kind, which is precisely
 * when this ceiling is the only thing left. Those calls go to
 * model_call_debits instead and are added here. See recordModelCallDebit.
 */
export async function anthropicCallsSince(since: string): Promise<number> {
  const db = supabaseAdmin();
  const [billed, unattributed] = await Promise.all([
    selectAll<{ anthropic_calls: number | null }>((from, to) =>
      db
        .from("scans")
        .select("anthropic_calls")
        .gte("created_at", since)
        .order("id", { ascending: true })
        .range(from, to),
    ),
    selectAll<{ calls: number | null }>((from, to) =>
      db
        .from("model_call_debits")
        .select("calls")
        .gte("created_at", since)
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);
  return (
    billed.reduce((total, r) => total + Number(r.anthropic_calls ?? 0), 0) +
    unattributed.reduce((total, r) => total + Number(r.calls ?? 0), 0)
  );
}

/**
 * Record model calls that no scan row can carry.
 *
 * Called from the two exits in /api/scan/start that can happen after the brand
 * read has been paid for and before the insert lands: the read itself throwing,
 * and the insert failing. Both used to leave the calls invisible to
 * anthropicCallsSince, which is the ceiling written to stop a bad hour
 * repeating - so the worse the hour, the less of it the ceiling could see.
 *
 * Never throws. This runs on a path that is already failing and already has a
 * sentence to give the visitor; turning a lost debit into a second error would
 * replace an accurate 502 with a 500 and tell them less. A debit that does not
 * land is logged and the count is low by that much, which is the same place we
 * were before this existed.
 *
 * Nothing is written when `calls` is zero: the row would say only that a
 * request failed, which the log already says, and the check constraint on the
 * table refuses it anyway.
 */
export async function recordModelCallDebit(entry: {
  calls: number;
  reason: string;
  domain?: string;
  ipHash?: string;
}): Promise<void> {
  if (entry.calls <= 0) return;
  try {
    const { error } = await supabaseAdmin().from("model_call_debits").insert({
      calls: entry.calls,
      reason: entry.reason,
      domain: entry.domain ?? null,
      ip_hash: entry.ipHash ?? null,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.warn(
      `[scan] could not record ${entry.calls} unattributed model call(s) (${entry.reason}): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
