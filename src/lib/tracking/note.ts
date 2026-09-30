import type { SupabaseClient } from "@supabase/supabase-js";

import { APP_LIMITS } from "../../config/contact.ts";
import type { Day } from "./figures.ts";
import { refuseRole } from "./stop.ts";

/**
 * "Add a note" on the one-cluster page (T7 part 4b, 30 Sep 2026;
 * boards-3/QuestionDetail.dc.html). tracking_notes has no cluster column, so a
 * note hangs on one of the cluster's prompts (question_id) - the prompt the
 * page has picked - and "Notes on this cluster" reads the notes on all five.
 * Owners and editors only; dated today; 1 to 200 characters, as the table's
 * check. The note is the member's own words, shown only to that client.
 */

const NOTE_MAX = APP_LIMITS.note;

/** The form's note, trimmed and single-spaced; a reason instead when it cannot be saved. */
export function readNote(raw: unknown): { text: string } | string {
  const text = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (!text) return "Write a note first.";
  if (text.length > NOTE_MAX) return `A note is ${NOTE_MAX} characters at most.`;
  return { text };
}

const ID = /^[A-Za-z0-9-]{1,64}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Where the form returns: the same cluster page and state, built only from
 * checked parts of the action's query (ids, days, a digit, a compare word,
 * an engine key), never a URL taken as given. Null when cluster or prompt is
 * missing or malformed.
 */
export function noteReturn(slug: string, sp: URLSearchParams): string | null {
  const cluster = sp.get("cluster") ?? "";
  const q = sp.get("q") ?? "";
  if (!ID.test(slug) || !ID.test(cluster) || !ID.test(q)) return null;
  const keep = new URLSearchParams();
  const from = sp.get("from");
  const to = sp.get("to");
  if (from && to && DAY.test(from) && DAY.test(to)) keep.set("from", from), keep.set("to", to);
  const compare = sp.get("compare");
  if (compare === "month" || compare === "none") keep.set("compare", compare);
  const prompt = sp.get("prompt");
  keep.set("prompt", prompt && /^\d$/.test(prompt) ? prompt : "0");
  const engine = sp.get("engine");
  if (engine && /^[a-z_]{1,20}$/.test(engine)) keep.set("engine", engine);
  return `/app/${slug}/clusters/${cluster}?${keep}`;
}

export type NoteSaved = { ok: true } | { ok: false; message: string };

export async function addNote(db: SupabaseClient, p: { clientId: string; clusterId: string; questionId: string; text: string; email: string; role: string; today: Day }): Promise<NoteSaved> {
  const role = refuseRole(p.role);
  if (role) return { ok: false, message: role };
  const { data: q, error: qErr } = await db
    .from("tracked_questions")
    .select("id")
    .eq("client_domain_id", p.clientId)
    .eq("cluster_id", p.clusterId)
    .eq("id", p.questionId)
    .maybeSingle();
  if (qErr) return { ok: false, message: `could not read the prompt: ${qErr.message}` };
  if (!q) return { ok: false, message: "That prompt is not in this client's cluster." };
  const { error } = await db.from("tracking_notes").insert({ client_domain_id: p.clientId, note_date: p.today, text: p.text, question_id: p.questionId, author_email: p.email });
  if (error) return { ok: false, message: `could not save the note: ${error.message}` };
  return { ok: true };
}
