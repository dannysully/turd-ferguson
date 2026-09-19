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
  /**
   * Whether an address must be proven before the result opens. Off until DMARC
   * is published: with it on, an email that does not arrive costs the lead and
   * the report both, where today it costs neither.
   */
  require_email_verification: boolean;
  /** How long an unclaimed scan keeps the prose the engines returned. */
  response_retention_days: number;
  /**
   * How many times one scan link may put mail in somebody inbox in a rolling
   * day. The unlock route takes an address from the caller and sends to it, so
   * without a ceiling one token is an open relay for our own branding.
   */
  unlock_emails_per_day: number;
};

export const SETTINGS_FALLBACK: Settings = {
  scans_enabled: true,
  daily_scan_cap: 200,
  ip_scans_per_day: 3,
  domain_cache_days: 30,
  scan_engines_free: [...FREE_ENGINES],
  scan_engines_gated: [...GATED_ENGINES],
  daily_cost_cap_usd: 60,
  require_email_verification: false,
  response_retention_days: 7,
  unlock_emails_per_day: 5,
};

/**
 * A stored value only replaces its default when it is the same kind of thing.
 *
 * jsonb holds whatever was typed into it, and the row is edited by hand in the
 * Supabase table editor. `false` is a boolean there and `"false"` is a string,
 * and the two look identical in the cell. Every number here survived that
 * confusion by coercion - comparing against "200" compares as 200 - but the two
 * booleans did not, and they are the two that matter:
 *
 * - `scans_enabled` as the string "false" is truthy, so the kill switch reads
 *   as on and scans keep running. That switch exists to be thrown in a hurry,
 *   by someone who will not then go and check that it took.
 * - `require_email_verification` as the string "false" turns verification *on*,
 *   which gates every report behind an email that DMARC is not published for
 *   yet.
 *
 * Both fail silently and in the expensive direction, so a value of the wrong
 * type is refused and logged rather than trusted. The engine lists are checked
 * above, element by element, and never reach this.
 */
function sameShape(value: unknown, fallback: unknown): boolean {
  if (typeof fallback === "boolean") return typeof value === "boolean";
  if (typeof fallback === "number") return typeof value === "number" && Number.isFinite(value);
  return false;
}

/**
 * Read fresh on every call, deliberately. Acceptance criterion 6 is that
 * flipping scans_enabled stops new scans within one request, so this must not
 * be cached in module scope or in the Next data cache.
 */
export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin().from("app_settings").select("key, value");
  if (error) throw new Error(`could not read app_settings: ${error.message}`);

  const out = { ...SETTINGS_FALLBACK };
  for (const row of data ?? []) {
    const key = row.key as keyof Settings;
    if (!(key in out)) continue;

    if (key === "scan_engines_free" || key === "scan_engines_gated") {
      // An unrecognised engine name is dropped rather than trusted: a typo in
      // this row must not send a request to an endpoint that does not exist.
      const list = Array.isArray(row.value) ? row.value.filter(isEngine) : [];
      // The gated set may legitimately be empty; the free set may not.
      out[key] = list.length || key === "scan_engines_gated" ? list : SETTINGS_FALLBACK[key];
      continue;
    }
    // jsonb comes back already parsed: true, 200, and so on. Parsed is not the
    // same as the right kind of thing, which is what sameShape is for.
    if (!sameShape(row.value, SETTINGS_FALLBACK[key])) {
      console.warn(
        "[scan] app_settings." + key + " is " + JSON.stringify(row.value) +
          ", not a " + typeof SETTINGS_FALLBACK[key] + "; using the default",
      );
      continue;
    }
    (out as Record<string, unknown>)[key] = row.value;
  }
  return out;
}
