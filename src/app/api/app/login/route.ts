import { SCAN_LIMITS } from "@/config/contact";
import { isPlausibleEmail, normalizeEmail } from "@/lib/email-address";
import { clientIp, hashIp } from "@/lib/scan/ip";
import { siteUrl } from "@/lib/scan/verify-email";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendLoginLink } from "@/lib/tracking/login-mail";
import { LOGIN_SENT, LOGIN_TTL_MS, LOGIN_PER_EMAIL_PER_HOUR, hashToken, mayRequestLink, newToken } from "@/lib/tracking/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send a dashboard login link (T3, 29 Sep 2026; BRIEF decision 2).
 *
 * Answers LOGIN_SENT whatever happened - member or not, capped or not - so
 * the response never discloses who has access. Mail goes only to an address
 * found in dashboard_members, and at most LOGIN_PER_EMAIL_PER_HOUR links an
 * hour per address and LOGIN_PER_IP_PER_HOUR per hashed IP, counted off
 * dashboard_login_tokens.
 */
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const email = normalizeEmail(body.email ?? "");
  if (email.length > SCAN_LIMITS.email || !isPlausibleEmail(email)) {
    return Response.json({ error: "bad_email", message: "That email does not look right." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const ipHash = hashIp(clientIp(req));
  const since = new Date(Date.now() - 3600 * 1000).toISOString();

  const [{ count: byEmail, error: eErr }, { count: byIp, error: iErr }] = await Promise.all([
    db.from("dashboard_login_tokens").select("token_hash", { count: "exact", head: true }).eq("email", email).gte("created_at", since),
    db.from("dashboard_login_tokens").select("token_hash", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since),
  ]);
  if (eErr || iErr) {
    console.warn(`[app] could not count login requests: ${(eErr ?? iErr)!.message}`);
    return Response.json({ error: "read_failed", message: "Something went wrong. Please try again." }, { status: 502 });
  }
  if (!mayRequestLink(byEmail ?? 0, byIp ?? 0)) {
    console.warn(`[app] login link capped (${LOGIN_PER_EMAIL_PER_HOUR}/h per address)`);
    return Response.json({ ok: true, message: LOGIN_SENT });
  }

  const { data: member, error: mErr } = await db.from("dashboard_members").select("email").eq("email", email).limit(1);
  if (mErr) {
    console.warn(`[app] could not read members: ${mErr.message}`);
    return Response.json({ error: "read_failed", message: "Something went wrong. Please try again." }, { status: 502 });
  }

  // Every request is recorded, member or not, so the caps count strangers too.
  const token = newToken();
  const { error: tErr } = await db.from("dashboard_login_tokens").insert({
    token_hash: hashToken(token),
    email,
    ip_hash: ipHash,
    expires_at: new Date(Date.now() + LOGIN_TTL_MS).toISOString(),
    // A non-member's row is born used, so it can never log anybody in.
    used_at: member?.length ? null : new Date().toISOString(),
  });
  if (tErr) {
    console.warn(`[app] could not store a login token: ${tErr.message}`);
    return Response.json({ error: "write_failed", message: "Something went wrong. Please try again." }, { status: 502 });
  }

  if (member?.length) {
    await sendLoginLink({ memberEmail: member[0]!.email as string, link: `${siteUrl()}/app/auth?token=${token}` });
  }
  return Response.json({ ok: true, message: LOGIN_SENT });
}
