import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { FREE_ENGINES, GATED_ENGINES, type Engine, isEngine } from "./engines";

export type Settings = {
  scans_enabled: boolean;
  daily_scan_cap: number;
  ip_scans_per_day: number;
  domain_cache_days: number;
  /** Engines the free scan reads, before any email is given. */
  scan_engines_free: Engine[];
  /** Engines the email unlocks. Run once, after the address is captured. */
  scan_engines_gated: Engine[];
  /** Spend ceiling for a rolling day, checked before any paid call. */
  daily_cost_cap_usd: number;
};

const FALLBACK: Settings = {
  scans_enabled: true,
  daily_scan_cap: 200,
  ip_scans_per_day: 3,
  domain_cache_days: 30,
  scan_engines_free: [...FREE_ENGINES],
  scan_engines_gated: [...GATED_ENGINES],
  daily_cost_cap_usd: 60,
};

/**
 * Read fresh on every call, deliberately. Acceptance criterion 6 is that
 * flipping scans_enabled stops new scans within one request, so this must not
 * be cached in module scope or in the Next data cache.
 */
export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin().from("app_settings").select("key, value");
  if (error) throw new Error(`could not read app_settings: ${error.message}`);

  const out = { ...FALLBACK };
  for (const row of data ?? []) {
    const key = row.key as keyof Settings;
    if (!(key in out)) continue;

    if (key === "scan_engines_free" || key === "scan_engines_gated") {
      // An unrecognised engine name is dropped rather than trusted: a typo in
      // this row must not send a request to an endpoint that does not exist.
      const list = Array.isArray(row.value) ? row.value.filter(isEngine) : [];
      // The gated set may legitimately be empty; the free set may not.
      out[key] = list.length || key === "scan_engines_gated" ? list : FALLBACK[key];
      continue;
    }
    // jsonb comes back already parsed: true, 200, and so on.
    (out as Record<string, unknown>)[key] = row.value;
  }
  return out;
}
