import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { SESSION_COOKIE, hashToken, isTokenShape } from "@/lib/tracking/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * End a dashboard session (T3, 29 Sep 2026). The row is expired rather than
 * deleted, and the cookie cleared; the redirect goes to the login page either way.
 */
export async function POST(req: Request) {
  const raw = req.headers.get("cookie") ?? "";
  const token = raw
    .split(/;\s*/)
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (isTokenShape(token)) {
    const { error } = await supabaseAdmin()
      .from("dashboard_sessions")
      .update({ expires_at: new Date().toISOString() })
      .eq("token_hash", hashToken(token));
    if (error) console.warn(`[app] could not end a session: ${error.message}`);
  }
  const res = NextResponse.redirect(new URL("/app/login", req.url), 303);
  res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0, httpOnly: true, secure: true, sameSite: "lax" });
  return res;
}
