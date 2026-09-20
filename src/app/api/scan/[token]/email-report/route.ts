import { SCAN_LIMITS } from "@/config/contact";
import { isPlausibleEmail, normalizeEmail } from "@/lib/email-address";
import { sendRequestedReport } from "@/lib/scan/report-mail";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Do not have time to wait? We will email it to you." - Danny, item 5, and his
 * own idea.
 *
 * Offered while a scan is reading. It is not a speed fix: **it converts a
 * bounce into a captured address.** Everybody who gives up at ninety seconds is
 * lost silently today, and the visitor who takes this offer is the one already
 * on their way out.
 *
 * All this route does is put the address on the scan row. The message is sent
 * by `sendRequestedReport`, from whichever of two places notices the pass is
 * finished - normally the pipeline, at the moment it writes the completed
 * status. **That is what makes leaving safe**: the pass is server-side and has
 * never cared about the tab, so the address only needed somewhere to live that
 * outlives the browser.
 *
 * ## POST only, and why that matters here
 *
 * This route puts a message on Resend's bill, so it is one of the doors
 * `spenders.mts` walks for and `paid-get.test.mts` asks about. `robots.txt`
 * closes `/scan/` and not every query shape, so a spending GET is every crawler
 * on the internet spending. There is no GET export.
 *
 * ## What bounds it
 *
 * **One message per scan, ever**, and the bound is not here - it is the
 * compare-and-swap inside `sendRequestedReport`, which stamps
 * `report_email_sent_at` and reads the address back out of what it stamped. So
 * this route can be posted a hundred times and the hundred posts write one
 * column; the number of messages is the number of scans that asked, and scans
 * are bounded by the four ceilings in front of every door that starts one.
 *
 * ## Why a disposable address is accepted here and refused by the unlock
 *
 * The unlock refuses them, and should: there the address is the *price* of the
 * gated report, and a throwaway address buys it with nothing. Here the address
 * is not a price. The free result is free, it is already on the visitor's
 * screen, and they are asking for a copy of what they can see - so refusing
 * would deny somebody the thing they asked for, for a lead-quality reason that
 * does not apply to this door. Deliberate; do not "tidy" the two into
 * agreement, and do not copy that list into this file to do it.
 */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");

  /**
   * The bound the server reads, not the one the input carries.
   *
   * `SCAN_LIMITS.email` is 254, the longest an address may be over SMTP, and it
   * is the same constant the field's `maxLength` uses - which stops a visitor
   * typing and stops nothing at all about a post that never rendered the page.
   * What is unbounded without this is the `to:` header of a message we pay to
   * send and a `text` column that will take whatever arrives.
   */
  if (email.length > SCAN_LIMITS.email) {
    return Response.json(
      { error: "bad_email", message: "That email address is longer than an address can be." },
      { status: 400 },
    );
  }
  /**
   * And the shape, through the one validator.
   *
   * It is also the half of header safety that `headerSafe` does not cover:
   * neither side of the address may hold whitespace, so a newline cannot reach
   * the `to:` header by construction. `headerSafe` guards the subject, inside
   * `sendReportReadyEmail`.
   */
  if (!isPlausibleEmail(email)) {
    return Response.json(
      { error: "bad_email", message: "That email does not look right." },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();
  const { data: scan, error: readErr } = await db
    .from("scans")
    .select("id, status, report_email_sent_at")
    .eq("public_token", token)
    .maybeSingle();

  // A read that failed is not a token that does not exist - the same
  // distinction the status route draws, and for the same reason: a database
  // fault reported as a 404 sends whoever debugs this looking for a bad token.
  if (readErr) {
    console.warn(`[scan] could not read a scan to email its report: ${readErr.message}`);
    return Response.json(
      { error: "read_failed", message: "We could not reach the checker. Please try again." },
      { status: 502 },
    );
  }
  if (!scan) return Response.json({ error: "not_found" }, { status: 404 });

  /**
   * A pass that failed has no report to mail.
   *
   * The screen sends that visitor back to confirm with the offer to run it
   * again, so there is a real path for them - and taking an address to send a
   * measurement that does not exist is a promise this route cannot keep.
   */
  if (scan.status === "failed") {
    return Response.json(
      { error: "run_failed", message: "That check did not finish, so there is no report to send yet." },
      { status: 409 },
    );
  }

  // Already sent. Saying so is better than silently taking the address again:
  // the message is claimed and no second one will go, and the commonest reason
  // somebody re-submits is that they think the first attempt did nothing.
  if (scan.report_email_sent_at) {
    return Response.json({ sent: true, email, message: "That is already on its way to you." });
  }

  const { error: writeErr } = await db
    .from("scans")
    .update({ report_email: email, report_email_at: new Date().toISOString() })
    .eq("id", scan.id)
    // Not over a message that has already gone. The read above is a tick old
    // and the pipeline can complete between the two, so the filter is the thing
    // that actually holds it rather than the branch above.
    .is("report_email_sent_at", null);

  if (writeErr) {
    console.warn(`[scan] could not record a report email address for ${scan.id}: ${writeErr.message}`);
    return Response.json(
      { error: "write_failed", message: "We could not save that address. Please try again." },
      { status: 502 },
    );
  }

  /**
   * The scan has already finished, so nothing is coming to send it.
   *
   * A real case rather than a tidy one: the offer is on screen for the whole of
   * the reading phase, which is the longest part of the run, and a pass can
   * complete while somebody is typing their address. Without this the visitor
   * who took the offer a second too late is the only one it never reaches.
   *
   * Awaited rather than deferred: `sendRequestedReport` claims before it sends,
   * so this cannot double up with the pipeline's own call, and the response is
   * worth being honest in.
   */
  if (scan.status === "complete") {
    await sendRequestedReport(scan.id);
    return Response.json({ sent: true, email, message: "Sent - it is in your inbox." });
  }

  return Response.json({
    queued: true,
    email,
    message: "We will email it to you the moment it is ready. You can close this tab.",
  });
}
