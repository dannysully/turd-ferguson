import type { SupabaseClient } from "@supabase/supabase-js";

import { ADMIN_LIMITS } from "./decide.ts";

/**
 * "Ask about these" and "Ask us to pick one" (BRIEF-2 T11, BRIEF-3 T6, 30 Sep
 * 2026; boards-3/CTAs.dc.html). A member asks; the ask goes by email to
 * whoever looks after the account - us, or in `agency` mode the agency's
 * contact - with the member as reply-to, and is recorded in cta_events as
 * `asked`. Three asks per member per day, counted off those rows. Any member
 * may ask, viewers included: an ask changes nothing that is tracked. With
 * `upsell_mode = 'off'` there is nobody to ask, so it is refused.
 *
 * This part carries the one ask the dashboard already offers: a keyword the
 * Add a cluster check refused, "Ask us to pick one" (cta `cluster`). The
 * upgrade prompts' "Ask about these" join it with UpgradePrompt.
 */

export const ASKS_PER_MEMBER_PER_DAY = 3;

export type UpsellMode = "nomada" | "agency" | "off";
export type AskCta = "mentioned" | "cited" | "everywhere" | "pack" | "cluster";

export const upsellMode = (v: unknown): UpsellMode => (v === "agency" || v === "off" ? v : "nomada");

/**
 * Who the ask goes to. `null` in `to` means our own contact destination; the
 * sender reads that itself, so no caller can supply an address. The agency
 * contact is accounts.upsell_contact_email, written only by Nomada in
 * /admin/tracking; an agency account with none set comes to us rather than
 * being lost.
 */
export function askRecipient(mode: UpsellMode, agencyContact: string | null): { to: string | null; who: string } | null {
  if (mode === "off") return null;
  if (mode === "agency" && agencyContact) return { to: agencyContact, who: "your account contact" };
  return { to: null, who: "nomada digital" };
}

/** The "Ask us to pick one" keyword, trimmed and single-spaced, as the check route bounds it. */
export function readAskKeyword(raw: unknown): string | null {
  const kw = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, ADMIN_LIMITS.question) : "";
  return kw || null;
}

/** The email: plain text, the client, the member and what they asked about. Tier names only outside agency mode. */
export function askMail(p: { brand: string; domain: string; member: string; keyword: string; mode: UpsellMode }): { subject: string; text: string } {
  const where = p.mode === "agency" ? "their dashboard" : "their alwaystracked dashboard";
  return {
    subject: `Pick a cluster keyword for ${p.brand}`,
    text: [
      `${p.member} (${p.brand}, ${p.domain}) asked from ${where} for a keyword to track as a cluster.`,
      "",
      `The keyword they tried: ${p.keyword}`,
      "It did not pass the keyword check (search volume and a buying intent).",
      "",
      "Reply to this email to answer them.",
    ].join("\n"),
  };
}

/** The toast, as the board's: who it went to and who will be answered. */
export const askToast = (who: string, member: string) => `Sent to ${who}. ${who === "nomada digital" ? "We'll" : "They'll"} reply to ${member}.`;

export type AskGate = { ok: true } | { ok: false; reason: "off" | "capped" | "read_failed" };

/** The day's cap, counted off this member's `asked` rows since midnight UTC. */
export async function askGate(db: SupabaseClient, p: { clientId: string; email: string; today: string }): Promise<AskGate> {
  const { count, error } = await db
    .from("cta_events")
    .select("id", { count: "exact", head: true })
    .eq("client_domain_id", p.clientId)
    .eq("member_email", p.email)
    .eq("action", "asked")
    .gte("created_at", `${p.today}T00:00:00Z`);
  if (error) return { ok: false, reason: "read_failed" };
  return (count ?? 0) >= ASKS_PER_MEMBER_PER_DAY ? { ok: false, reason: "capped" } : { ok: true };
}

export async function recordAsk(db: SupabaseClient, p: { clientId: string; email: string; cta: AskCta; trigger: Record<string, string> }): Promise<boolean> {
  const { error } = await db.from("cta_events").insert({ client_domain_id: p.clientId, member_email: p.email, cta: p.cta, action: "asked", trigger: p.trigger });
  return !error;
}
