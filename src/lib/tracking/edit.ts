import type { SupabaseClient } from "@supabase/supabase-js";

import { readSubject, readingsFor, refuseBranded, refuseEdit } from "./limits.ts";
import { refuseSlotText } from "./slot.ts";
import { refuseRole } from "./stop.ts";

/**
 * The pending cluster editor on the Clusters page - BRIEF-3 T6 part 2d (30 Sep
 * 2026; boards-3/Questions.dc.html "Save changes"): until a cluster's first
 * check, all its prompts can be rewritten in place. Once a prompt has any
 * reading its text is fixed (limits.ts `refuseEdit`), and the page offers stop
 * and a new prompt instead, so a history never mixes two questions.
 *
 * "Remove this cluster" is the stop route: a pending cluster stopped today
 * carries `stopped_on` tomorrow, the day of its first check, so it is never
 * read. Nothing is deleted.
 *
 * Owners and editors only; every read and write is scoped to client_domain_id.
 */

export type Edit = { id: string; text: string };

const FIELD = /^p-([0-9A-Za-z_-]{1,64})$/;

/** The posted fields, `p-<prompt id>` to text; anything else is dropped. At most 5. */
export function readEdits(entries: Iterable<[string, unknown]>): Edit[] {
  const out: Edit[] = [];
  for (const [k, v] of entries) {
    const m = FIELD.exec(k);
    if (m && typeof v === "string" && out.length < 5) out.push({ id: m[1], text: v });
  }
  return out;
}

/**
 * The edits that change something, or the reason they are refused: each text by
 * the slot's rule, no two prompts in the cluster alike, and only this cluster's
 * live prompts. `current` is the cluster's live prompts, id to text.
 */
export function refuseEdits(edits: readonly Edit[], current: ReadonlyMap<string, string>): { changed: Edit[] } | string {
  const next = new Map(current);
  for (const e of edits) {
    if (!current.has(e.id)) return "That prompt is not a live prompt in this cluster.";
    next.set(e.id, e.text.trim());
  }
  for (const [id, text] of next) {
    const others = [...next].filter(([o]) => o !== id).map(([, t]) => t);
    const r = refuseSlotText(text, others);
    if (r) return r;
  }
  return { changed: edits.filter((e) => current.get(e.id) !== e.text.trim()).map((e) => ({ id: e.id, text: e.text.trim() })) };
}

export type Saved = { ok: true; changed: number } | { ok: false; message: string };

/** Rewrite a pending cluster's prompts, each only while it has no reading. */
export async function editPrompts(db: SupabaseClient, p: { clientId: string; clusterId: string; edits: readonly Edit[]; role: string }): Promise<Saved> {
  const r = refuseRole(p.role);
  if (r) return { ok: false, message: r };
  const { data: c, error: cErr } = await db.from("tracked_clusters").select("stopped_on").eq("id", p.clusterId).eq("client_domain_id", p.clientId).maybeSingle();
  if (cErr) return { ok: false, message: `Could not read the cluster: ${cErr.message}` };
  if (!c) return { ok: false, message: "That cluster is not on this client." };
  if (c.stopped_on !== null) return { ok: false, message: "That cluster is stopped." };
  const { data: live, error: lErr } = await db.from("tracked_questions").select("id, text").eq("client_domain_id", p.clientId).eq("cluster_id", p.clusterId).is("stopped_on", null);
  if (lErr) return { ok: false, message: `Could not read its prompts: ${lErr.message}` };
  const verdict = refuseEdits(p.edits, new Map((live ?? []).map((q) => [q.id as string, q.text as string])));
  if (typeof verdict === "string") return { ok: false, message: verdict };
  const subject = await readSubject(db, p.clientId);
  if (typeof subject === "string") return { ok: false, message: subject };
  const branded = refuseBranded(verdict.changed.map((e) => e.text), subject);
  if (branded) return { ok: false, message: branded };
  for (const e of verdict.changed) {
    const n = await readingsFor(db, "prompt", e.id);
    if (typeof n === "string") return { ok: false, message: n };
    const fixed = refuseEdit(n);
    if (fixed) return { ok: false, message: fixed };
  }
  for (const e of verdict.changed) {
    const { error } = await db.from("tracked_questions").update({ text: e.text }).eq("id", e.id).eq("client_domain_id", p.clientId).eq("cluster_id", p.clusterId).is("stopped_on", null);
    if (error) return { ok: false, message: `Could not save it: ${error.message}` };
  }
  return { ok: true, changed: verdict.changed.length };
}
