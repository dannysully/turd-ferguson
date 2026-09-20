import { SCAN_LIMITS } from "@/config/contact";
import { isPlausibleEmail, normalizeEmail } from "@/lib/email-address";
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


export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  let body: { email?: string; marketing_ok?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");

  /**
   * The bound, which lived only on the input until 20 September 2026.
   *
   * `SCAN_LIMITS.email` is 254 - the longest an address may be over SMTP - and
   * `ScanFlow` has carried it as `maxLength` since the input census. Nothing on
   * this side read it, so the bound stopped a visitor typing and stopped nothing
   * at all about a post that never rendered the page. `input-bounds.test.mts`
   * asserted the number under the heading "the bounds are the numbers the
   * servers actually enforce", and for this one field that sentence was false:
   * the routes it checks are a typed list of three and this is not on it.
   *
   * What was unbounded is not a log line. It is the `to:` header of a message we
   * pay Resend to send, the `email` column of a `leads` row (`text`, so the
   * database will take whatever arrives), an `accounts` row `resolveAccount`
   * creates from the same string, and the `email` this route echoes back in its
   * own response. Every other field on every other public form in this tree is
   * bounded on both sides; this is the door where the address is actually
   * traded for the product, and it was the one with no bound at all.
   *
   * Before the shape check, not after, for the reason `contact/actions.ts` gives
   * about its own copy: the pattern is two unbounded runs either side of an `@`
   * and will happily accept a megabyte of them. Refused rather than clamped -
   * truncating an address silently mails somebody other than the person who
   * typed it, and 254 is unreachable from the form.
   */
  if (email.length > SCAN_LIMITS.email) {
    return Response.json(
      { error: "bad_email", message: "That email address is longer than an address can be." },
      { status: 400 },
    );
  }
  // Was a third private copy of one pattern. See @/lib/email-address for what
  // the three disagreed about and which way the merge went.
  if (!isPlausibleEmail(email)) {
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
   * Fails open on purpose, and that judgement stands: a count that errors comes
   * back null and reads as zero. Turning a database hiccup into a lost lead is
   * the worse of the two failures here, and this ceiling is for volume rather
   * than for any one message. It is the opposite call to the two spend ceilings
   * in /api/scan/start, deliberately - those guard money we spend, this one
   * guards a lead we would lose.
   *
   * What it must not be is silent. The error was discarded outright, so the
   * period this cap was off looked exactly like a period nobody tried to unlock
   * anything - and this is the cap whose absence means one public token can put
   * our branding in any inbox repeatedly. Read and logged; the decision to
   * continue is unchanged.
   */
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: sentToday, error: sentErr } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("scan_id", scan.id)
    .gte("created_at", since);
  if (sentErr) {
    console.warn(
      `[scan] could not count today's unlock sends for ${scan.id}, so the send cap is not being enforced on this` +
        ` request: ${sentErr.message}`,
    );
  }

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

  /**
   * The unlock is already a fact by the time this runs, so a failure here is
   * not a failed unlock and must not read as one.
   *
   * buildUnlockPayload throws now where two of its reads used to swallow their
   * error and hand back an empty report - so this call, which was bare, would
   * have turned a database blip into an unhandled 500 on the request that has
   * just taken somebody's address. The row is stamped, the gated pass is away,
   * and /scan/<token> assembles the same report on the next load, so the true
   * thing to say is that the report is open and a refresh will fetch it.
   */
  let payload;
  try {
    payload = await buildUnlockPayload(scan.id as string);
  } catch (err) {
    console.error(`[scan] unlocked ${scan.id} but could not assemble the report:`, err);
    return Response.json(
      {
        error: "report_failed",
        message: "Your report is open, but we could not load it just then. Refresh the page.",
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

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
