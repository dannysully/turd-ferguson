import {
  SCAN_UNLOCK_COLUMNS,
  buildUnlockPayload,
  completeUnlock,
  resolveAccount,
  type UnlockableScan,
} from "@/lib/scan/unlock";
import { getSettings } from "@/lib/scan/settings";
import { sendVerificationEmail } from "@/lib/scan/verify-email";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The response goes out as soon as the free result is assembled; the gated
// engines then run in after(), so this covers that second pass too.
export const maxDuration = 300;

/** Throwaway-inbox domains. Kept short and obvious rather than exhaustive. */
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "temp-mail.org", "throwawaymail.com", "yopmail.com", "sharklasers.com",
  "getnada.com", "trashmail.com", "fakeinbox.com", "maildrop.cc",
  "dispostable.com", "mintemail.com", "spamgourmet.com", "mailnesia.com",
]);

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  let body: { email?: string; marketing_ok?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) {
    return Response.json(
      { error: "bad_email", message: "That email does not look right." },
      { status: 400 },
    );
  }
  if (DISPOSABLE.has(email.split("@")[1] ?? "")) {
    return Response.json(
      { error: "disposable_email", message: "Please use your work email address." },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();

  const { data: scan } = await db
    .from("scans")
    .select(SCAN_UNLOCK_COLUMNS)
    .eq("public_token", token)
    .maybeSingle();

  if (!scan) return Response.json({ error: "not_found" }, { status: 404 });
  if (scan.status !== "complete") {
    return Response.json({ error: "not_ready", status: scan.status }, { status: 409 });
  }

  const accountId = await resolveAccount(email, (scan.account_id as string | null) ?? null);
  if (!accountId) return Response.json({ error: "account_failed" }, { status: 500 });

  // A settings blip must not become a funnel outage. Failing to read the flag
  // falls back to the behaviour that still captures the lead and still shows
  // the report, rather than the one that shows nothing.
  let mustVerify = false;
  try {
    mustVerify = (await getSettings()).require_email_verification;
  } catch (err) {
    console.warn("[scan] could not read app_settings, unlocking without verification", err instanceof Error ? err.message : err);
  }

  // The lead is recorded either way. What changes is whether it counts as
  // proven on the spot or has to be confirmed first.
  const { data: lead, error: lErr } = await db
    .from("leads")
    .insert({
      email,
      scan_id: scan.id,
      account_id: accountId,
      marketing_ok: body.marketing_ok === true,
      verified_at: mustVerify ? null : new Date().toISOString(),
    })
    .select("id, verify_token")
    .single();

  if (lErr || !lead) return Response.json({ error: "lead_failed" }, { status: 500 });

  // ---- verification first ----
  if (mustVerify) {
    const brand = (scan.brand_name as string | null) ?? (scan.domain as string);
    const sent = await sendVerificationEmail({
      email,
      brand,
      verifyToken: lead.verify_token as string,
      leadId: lead.id as string,
    });

    if (!sent) {
      return Response.json(
        {
          error: "email_failed",
          message: "We could not send that just now. Try again in a moment.",
          lead_id: lead.id,
        },
        { status: 502 },
      );
    }

    return Response.json(
      { verification_sent: true, email, lead_id: lead.id },
      { headers: { "cache-control": "no-store" } },
    );
  }

  // ---- unlock straight away ----
  const { gatedStarted, gatedEngines } = await completeUnlock(scan as unknown as UnlockableScan, accountId);

  // The magic link establishes the session for the return visit. It is sent,
  // not waited on: making someone leave the page to see what they were just
  // promised loses them.
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://alwayscited.com";
  void db.auth.admin
    .inviteUserByEmail(email, { redirectTo: `${site}/scan/${token}` })
    .catch((err) => {
      console.warn("[scan] magic link not sent", err instanceof Error ? err.message : err);
    });

  const payload = await buildUnlockPayload(scan.id as string);

  return Response.json(
    {
      unlocked: true,
      gated_engines: gatedEngines,
      gated_status: gatedStarted ? "queued" : (scan.gated_status ?? "none"),
      ...payload,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
