import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { SESSION_TTL_MS, hashToken, isTokenShape, newToken, sessionCookie } from "@/lib/tracking/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Consume a login link and start a session (T3, 29 Sep 2026).
 *
 * A POST from the button on /app/auth rather than the GET of the link itself:
 * mail scanners fetch links on delivery, and a single-use token consumed by a
 * GET would be spent by the scanner before its owner clicked it - the lesson
 * the deleted verify link left in paid-get.test.mts.
 *
 * The claim is a compare-and-swap - `used_at is null` and unexpired, in the
 * filter - so a link works once however many times it is posted.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const token = form?.get("token");
  const failed = NextResponse.redirect(new URL("/app/login?link=expired", req.url), 303);
  if (!isTokenShape(token)) return failed;

  const db = supabaseAdmin();
  const { data: claimed, error } = await db
    .from("dashboard_login_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("email");
  if (error) {
    console.warn(`[app] could not claim a login token: ${error.message}`);
    return failed;
  }
  const email = claimed?.[0]?.email as string | undefined;
  if (!email) return failed;

  const session = newToken();
  const { error: sErr } = await db.from("dashboard_sessions").insert({
    token_hash: hashToken(session),
    email,
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  if (sErr) {
    console.warn(`[app] could not start a session: ${sErr.message}`);
    return failed;
  }

  // BRIEF-4 P0: Settings' "Last signed in". Never fatal - the session is already started.
  const { error: lErr } = await db
    .from("dashboard_members")
    .update({ last_login_at: new Date().toISOString() })
    .eq("email", email)
    .is("removed_at", null);
  if (lErr) console.warn(`[app] could not record the sign-in: ${lErr.message}`);

  const res = NextResponse.redirect(new URL("/app", req.url), 303);
  res.cookies.set(sessionCookie(session));
  return res;
}
