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
 */
export async function anthropicCallsSince(since: string): Promise<number> {
  const db = supabaseAdmin();
  const rows = await selectAll<{ anthropic_calls: number | null }>((from, to) =>
    db
      .from("scans")
      .select("anthropic_calls")
      .gte("created_at", since)
      .order("id", { ascending: true })
      .range(from, to),
  );
  return rows.reduce((total, r) => total + Number(r.anthropic_calls ?? 0), 0);
}
