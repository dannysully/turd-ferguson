import type { SupabaseClient } from "@supabase/supabase-js";

import { APP_LIMITS } from "../../config/contact.ts";
import { isPlausibleEmail, normalizeEmail } from "../email-address.ts";

/**
 * Team on Settings - R142 part 2 (1 Oct 2026; BRIEF-4 P2 "2. Team"). Owners
 * invite, change a role and remove; editors and viewers only read the list.
 *
 * Removing never deletes: it sets `removed_at` and `removed_by`, and every
 * membership read requires `removed_at is null`, so the removed email's next
 * request 404s. A removed member is re-invited on the same row by clearing
 * `removed_at` (`unique (account_id, email)` holds). Owners are made in
 * /admin/tracking only; no one changes or removes themselves, and the last
 * owner can be neither demoted nor removed.
 *
 * Caps: 10 live members per account, 20 invites per owner per day, counted off
 * `dashboard_events` rows with event `member_invite`.
 *
 * Pure rules first so the tests run each one; the writers are the network half.
 */

export const MEMBERS_PER_ACCOUNT = 10;
export const INVITES_PER_OWNER_PER_DAY = 20;
export const EMAIL_MAX = APP_LIMITS.email;
export const INVITE_EVENT = "member_invite";

export type TeamOp = "invite" | "role" | "remove";
export type InviteRole = "editor" | "viewer";
export type TeamRow = { email: string; role: string; removed_at: string | null };

/** Trimmed, lowercased and format-checked by the site's one shape check, or null. */
export function readEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = normalizeEmail(raw);
  return e.length <= EMAIL_MAX && isPlausibleEmail(e) ? e : null;
}

export const readRole = (raw: unknown): InviteRole | null => (raw === "editor" || raw === "viewer" ? raw : null);

export type TeamForm = { op: TeamOp; email: string; role: InviteRole | null };

/** The posted form, or null if it is not a change this page makes. */
export function readTeamForm(get: (k: string) => unknown): TeamForm | null {
  const op = get("op");
  if (op !== "invite" && op !== "role" && op !== "remove") return null;
  const email = readEmail(get("email"));
  if (!email) return null;
  const role = readRole(get("role"));
  if (op !== "remove" && !role) return null;
  return { op, email, role: op === "remove" ? null : role };
}

const live = (rows: TeamRow[]) => rows.filter((r) => r.removed_at === null);

/** Only an owner changes the team. */
export const refuseActor = (role: string): string | null => (role === "owner" ? null : "Only owners can change the team.");

export function refuseInvite(p: { rows: TeamRow[]; email: string; invitesToday: number }): string | null {
  const row = p.rows.find((r) => r.email === p.email);
  if (row && row.removed_at === null) return "They are already on the team.";
  if (live(p.rows).length >= MEMBERS_PER_ACCOUNT) return `A dashboard has at most ${MEMBERS_PER_ACCOUNT} members.`;
  if (p.invitesToday >= INVITES_PER_OWNER_PER_DAY) return "That is today's invite limit. Try again tomorrow.";
  return null;
}

/** A change to someone else's live row; never your own, never the last owner. */
export function refuseChange(p: { rows: TeamRow[]; actor: string; email: string; op: "role" | "remove"; role: InviteRole | null }): string | null {
  if (p.email === p.actor) return "You cannot change or remove yourself.";
  const row = live(p.rows).find((r) => r.email === p.email);
  if (!row) return "They are not on the team.";
  if (row.role === "owner" && live(p.rows).filter((r) => r.role === "owner").length <= 1) return "A dashboard needs at least one owner.";
  if (p.op === "role" && row.role === p.role) return `They are already ${p.role === "editor" ? "an editor" : "a viewer"}.`;
  return null;
}

// ---- Where the route sends the browser back to, and the toast the page draws. ----

export type TeamDone = "invited" | "removed" | "role" | "refused";

export function teamReturn(slug: string, done: TeamDone, email: string | null, keep: Record<string, string> = {}): string {
  // DS40 (2 Oct 2026, R173 pass 4): the range the form posted with (readKept's from, to, compare) comes back too.
  const range = Object.fromEntries(Object.entries(keep).filter(([k]) => k === "from" || k === "to" || k === "compare"));
  const q = new URLSearchParams({ ...range, team: done, ...(email && done !== "refused" ? { who: email } : {}) });
  return `/app/${encodeURIComponent(slug)}/settings?${q}#set-team`;
}

