import { isFreePassDead, isGatedPassDead } from "@/lib/scan/stall";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Polled by the browser during step 03. Status and step only, never results.
 *
 * What it deliberately no longer carries is `error` and `gated_error`.
 *
 * Those columns hold whatever the pass threw, truncated to 500 characters, and
 * most of what can land there is written for whoever is fixing it rather than
 * for the person who typed a domain into a marketing site. "could not store the
 * answers: duplicate key value violates unique constraint ...", a Postgres
 * message naming our tables, or a vendor error naming the vendor and the state
 * of our account with them - all of those reached the screen verbatim, because
 * the flow printed `data.error` as the failure message.
 *
 * The detail is not lost and was never only here: it stays in the column for
 * the admin page, which is where it belongs, and in the log. What changes is
 * that the public poll stops handing it out. Nothing a visitor can do about a
 * failed scan depends on knowing which insert failed - the one action is to run
 * it again, and the screen offers that on its own.
 *
 * gated_error goes for the same reason and was read by nobody: the flow tracks
 * the gated pass on gated_status alone.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  // A read that failed is not a token that does not exist. The poll treats any
  // answer without a status as "try the next tick", so this changes nothing the
  // visitor sees - but a database fault was being recorded as a 404, which is
  // the signal somebody debugging this route would read first and the one that
  // would send them looking for a bad token.
  const { data, error: readErr } = await supabaseAdmin()
    .from("scans")
    .select("status, step, gated_status, started_at, queued_at, unlocked_at")
    .eq("public_token", token)
    .maybeSingle();

  if (readErr) {
    console.warn("[scan] could not read the scan status: " + readErr.message);
    return Response.json(
      { error: "read_failed" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });

  /**
   * A pass the platform killed is reported as failed, not as still running.
   *
   * This route answered the column verbatim, and the column is the one thing a
   * killed pass leaves wrong: `running` for ever, with a step it will never
   * leave. So the poll kept telling the browser the scan was in progress, and
   * the only thing that ever ended it was ScanFlow's own six-minute timer.
   *
   * `failed` is what this row honestly is - past the 300s ceiling nothing
   * server-side can move it - and it is a status the flow already handles: it
   * lands the visitor back on confirm with "you can run it again", which the
   * confirm route now accepts.
   *
   * Read-only on purpose. A poll running every 2.5 seconds is the wrong place
   * to put a write, and it does not need one: the row itself is corrected by
   * the stall sweep in /api/cron/reap-stalled-scans, or by the confirm route
   * the moment the visitor takes the offer. This says what is true now.
   */
  const status = isFreePassDead(data) ? "failed" : data.status;
  const gatedStatus = isGatedPassDead(data) ? "failed" : data.gated_status;

  return Response.json(
    {
      status,
      // A dead pass has no meaningful step, and sending the one it died on
      // would draw the progress bar part-filled under a failure message.
      step: status === "failed" ? null : data.step,
      // Polled again after unlock, while the email-gated engines run.
      gated_status: gatedStatus,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
