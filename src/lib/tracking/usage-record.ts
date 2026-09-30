import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { EVENTS_PER_MEMBER_PER_DAY, type UsageEvent, usageProps } from "./usage.ts";

/**
 * Writes one dashboard usage event (BRIEF-2 T10, R98, 30 Sep 2026). Never
 * fatal: a usage row is a UX signal, so a failed write is a warning and the
 * action it rode on goes ahead. Capped per member per day, so a stuck page
 * cannot fill the table; an unread count is read as capped.
 */
export async function recordUsage(
  db: SupabaseClient,
  p: { clientId: string; email: string; event: UsageEvent; path: string | null; props?: Record<string, string>; today: string },
): Promise<boolean> {
  const { count, error } = await db
    .from("dashboard_events")
    .select("id", { count: "exact", head: true })
    .eq("member_email", p.email)
    .gte("created_at", `${p.today}T00:00:00Z`);
  if (error || count === null || count >= EVENTS_PER_MEMBER_PER_DAY) return false;
  const { error: wErr } = await db
    .from("dashboard_events")
    .insert({ client_domain_id: p.clientId, member_email: p.email, event: p.event, path: p.path, props: usageProps(p.props ?? {}) });
  if (wErr) console.warn(`[app] usage event not recorded: ${wErr.message}`);
  return !wErr;
}
