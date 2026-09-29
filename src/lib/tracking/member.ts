import "server-only";

import { cookies } from "next/headers";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { SESSION_COOKIE, hashToken, isTokenShape } from "./session.ts";

/**
 * Who is looking at /app, and which clients they may see (T3, 29 Sep 2026).
 * A member sees exactly the clients on the accounts they belong to.
 */

export type MemberClient = {
  id: string;
  slug: string;
  domain: string;
  brand: string | null;
  market: string;
  tier: string;
  started_on: string | null;
  question_limit: number;
  keyword_limit: number;
};

/** The signed-in email, or null. */
export async function sessionEmail(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isTokenShape(token)) return null;
  const { data, error } = await supabaseAdmin()
    .from("dashboard_sessions")
    .select("email")
    .eq("token_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  if (error) throw new Error(`could not read the session: ${error.message}`);
  return (data?.[0]?.email as string | undefined) ?? null;
}

/** Every client this email may see, oldest first, with the member's role on it. */
export async function clientsFor(email: string): Promise<(MemberClient & { role: string })[]> {
  const db = supabaseAdmin();
  const { data: memberships, error: mErr } = await db.from("dashboard_members").select("account_id, role").eq("email", email);
  if (mErr) throw new Error(`could not read memberships: ${mErr.message}`);
  const roleOf = new Map((memberships ?? []).map((m) => [m.account_id as string, m.role as string]));
  if (!roleOf.size) return [];
  const { data: rows, error: cErr } = await db
    .from("client_domains")
    .select("id, account_id, slug, domain, brand_name, market, tier, started_on, question_limit, keyword_limit")
    .in("account_id", [...roleOf.keys()])
    .not("slug", "is", null)
    .order("created_at", { ascending: true });
  if (cErr) throw new Error(`could not read clients: ${cErr.message}`);
  return (rows ?? []).map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    domain: r.domain as string,
    brand: r.brand_name as string | null,
    market: r.market as string,
    tier: r.tier as string,
    started_on: r.started_on as string | null,
    question_limit: r.question_limit as number,
    keyword_limit: r.keyword_limit as number,
    role: roleOf.get(r.account_id as string) ?? "viewer",
  }));
}
