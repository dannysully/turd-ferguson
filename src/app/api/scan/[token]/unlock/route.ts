import {
  SCAN_UNLOCK_COLUMNS,
  UnlockNotStamped,
  buildUnlockPayload,
  completeUnlock,
  resolveAccount,
  type UnlockableScan,
} from "@/lib/scan/unlock";
import { SETTINGS_FALLBACK, getSettings } from "@/lib/scan/settings";
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

  // A read that failed is not a token that does not exist. This is the moment
  // the address is handed over, so "we do not hold that scan" is both false and
  // the end of the visit; "try again" is true and costs them one more click.
  const { data: scan, error: readErr } = await db
    .from("scans")
    .select(SCAN_UNLOCK_COLUMNS)
    .eq("public_token", token)
    .maybeSingle();

  if (readErr) {
    console.warn("[scan] could not read the scan to unlock it: " + readErr.message);
    return Response.json(
      { error: "read_failed", message: "We could not reach the checker. Try again." },
      { status: 502 },
    );
  }
  if (!scan) return Response.json({ error: "not_found" }, { status: 404 });
  if (scan.status !== "complete") {
    return Response.json({ error: "not_ready", status: scan.status }, { status: 409 });
  }

  // Read once and used twice below, for the send ceiling and the verification
  // flag. A settings blip must not become a funnel outage, so a failed read
  // falls back to the behaviour that still captures the lead and still shows
  // the report, rather than the one that shows nothing.
  let settings = SETTINGS_FALLBACK;
  try {
    settings = await getSettings();
  } catch (err) {
    console.warn(
      "[scan] could not read app_settings, unlocking on the defaults",
      err instanceof Error ? err.message : err,
    );
  }

  /**
   * What one scan link may put in somebody inbox in a day.
   *
   * This route takes an address from the caller and sends mail to it - the
   * verification message, or the report-ready one - and nothing bounded how
   * often. The public token is the only credential, and a token is not a
   * secret: it is in every shared scan link, and the domain cache hands a
   * completed scan token to the next visitor who scans the same site. So one
   * ordinary link was enough to send branded mail from our domain to any
   * address, as many times as anyone asked. That is a deliverability and
   * reputation problem before it is a security one - the cost lands on whether
   * our mail reaches the inboxes of people who did ask.
   *
   * Counted per scan and not per address, because it is our sending reputation
   * being spent and the address is the caller side of it to vary.
   *
   * Fails open on purpose: a count that errors comes back null and reads as
   * zero. Turning a database hiccup into a lost lead is the worse of the two
   * failures, and this ceiling is for volume rather than for any one message.
   */
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: sentToday } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("scan_id", scan.id)
    .gte("created_at", since);

  if ((sentToday ?? 0) >= settings.unlock_emails_per_day) {
    // Logged, because the ordinary way to reach this is not a visitor: one
    // person unlocks once, and a team sharing a link does not reach five.
    console.warn(`[scan] unlock send cap reached for ${scan.id}: ${sentToday} in 24h`);
    return Response.json(
      {
        error: "too_many_unlocks",
        message: "This report has already been sent several times today. Please try again tomorrow.",
      },
      { status: 429 },
    );
  }

  const accountId = await resolveAccount(email, (scan.account_id as string | null) ?? null);
  if (!accountId) return Response.json({ error: "account_failed" }, { status: 500 });

  const mustVerify = settings.require_email_verification;

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
  /**
   * A stamp that did not take is told, not papered over.
   *
   * The report in this response would be perfectly real - buildUnlockPayload
   * reads the same rows either way - so the tempting thing is to serve it and
   * say nothing. That is the worse outcome: the scan stays locked, the link in
   * the email 403s, and the visitor who paid an address for it finds the gate
   * again with no idea why. A retry costs one more row against a cap of five
   * and is very likely to succeed, because what fails here is transient.
   */
  let gatedStarted: boolean;
  let gatedEngines: string[];
  try {
    ({ gatedStarted, gatedEngines } = await completeUnlock(
      scan as unknown as UnlockableScan,
      accountId,
      email,
    ));
  } catch (err) {
    if (!(err instanceof UnlockNotStamped)) throw err;
    console.error("[scan] " + err.message);
    return Response.json(
      {
        error: "unlock_failed",
        message: "We could not open that report just now. Please try again in a moment.",
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  // No magic link is sent here, and adding one back would be a regression.
  // There is no browser Supabase client, no @supabase/ssr and no login on this
  // site - /scan/[token] is authorised by the token in the URL - so the session
  // an invite would establish is read by nothing. completeUnlock above already
  // sends sendReportReadyEmail through Resend, branded, linking to this scan.

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
