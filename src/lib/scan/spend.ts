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
