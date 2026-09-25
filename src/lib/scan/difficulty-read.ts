import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * The stored difficulty scores for a scan's sources, keyed by domain.
 *
 * Read on its own rather than added to the `scan_sources` selects in
 * `unlock.ts`, so a database without the 20260925000000 columns still serves
 * the whole report - it only loses the dials. An error is logged and answered
 * with an empty map, which the report renders as "Not scored".
 */
export async function readDifficulty(scanId: string): Promise<Map<string, { difficulty: number; basis: string | null }>> {
  const out = new Map<string, { difficulty: number; basis: string | null }>();
  const { data, error } = await supabaseAdmin()
    .from("scan_sources")
    .select("domain, difficulty, difficulty_basis")
    .eq("scan_id", scanId)
    .not("difficulty", "is", null)
    .limit(500);
  if (error) {
    console.warn(`[scan] placement difficulty unread for ${scanId}: ${error.message}`);
    return out;
  }
  for (const r of (data ?? []) as { domain: string; difficulty: number | null; difficulty_basis: string | null }[]) {
    if (typeof r.difficulty === "number") out.set(r.domain, { difficulty: r.difficulty, basis: r.difficulty_basis });
  }
  return out;
}
