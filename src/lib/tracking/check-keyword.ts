import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { readKeywordIntents, readKeywordVolumes } from "@/lib/scan/dataforseo";
import { MARKETS, type Market } from "@/lib/scan/domain";
import { pickClusterKeyword } from "@/lib/scan/target-keyword";
import { type KeywordCheck, checkVerdict, precheckKeyword, refused } from "@/lib/tracking/add-cluster";

/**
 * "Check keyword" on the Clusters page - BRIEF-3 T6 part 3b (30 Sep 2026;
 * boards-3/Questions.dc.html). The one paid step of adding a cluster: two
 * DataForSEO reads, volume and intent, for the one typed keyword - C1's
 * check without its candidates call, since the member typed the candidate.
 *
 * Nothing is read until the free prechecks pass (add-cluster.ts), and then
 * only while this client has checked fewer than CHECKS_PER_CLIENT_PER_DAY
 * keywords today. Every paid check is counted as a `keyword_checked` row in
 * dashboard_events - ids only, never the keyword - so the count is the cap.
 */
export const CHECKS_PER_CLIENT_PER_DAY = 20;

export const CHECK_EVENT = "keyword_checked";

/** `today` is the tracking day, YYYY-MM-DD, in UTC. */
export async function checkClusterKeyword(
  db: SupabaseClient,
  p: { clientId: string; email: string; keyword: string; market: Market; tracked: readonly string[]; brands: readonly string[]; today: string },
): Promise<KeywordCheck> {
  const pre = precheckKeyword(p.keyword, { tracked: p.tracked, brands: p.brands });
  if (!pre.ok) return pre;

  const { count, error } = await db
    .from("dashboard_events")
    .select("id", { count: "exact", head: true })
    .eq("client_domain_id", p.clientId)
    .eq("event", CHECK_EVENT)
    .gte("created_at", `${p.today}T00:00:00Z`);
  // Unread is refused, never read as zero: the count is the only bound.
  if (error || count === null) return checkVerdict("read_failed", "");
  if (count >= CHECKS_PER_CLIENT_PER_DAY) return refused("capped");

  const { error: wErr } = await db.from("dashboard_events").insert({ client_domain_id: p.clientId, member_email: p.email, event: CHECK_EVENT, path: "/clusters" });
  if (wErr) return checkVerdict("read_failed", "");

  const where = `the ${MARKETS[p.market].label}`;
  try {
    const [v, i] = await Promise.all([readKeywordVolumes([pre.keyword], p.market, 20_000), readKeywordIntents([pre.keyword], 20_000)]);
    return checkVerdict(pickClusterKeyword([pre.keyword], v.volumes, i.intents), where);
  } catch (err) {
    console.warn(`[app] keyword check failed: ${err instanceof Error ? err.message : String(err)}`);
    return checkVerdict("read_failed", where);
  }
}
