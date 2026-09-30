import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { type UpsellMode, upsellMode } from "./ask.ts";
import { type PromptCta, hiddenCtas, hiddenSince } from "./upgrade-prompts.ts";

/**
 * What the upgrade prompts need beyond the page's figures (T11 part 4, 30 Sep
 * 2026): the account's upsell mode and the ctas this member hid in the last
 * 30 days. The mode comes through the client row's own join, so no account id
 * is read into the page. A read that fails answers `off`: no prompt is the
 * safe miss, and the warning says why.
 */
export type UpgradeContext = { mode: UpsellMode; hidden: Set<PromptCta> };

export async function loadUpgradeContext(clientId: string, email: string, today: string): Promise<UpgradeContext> {
  const db = supabaseAdmin();
  const [{ data: row, error: rowErr }, { data: events, error: eventsErr }] = await Promise.all([
    db.from("client_domains").select("accounts(upsell_mode)").eq("id", clientId).maybeSingle(),
    db.from("cta_events").select("cta, action, created_at").eq("client_domain_id", clientId).eq("member_email", email).eq("action", "hidden").gte("created_at", hiddenSince(today)),
  ]);
  if (rowErr || !row || eventsErr) {
    console.warn(`[app] upgrade prompts off: ${rowErr?.message ?? eventsErr?.message ?? "no client row"}`);
    return { mode: "off", hidden: new Set() };
  }
  const account = (row as { accounts: { upsell_mode: unknown } | { upsell_mode: unknown }[] | null }).accounts;
  const mode = upsellMode(Array.isArray(account) ? account[0]?.upsell_mode : account?.upsell_mode);
  return { mode, hidden: hiddenCtas((events ?? []) as { cta: string; action: string; created_at: string }[], today) };
}
