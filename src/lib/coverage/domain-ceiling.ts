import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/scan/settings";

import { FREE_RUN_DAYS, decideRecentReading, recentReadingLine } from "./domain-ceiling-decide.ts";

/**
 * The network half of the per-domain ceiling. The window, the sentence and
 * the exempt list's decision live in `./domain-ceiling-decide` (R165, 1 Oct
 * 2026), where a test can run them.
 */
export { FREE_RUN_DAYS, recentReadingLine };

/**
 * The refusal when `domain` already had a free reading inside FREE_RUN_DAYS,
 * or null. A failed read lets the visitor through, logged: refusing a
 * benchmark because our own ceiling query broke would be charging the visitor
 * for our outage, and the IP ceiling is still standing. So does a failed
 * settings read, for the same reason: the exempt list is then simply empty.
 */
export async function recentReadingRefusal(domain: string): Promise<string | null> {
  let exempt: string[] = [];
  try {
    exempt = (await getSettings()).coverage_ceiling_exempt_domains;
  } catch (e) {
    console.warn("[coverage] could not read the exempt list: " + (e instanceof Error ? e.message : String(e)));
  }
  return decideRecentReading(domain, exempt, async () => {
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
    return Boolean(data);
  });
}
