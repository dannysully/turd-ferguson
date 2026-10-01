import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * How long a domain's free reading lasts before another may be started.
 *
 * Seven days (Danny, 1 Oct 2026, danny.md line 170; was thirty, on the
 * argument that a campaign takes time to land and a second free reading a
 * week later measures the lag rather than the campaign - his call overrides
 * it). The IP ceiling is unchanged. Named here
 * rather than typed into the sentence that refuses, so the number the visitor
 * reads and the number enforced cannot come apart.
 *
 * Moved out of /api/coverage-check on 1 Oct 2026 (R140), because step 2's
 * draft route checks the same ceiling as soon as it knows the client domain,
 * and two copies of it would be two ceilings.
 */
export const FREE_RUN_DAYS = 7;

/**
 * The refusal when `domain` already had a free reading inside FREE_RUN_DAYS,
 * or null. A failed read lets the visitor through, logged: refusing a
 * benchmark because our own ceiling query broke would be charging the visitor
 * for our outage, and the IP ceiling is still standing.
 */
export async function recentReadingRefusal(domain: string): Promise<string | null> {
  const since = new Date(Date.now() - FREE_RUN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin()
    .from("campaigns")
    .select("created_at")
    .eq("domain", domain)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[coverage] could not check the per-domain ceiling: " + error.message);
    return null;
  }
  if (!data) return null;
  return recentReadingLine(domain);
}

/**
 * The refusal sentence on its own, so the domain route's local fixture draws
 * the same words rather than a copy of them.
 */
export function recentReadingLine(domain: string): string {
  return (
    `We have already taken a free reading for ${domain} in the last ${FREE_RUN_DAYS} days. ` +
    "Open that reading's link to run it again, or get in touch and we will take another."
  );
}
