import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { type OrderPick, orderKeyword } from "./order-keyword.ts";
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

/**
 * R180: the typed checkout keyword of this client's newest order, when no scan
 * was behind it (order-keyword.ts). A read only; null when there is none or the
 * read failed, so the field simply opens empty as before.
 */
export async function loadOrderKeyword(clientId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("keyword, scan_token")
    .eq("client_domain_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.warn(`[app] could not read the order keyword: ${error.message}`);
    return null;
  }
  return orderKeyword((data ?? [])[0] as OrderPick | undefined);
}
