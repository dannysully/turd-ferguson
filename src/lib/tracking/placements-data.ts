import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import type { PlacementRow } from "./placement-figures.ts";

/**
 * One client's placements for the /app placements screen (R97 part 2, 30 Sep
 * 2026; BRIEF-2 T13). The columns the screen draws and nothing else: no
 * internal note, no link-check state, and there is no price column to leave
 * out. Removed rows are read so the figures can drop them in one place.
 */
export async function loadPlacements(clientId: string): Promise<(PlacementRow & { cluster_id: string })[]> {
  const { data, error } = await supabaseAdmin()
    .from("placements")
    .select("id, cluster_id, kind, url, url_key, status, scheduled_on, live_on")
    .eq("client_domain_id", clientId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`could not read placements: ${error.message}`);
  return (data ?? []) as (PlacementRow & { cluster_id: string })[];
}
