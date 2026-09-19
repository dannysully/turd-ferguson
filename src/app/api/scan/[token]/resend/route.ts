import { SETTINGS_FALLBACK, getSettings } from "@/lib/scan/settings";
import { sendVerificationEmail } from "@/lib/scan/verify-email";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A second send inside this window is treated as a double click, not a retry. */
const COOLDOWN_MS = 60_000;

/** The window the send ceiling is counted over, matching the unlock route. */
const WINDOW_HOURS = 24;

/**
 * Sends the verification email again.
 *
 * With verification in front of the report, a message that does not arrive is
 * the whole funnel lost, so the pending screen needs a way out that does not
 * involve starting the scan again.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const db = supabaseAdmin();

  // A read that failed is not a token that does not exist.
  const { data: scan, error: scanErr } = await db
    .from("scans")
    .select("id, domain, brand_name")
    .eq("public_token", token)
    .maybeSingle();

  if (scanErr) {
    console.warn("[scan] could not read the scan to resend its verification: " + scanErr.message);
    return Response.json(
      { error: "read_failed", message: "We could not reach the checker. Try again shortly." },
      { status: 502 },
    );
  }
  if (!scan) return Response.json({ error: "not_found" }, { status: 404 });

  // The most recent address to ask for this scan, and only if it is still
  // waiting: a verified lead has nothing to resend.
  const { data: lead, error: leadErr } = await db
    .from("leads")
    .select("id, email, verify_token, verify_sent_at, verified_at")
    .eq("scan_id", scan.id)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  /**
   * A read that failed is not an absence of anything to send.
   *
   * `nothing_pending` is a statement about this scan - nobody is waiting on a
   * verification - and it is what the button on the pending panel is answered
   * with. A failed read said the same thing to somebody looking at that panel
   * with their own address printed on it, which is a direct contradiction of
   * what is on their screen.
   */
  if (leadErr) {
    console.warn("[scan] could not read the pending lead for " + scan.id + ": " + leadErr.message);
    return Response.json(
      { error: "read_failed", message: "We could not reach the checker. Try again shortly." },
      { status: 502 },
    );
  }
  if (!lead) return Response.json({ error: "nothing_pending" }, { status: 409 });

  const sentAt = lead.verify_sent_at ? Date.parse(lead.verify_sent_at as string) : 0;
  if (sentAt && Date.now() - sentAt < COOLDOWN_MS) {
    return Response.json(
      { ok: true, throttled: true, message: "That one is already on its way." },
      { status: 200 },
    );
  }

  /**
   * The cooldown above is a ceiling on rate. This is the ceiling on volume,
   * and without it the route had none.
   *
   * The unlock route bounds how much branded mail one scan link may put in an
   * inbox in a day, and it counts rows in `leads`: one unlock, one lead, one
   * message. This route sends the same message again and inserts nothing, so
   * it never incremented that count and was never checked against it. Sixty
   * seconds apart, forever, is about fourteen hundred messages a day to one
   * address, past a cap that reads five - and the public token is the only
   * credential, which is in every shared scan link.
   *
   * Counted per lead rather than per scan, because the unlock cap already
   * holds the per-scan line: five leads a day, each of which may be re-mailed
   * this many times. Thirty messages in a day is a ceiling; fourteen hundred
   * is not.
   *
   * Fails closed, unlike the unlock cap, and the difference is deliberate: a
   * refusal there costs a lead that has just typed an address, where a refusal
   * here costs a second copy of a message already sent once. The cheap failure
   * is the one to take.
   */
  const { data: sends, error: capErr } = await db.rpc("note_verify_send", {
    p_lead: lead.id as string,
    p_window_hours: WINDOW_HOURS,
  });

  if (capErr || typeof sends !== "number" || sends === 0) {
    console.warn(
      `[scan] could not count verification sends for ${lead.id}: ${capErr?.message ?? "no count"}`,
    );
    return Response.json(
      { error: "email_failed", message: "Still no luck. Try again in a minute." },
      { status: 502 },
    );
  }

  let cap = SETTINGS_FALLBACK.unlock_emails_per_day;
  try {
    cap = (await getSettings()).unlock_emails_per_day;
  } catch {
    // The documented default rather than no ceiling at all. This is the one
    // place a settings blip must not widen.
  }

  if (sends > cap) {
    // Logged, because the ordinary way to reach this is not a visitor: a
    // message that has not arrived after five sends is not going to.
    console.warn(`[scan] verification resend cap reached for ${lead.id}: ${sends} in ${WINDOW_HOURS}h`);
    return Response.json(
      {
        error: "too_many_sends",
        message: "We have sent that several times today. Check your spam folder, or try again tomorrow.",
      },
      { status: 429 },
    );
  }

  const sent = await sendVerificationEmail({
    email: lead.email as string,
    brand: (scan.brand_name as string | null) ?? (scan.domain as string),
    verifyToken: lead.verify_token as string,
    leadId: lead.id as string,
  });

  if (!sent) {
    return Response.json(
      { error: "email_failed", message: "Still no luck. Try again in a minute." },
      { status: 502 },
    );
  }

  // The address is deliberately not returned.
  //
  // The public token is the credential for this route, and a token reaches
  // people who never typed the address: it is in a shared link, and the domain
  // cache hands a completed scan's token to the next visitor who scans the same
  // site. A pending lead belongs to whoever submitted it, so echoing it here
  // discloses one stranger's email address to another through the ordinary
  // funnel. The screen never used this field - it renders the address the
  // visitor typed, and reads only "message" off this response.
  return Response.json({ ok: true });
}
