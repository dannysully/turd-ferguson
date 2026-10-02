import type { SupabaseClient } from "@supabase/supabase-js";

import { keywordForm } from "../scan/dataforseo-request.ts";
import { insertKeyword, readingsFor } from "./limits.ts";
import { refuseRole } from "./stop.ts";

/**
 * R179 (Danny, 2 Oct 2026, danny.md line 211): "Change keyword" on a pending
 * cluster. Until its first reading a cluster's keyword can be swapped for one
 * that passed the same Check keyword (signed verdict, same refusals); its
 * prompts are kept, and the page offers a redraft. After the first reading the
 * keyword is fixed, as a prompt's text is: the cluster is stopped (with Undo)
 * and a new one added. Owners and editors only. Nothing is deleted.
 */
export const KEYWORD_FIXED = "Its first reading is in, so its keyword is fixed. Stop this cluster and add a new one.";

/** What a read cluster's keyword card says beside its stop. */
export const KEYWORD_FIXED_NOTE = "Its keyword is fixed now it has readings, so its history stays true to what was checked. For a different keyword, stop this cluster and add a new one.";

export type RekeyCluster = { started_on: string; stopped_on: string | null } | null;

/** Whether this cluster's keyword may change today: null, or the reason it may not. */
export function refuseRekey(p: { role: string; cluster: RekeyCluster; today: string; readings: number; taken: boolean }): string | null {
  const role = refuseRole(p.role);
  if (role) return role;
  if (!p.cluster) return "That cluster is not on this client.";
  if (p.cluster.stopped_on !== null) return "That cluster is stopped.";
  // A cluster started today or earlier has been, or is being, read: its keyword is part of that history.
  if (p.cluster.started_on <= p.today || p.readings > 0) return KEYWORD_FIXED;
  if (p.taken) return "You already track this keyword.";
  return null;
}

export type Rekey = { clientId: string; clusterId: string; keyword: string; volume: number; intent: string; today: string; role: string; by: string };

/** The live write: the cluster's keyword row updated in place (or added, for a cluster that has none), and its name with it. */
export async function changeKeyword(db: SupabaseClient, p: Rekey): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: c, error } = await db.from("tracked_clusters").select("id, keyword_id, started_on, stopped_on").eq("id", p.clusterId).eq("client_domain_id", p.clientId).maybeSingle();
  if (error) return { ok: false, message: `Could not read the cluster: ${error.message}` };
  const keyword = keywordForm(p.keyword);
  const { data: live, error: kErr } = await db.from("tracked_keywords").select("id, keyword").eq("client_domain_id", p.clientId).is("stopped_on", null);
  if (kErr) return { ok: false, message: `Could not read the tracked keywords: ${kErr.message}` };
  const own = (c?.keyword_id as string | null | undefined) ?? null;
  const taken = (live ?? []).some((k) => k.id !== own && keywordForm(k.keyword as string) === keyword);
  const readings = own ? await readingsFor(db, "keyword", own) : 0;
  if (typeof readings === "string") return { ok: false, message: readings };
  const refused = refuseRekey({ role: p.role, cluster: c ? { started_on: c.started_on as string, stopped_on: c.stopped_on as string | null } : null, today: p.today, readings, taken });
  if (refused) return { ok: false, message: refused };
  if (own && (live ?? []).some((k) => k.id === own)) {
    const { error: uErr } = await db.from("tracked_keywords").update({ keyword, search_volume: p.volume, intent: p.intent }).eq("id", own).eq("client_domain_id", p.clientId);
    if (uErr) return { ok: false, message: `Could not change the keyword: ${uErr.message}` };
  } else {
    const k = await insertKeyword(db, p.clientId, p.clusterId, { keyword, added_on: c!.started_on as string, added_by: p.by, search_volume: p.volume, intent: p.intent });
    if (!k.ok) return k;
  }
  const { error: nErr } = await db.from("tracked_clusters").update({ name: keyword }).eq("id", p.clusterId).eq("client_domain_id", p.clientId);
  if (nErr) return { ok: false, message: `Keyword changed, but not the cluster's name: ${nErr.message}` };
  return { ok: true };
}
