import type { SupabaseClient } from "@supabase/supabase-js";

import { ADMIN_LIMITS } from "./decide.ts";
import { angleFor, insertPrompts } from "./limits.ts";
import { refuseRole, stopDay } from "./stop.ts";

/**
 * The free slot on the Clusters page - BRIEF-3 T6 part 2c (30 Sep 2026;
 * boards-3/Questions.dc.html): a stopped prompt's place becomes an input, and
 * what is typed there is tracked as a new prompt in the same cluster, at the
 * stopped prompt's angle. A new row, never the old one rewritten, so two
 * prompts never share a history.
 *
 * It is first read at tomorrow's 06:00 check (`added_on` is tomorrow, as the
 * admin adds are), which is what the board's toast says. The room is limits.ts's
 * rule: the cluster must have fewer than 5 live prompts and the client room
 * under its limit; `insertPrompts` refuses otherwise. Owners and editors only.
 */

/** A prompt is 8 to ADMIN_LIMITS.question characters - the admin form's rule, one fact. */
export const PROMPT_MIN = 8;

export function refuseSlotText(text: string, live: readonly string[]): string | null {
  const t = text.trim();
  if (t.length < PROMPT_MIN || t.length > ADMIN_LIMITS.question) return `A prompt is ${PROMPT_MIN} to ${ADMIN_LIMITS.question} characters.`;
  if (live.some((l) => l.trim().toLowerCase() === t.toLowerCase())) return "That prompt is already tracked in this cluster.";
  return null;
}

export type Filled = { ok: true; id: string } | { ok: false; message: string };

export async function fillSlot(db: SupabaseClient, p: { clientId: string; clusterId: string; angle: string | null; text: string; today: string; by: string; role: string }): Promise<Filled> {
  const r = refuseRole(p.role);
  if (r) return { ok: false, message: r };
  const { data: c, error: cErr } = await db.from("tracked_clusters").select("stopped_on").eq("id", p.clusterId).eq("client_domain_id", p.clientId).maybeSingle();
  if (cErr) return { ok: false, message: `Could not read the cluster: ${cErr.message}` };
  if (!c) return { ok: false, message: "That cluster is not on this client." };
  if (c.stopped_on !== null) return { ok: false, message: "That cluster is stopped." };
  const { data: live, error: lErr } = await db.from("tracked_questions").select("text").eq("client_domain_id", p.clientId).eq("cluster_id", p.clusterId).is("stopped_on", null);
  if (lErr) return { ok: false, message: `Could not read its prompts: ${lErr.message}` };
  const refused = refuseSlotText(p.text, (live ?? []).map((q) => q.text as string));
  if (refused) return { ok: false, message: refused };
  const w = await insertPrompts(db, p.clientId, p.clusterId, [{ text: p.text.trim(), source: "client", added_on: stopDay(p.today), added_by: p.by, angle: angleFor(p.angle) }]);
  return w.ok ? { ok: true, id: w.ids[0] } : w;
}