/**
 * Fixed words; the only thing from the URL is an email that passes readEmail,
 * and only where the team agrees with it (R146, 1 Oct 2026): "Invited" needs
 * them on the team now and "Removed" needs them off it, so a typed link cannot
 * put a stranger's address in a confirmation.
 */
export function teamToast(done: unknown, who: unknown, roleNow: string | null): string | null {
  const email = readEmail(who);
  if (done === "refused") return "That change did not go through. Reload the page and try again.";
  if (!email) return null;
  if (done === "invited") return roleNow === null ? null : `Invited ${email}.`;
  if (done === "removed") return roleNow === null ? `Removed ${email}.` : null;
  if (done === "role" && (roleNow === "editor" || roleNow === "viewer")) return `${email} is now ${roleNow === "editor" ? "an editor" : "a viewer"}.`;
  return null;
}

// ---- The invite mail (BRIEF-4 P2 words). No login token: the invitee signs in the normal way. ----

export function inviteMail(p: { inviter: string; domain: string; role: InviteRole; agency: boolean }): { subject: string; text: string } {
  // agency mode names no nomada tier or brand.
  const board = p.agency ? "dashboard" : "alwayscited dashboard";
  return {
    subject: `You've been added to the ${p.domain} dashboard`,
    text: `${p.inviter} added you to the ${board} for ${p.domain} as ${p.role === "editor" ? "an editor" : "a viewer"}. Sign in with this email address at alwayscited.com/app/login - we'll send you a link.\n`,
  };
}

// ---- The writers. Each reads the account's rows, asks the rule, then writes. ----

export type TeamResult = { ok: true } | { ok: false; message: string };

/** The live members only: a removed one is not on the team, and an invite revives their row. */
export async function readTeam(db: SupabaseClient, accountId: string): Promise<TeamRow[] | string> {
  const { data, error } = await db.from("dashboard_members").select("email, role, removed_at").eq("account_id", accountId).is("removed_at", null);
  if (error) return `Could not read the team: ${error.message}`;
  return (data ?? []).map((r) => ({ email: r.email as string, role: r.role as string, removed_at: (r.removed_at as string | null) ?? null }));
}

export async function invitesToday(db: SupabaseClient, p: { email: string; today: string }): Promise<number | string> {
  const { count, error } = await db
    .from("dashboard_events")
    .select("id", { count: "exact", head: true })
    .eq("member_email", p.email)
    .eq("event", INVITE_EVENT)
    .gte("created_at", `${p.today}T00:00:00Z`);
  return error || count === null ? `Could not count today's invites: ${error?.message ?? "no count"}` : count;
}

/**
 * A new row, or a removed one brought back on the same row with the new role:
 * an upsert on `unique (account_id, email)` that clears `removed_at`. A live
 * row never reaches here - refuseInvite refused it on the live list.
 */
export async function invite(db: SupabaseClient, p: { accountId: string; clientId: string; email: string; role: InviteRole; by: string }): Promise<TeamResult> {
  const { error } = await db
    .from("dashboard_members")
    .upsert({ account_id: p.accountId, email: p.email, role: p.role, invited_by: p.by, removed_at: null, removed_by: null }, { onConflict: "account_id,email" });
  if (error) return { ok: false, message: `Could not invite them: ${error.message}` };
  const { error: eErr } = await db.from("dashboard_events").insert({ client_domain_id: p.clientId, member_email: p.by, event: INVITE_EVENT, path: "/settings", props: {} });
  // The member is in; a lost count row only loosens the daily cap by one.
  if (eErr) console.warn(`[app] invite not counted: ${eErr.message}`);
  return { ok: true };
}

export async function changeRole(db: SupabaseClient, p: { accountId: string; email: string; role: InviteRole }): Promise<TeamResult> {
  const { error } = await db.from("dashboard_members").update({ role: p.role }).eq("account_id", p.accountId).eq("email", p.email).is("removed_at", null);
  return error ? { ok: false, message: `Could not change the role: ${error.message}` } : { ok: true };
}

export async function removeMember(db: SupabaseClient, p: { accountId: string; email: string; by: string }): Promise<TeamResult> {
  const { error } = await db
    .from("dashboard_members")
    .update({ removed_at: new Date().toISOString(), removed_by: p.by })
    .eq("account_id", p.accountId)
    .eq("email", p.email)
    .is("removed_at", null);
  return error ? { ok: false, message: `Could not remove them: ${error.message}` } : { ok: true };
}
