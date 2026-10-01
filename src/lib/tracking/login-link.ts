import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { type LinkState, linkState } from "./login-link-state.ts";
import { hashToken } from "./session.ts";

/**
 * Read a login link's state without spending it (R163). A read, never an
 * update: the claim stays the POST's compare-and-swap in /api/app/auth, so a
 * mail scanner fetching this page spends nothing. A failed read answers
 * null, and the page falls back to the plain button it showed before.
 */
export async function loadLinkState(token: string): Promise<LinkState | null> {
  const { data, error } = await supabaseAdmin()
    .from("dashboard_login_tokens")
    .select("email, used_at, expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error) {
    console.warn(`[app] could not read a login link: ${error.message}`);
    return null;
  }
  return linkState(data as { email: string; used_at: string | null; expires_at: string } | null, new Date());
}
