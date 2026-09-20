import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { type Settings, SETTINGS_FALLBACK, mergeSettings } from "./settings-merge.ts";

/**
 * The network half. Everything that decides what a stored value is worth lives
 * in `./settings-merge`, which imports nothing that needs a credential and so
 * can be run by a test - see the header there for why it moved.
 */
export { SETTINGS_FALLBACK };
export type { Settings };

/**
 * Read fresh on every call, deliberately. Acceptance criterion 6 is that
 * flipping scans_enabled stops new scans within one request, so this must not
 * be cached in module scope or in the Next data cache.
 */
export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin().from("app_settings").select("key, value");
  if (error) throw new Error(`could not read app_settings: ${error.message}`);

  return mergeSettings((data ?? []) as Array<{ key: string; value: unknown }>, (message) =>
    console.warn("[scan] " + message),
  );
}
