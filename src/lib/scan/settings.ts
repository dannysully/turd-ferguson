import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type Settings = {
  scans_enabled: boolean;
  daily_scan_cap: number;
  ip_scans_per_day: number;
  domain_cache_days: number;
};

const FALLBACK: Settings = {
  scans_enabled: true,
  daily_scan_cap: 200,
  ip_scans_per_day: 3,
  domain_cache_days: 30,
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
    if (key in out) {
      // jsonb comes back already parsed: true, 200, and so on.
      (out as Record<string, unknown>)[key] = row.value;
    }
  }
  return out;
}
