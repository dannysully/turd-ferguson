import type { SupabaseClient } from "@supabase/supabase-js";

import { ADMIN_LIMITS } from "./decide.ts";
import { readSubject, readingsFor, refuseBranded, refuseEdit } from "./limits.ts";
import { refuseSlotText } from "./slot.ts";
import { refuseStop, stopDay } from "./stop.ts";

/**
 * /admin/tracking's edit and stop on each listed prompt and keyword - R102
 * (Danny, 29 Sep 2026, danny.md line 94: a typo needed a database fix, and
 * that must not recur).
 *
 * Edit changes the text only, and only while the row has no reading
 * (limits.ts `refuseEdit`, the same rule the Clusters page's editor uses), so a
 * history never mixes two questions. Stop sets `stopped_on` to tomorrow and
 * keeps the row and its history; nothing is deleted. The admin check is the
 * caller's (actions.ts `refuseUnlessAdmin`); every read and write here is
 * scoped to the client's id.
 */

export type AdminKind = "prompt" | "keyword";
export type AdminDone = { ok: true; message: string } | { ok: false; message: string };

const TABLE = { prompt: "tracked_questions", keyword: "tracked_keywords" } as const;
const COLUMN = { prompt: "text", keyword: "keyword" } as const;

export const isAdminKind = (v: string): v is AdminKind => v === "prompt" || v === "keyword";

/** The new text's own rule: a prompt as the slot's, a keyword 2 to ADMIN_LIMITS.keyword characters. */
export function refuseAdminText(kind: AdminKind, text: string): string | null {
  const t = text.trim();
  if (kind === "prompt") return refuseSlotText(t, []);
  return t.length < 2 || t.length > ADMIN_LIMITS.keyword ? `A keyword is 2 to ${ADMIN_LIMITS.keyword} characters.` : null;
}

async function readLive(db: SupabaseClient, kind: AdminKind, clientId: string, id: string): Promise<{ stopped_on: string | null } | null | string> {
  const { data, error } = await db.from(TABLE[kind]).select(`id, ${COLUMN[kind]}, stopped_on`).eq("id", id).eq("client_domain_id", clientId).maybeSingle();
  if (error) return `Could not read it: ${error.message}`;
  return (data as { stopped_on: string | null } | null) ?? null;
}

/** Rewrite one live prompt's or keyword's text, refused once it has a reading. */
export async function adminEdit(db: SupabaseClient, p: { kind: AdminKind; clientId: string; id: string; text: string }): Promise<AdminDone> {
  const text = p.text.trim();
  const bad = refuseAdminText(p.kind, text);
  if (bad) return { ok: false, message: bad };
  const row = await readLive(db, p.kind, p.clientId, p.id);
  if (typeof row === "string") return { ok: false, message: row };
  if (!row) return { ok: false, message: "That is not on this client." };
  if (row.stopped_on !== null) return { ok: false, message: "It is stopped; add a new one instead." };
  const n = await readingsFor(db, p.kind, p.id);
  if (typeof n === "string") return { ok: false, message: n };
  const fixed = refuseEdit(n);
  if (fixed) return { ok: false, message: fixed };
  if (p.kind === "prompt") {
    const subject = await readSubject(db, p.clientId);
    if (typeof subject === "string") return { ok: false, message: subject };
    const branded = refuseBranded([text], subject);
    if (branded) return { ok: false, message: branded };
  }
  const { error } = await db.from(TABLE[p.kind]).update({ [COLUMN[p.kind]]: text }).eq("id", p.id).eq("client_domain_id", p.clientId).is("stopped_on", null);
  return error ? { ok: false, message: `Could not save it: ${error.message}` } : { ok: true, message: `Saved: ${text}` };
}

/** Stop one prompt or keyword from tomorrow; the row and its readings stay. */
export async function adminStop(db: SupabaseClient, p: { kind: AdminKind; clientId: string; id: string; today: string }): Promise<AdminDone> {
  const row = await readLive(db, p.kind, p.clientId, p.id);
  if (typeof row === "string") return { ok: false, message: row };
  const refused = refuseStop(row);
  if (refused) return { ok: false, message: refused };
  const day = stopDay(p.today);
  const { error } = await db.from(TABLE[p.kind]).update({ stopped_on: day, stopped_by: "nomada" }).eq("id", p.id).eq("client_domain_id", p.clientId).is("stopped_on", null);
  return error ? { ok: false, message: `Could not stop it: ${error.message}` } : { ok: true, message: `Stopped from ${day}; its history stays.` };
}
