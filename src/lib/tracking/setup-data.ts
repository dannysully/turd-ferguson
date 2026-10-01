import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { SETUP_CONFIRMED_EVENT } from "./setup-landing.ts";

/**
 * Whether a client's setup is confirmed (R166 part 3b): one setup_confirmed
 * row in dashboard_events, whoever wrote it. Null when the read failed, so a
 * caller can fall back rather than send a set-up client round again.
 */
export async function loadSetupConfirmed(clientId: string): Promise<boolean | null> {
  const { data, error } = await supabaseAdmin()
    .from("dashboard_events")
    .select("id")
    .eq("client_domain_id", clientId)
    .eq("event", SETUP_CONFIRMED_EVENT)
    .limit(1);
  if (error) {
    console.warn(`[app] could not read the setup state: ${error.message}`);
    return null;
  }
  return (data ?? []).length > 0;
}
