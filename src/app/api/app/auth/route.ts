import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { clientsFor } from "@/lib/tracking/member";
import { safeNext } from "@/lib/tracking/next-path";
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
  if (!isTokenShape(token)) return NextResponse.redirect(new URL("/app/login?link=expired", req.url), 303);
  // R163: back to the link's own page, which reads the token and says spent
  // (with a one-click new link) or, with failed=1, shows the button rather
  // than submitting itself again.
  const next = safeNext(form?.get("next"));
  const back = next ? `&next=${encodeURIComponent(next)}` : "";
  const failed = NextResponse.redirect(new URL(`/app/auth?token=${token}&failed=1${back}`, req.url), 303);

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

  // R163: straight to the client's dashboard, not /app and a second redirect.
  // A failed read falls back to /app, which makes the same choice. No /setup
  // page exists yet, so there is no setup-confirmed detour to take.
  // R164: a safe next wins; its own page checks membership as every /app page does.
  const clients = next ? null : await clientsFor(email).catch(() => null);
  const to = next ? next : clients === null ? "/app" : clients.length ? `/app/${clients[0]!.slug}` : "/app/login?access=none";
  const res = NextResponse.redirect(new URL(to, req.url), 303);
  res.cookies.set(sessionCookie(session));
  return res;
}
